// app/_lib/simulation/browser.ts
// ⭐️ KORRIGIERTE VERSION (GENERISCHER COOKIE-FIX & KONTEXT) ⭐️

import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import type { SessionState } from './types'; // Typen importieren

export async function launchBrowser(
    browserType: 'chrome' | 'firefox' | 'safari'
): Promise<Browser> {
    switch (browserType) {
        case 'firefox':
            return await firefox.launch({ headless: true });
        case 'safari':
            return await webkit.launch({ headless: true });
        default:
            return await chromium.launch({ headless: true });
    }
}

export async function checkAndDismissCookie(
    page: Page,
    logs: string[]
): Promise<boolean> {

    // ⭐️ GENERISCHER COOKIE-CHECK (Version 3)
    // Priorisiert "Alle akzeptieren" über "OK"

    const acceptRegex = /^(Alle (akzeptieren|annehmen|zulassen)|(Accept|Confirm|Agree) all)$/i;
    const okRegex = /^(Akzeptieren|Zustimmen|Einverstanden|Verstanden|OK|Got it|Ich stimme zu)$/i;

    for (let i = 0; i < 2; i++) { // 2 Versuche
        try {
            // VERSUCH 1: Finde "Alle akzeptieren" (Beste Option)
            const acceptButton = page.getByRole('button', { name: acceptRegex }).first();
            if (await acceptButton.isVisible({ timeout: 1500 })) {
                logs.push(`🍪 Generischer Cookie-Banner gefunden! Klicke "${await acceptButton.textContent()}"...`);
                await acceptButton.click({ timeout: 3000, force: true });
                await page.waitForTimeout(1000);
                logs.push('✓ Cookie dismissed (Alle akzeptieren)');
                return true;
            }

            // VERSUCH 2: Finde "OK" (Fallback, z.B. für Otto)
            const okButton = page.getByRole('button', { name: okRegex }).first();
            if (await okButton.isVisible({ timeout: 1000 })) {
                logs.push(`🍪 Cookie-Banner (Fallback) gefunden! Klicke "${await okButton.textContent()}"...`);
                await okButton.click({ timeout: 3000, force: true });
                await page.waitForTimeout(1000);
                logs.push('✓ Cookie dismissed (OK/Akzeptieren)');
                return true;
            }

        } catch (e: any) {
            if (!e.message.includes('Timeout')) {
                logs.push(`⚠️ Cookie-Check-Fehler: ${e.message.split('\n')[0]}`);
            }
        }
        if (i === 0) await page.waitForTimeout(1000); // Kurze Pause vor 2. Versuch
    }

    logs.push('ℹ️ Kein Cookie-Banner gefunden oder geklickt.');
    return false;
}

// ⭐️ AKTUALISIERT mit besserer Seitenerkennung
export function updateSessionState(page: Page, sessionState: SessionState) {
    const currentUrl = page.url();
    sessionState.currentUrl = currentUrl;

    // Zuerst auf PDP prüfen (spezifischer)
    if (currentUrl.includes('/p/') || // Otto
        currentUrl.includes('/produkt/') || // Universal
        currentUrl.includes('/item/') || // Universal
        currentUrl.includes('/dp/') || // Amazon
        currentUrl.includes('/rooms/')) { // Airbnb

        sessionState.onProductPage = true;
        sessionState.onSearchResults = false;
        console.log(`[STATE] Kontext: Auf Produktdetailseite`);
    }
    // Dann auf Suchergebnisse
    else if (currentUrl.includes('/suche/') ||
        currentUrl.includes('/search/') ||
        currentUrl.includes('?q=') ||
        currentUrl.includes('/s/')) { // Airbnb & Amazon

        sessionState.onSearchResults = true;
        sessionState.onProductPage = false;
        console.log(`[STATE] Kontext: Auf Ergebnisseite`);
    }
    // Sonst ist es eine Startseite/andere Seite
    else {
        sessionState.onSearchResults = false;
        sessionState.onProductPage = false;
        console.log(`[STATE] Kontext: Auf Startseite/Sonstiges`);
    }
}