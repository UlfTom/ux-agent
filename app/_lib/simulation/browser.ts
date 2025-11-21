// app/_lib/simulation/browser.ts
import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import type { SessionState, PersonaType } from './types';

let globalBrowser: Browser | null = null;


export async function launchBrowser(browserType: string): Promise<Browser> {
    if (globalBrowser && globalBrowser.isConnected()) {
        return globalBrowser; // Wiederverwenden!
    }

    const opts = { headless: true }; // Auf false für lokales Debugging
    if (browserType === 'firefox') globalBrowser = await firefox.launch(opts);
    else if (browserType === 'safari') globalBrowser = await webkit.launch(opts);
    else globalBrowser = await chromium.launch(opts);

    return globalBrowser;
}

// Cookie-Logik mit Persona-Kommentar (aus vorheriger Antwort)
function getCookieRant(persona: PersonaType): string {
    switch (persona) {
        case 'pragmatic': return "🍪 Banner weggeklickt. Habe keine Zeit für sowas.";
        case 'explorative': return "🍪 Oha, Cookies. Ich stimme mal zu.";
        case 'unsure': return "🍪 Ich klicke einfach 'Akzeptieren', damit es weggeht.";
        default: return "🍪 Cookie-Banner akzeptiert.";
    }
}

export async function checkAndDismissCookie(
    page: Page,
    logs: string[],
    personaType: PersonaType = 'pragmatic' // Default
): Promise<boolean> {

    // 1. Liste der "Endgegner" (Bekannte IDs für Otto, Zalando, Amazon etc.)
    const explicitSelectors = [
        // OTTO & Sourcepoint
        '#sp-cc-accept',
        'button[title="Zustimmen"]',
        'button[aria-label="Zustimmen"]',
        '#usercentrics-root', // Oft Shadow DOM Host

        // ZALANDO
        '#uc-btn-accept-banner',
        'button[data-testid="uc-accept-all-button"]',

        // AMAZON
        '#sp-cc-accept',
        'input[name="accept"]',

        // GENERISCH (Usercentrics, OneTrust, Google)
        '#onetrust-accept-btn-handler',
        '.cmp-box .accept',
        'button:has-text("Alle akzeptieren")',
        'button:has-text("Alles akzeptieren")',
        'button:has-text("Zustimmen")',
        'button:has-text("Accept all")',
        'button:has-text("Einverstanden")'
    ];

    for (const sel of explicitSelectors) {
        try {
            const el = page.locator(sel).first();
            if (await el.isVisible()) {
                await el.click({ force: true });
                await page.waitForTimeout(500);
                logs.push(getCookieRant(personaType));
                return true;
            }
            // Shadow DOM Check (kurz und schmerzlos)
            const shadowResult = await page.evaluate((s) => {
                const roots = document.querySelectorAll('*');
                for (const root of roots) {
                    if (root.shadowRoot) {
                        const btn = root.shadowRoot.querySelector(s) as HTMLElement;
                        if (btn) { btn.click(); return true; }
                    }
                }
                return false;
            }, sel);
            if (shadowResult) {
                logs.push(getCookieRant(personaType));
                await page.waitForTimeout(500);
                return true;
            }
        } catch (e) {}
    }
    return false;
}

export function updateSessionState(page: Page, sessionState: SessionState) {
    const url = page.url();
    sessionState.currentUrl = url;

    // Verbesserte Erkennung für verschiedene Shops
    const isPDP = url.includes('/p/') || url.includes('/dp/') || url.includes('/produkt/') || url.match(/\/art(ikel)?-?nr/i);
    const isSearch = url.includes('suche') || url.includes('search') || url.includes('?q=') || url.includes('/s/');

    if (isPDP) {
        sessionState.onProductPage = true;
        sessionState.onSearchResults = false;
    } else if (isSearch) {
        sessionState.onSearchResults = true;
        sessionState.onProductPage = false;
    } else {
        sessionState.onSearchResults = false;
        sessionState.onProductPage = false;
    }
}