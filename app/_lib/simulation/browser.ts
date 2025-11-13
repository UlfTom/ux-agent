// app/_lib/simulation/browser.ts
// ⭐️ ROBUSTERE VERSION ⭐️

import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import type { SessionState } from './types'; // Importiere SessionState

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
    try {
        // ⭐️ KORREKTUR: Gezielte, dumme Suche nach Cookie-Buttons.
        // Unabhängig von elements.ts!

        // Versuch 1: Der "OK" Button von OTTO
        const ottoButton = page.getByRole('button', { name: 'OK', exact: true });
        if (await ottoButton.isVisible({ timeout: 1500 })) {
            logs.push('🍪 Cookie-Banner (OTTO) gefunden! Klicke "OK"...');
            await ottoButton.click({ timeout: 3000, force: true });
            await page.waitForTimeout(1000);
            logs.push('✓ Cookie dismissed (OTTO)');
            return true;
        }

        // Versuch 2: Generisches Regex (wie für Airbnb)
        const genericRegex = /^(Alle (akzeptieren|annehmen|zulassen)|(Accept|Confirm|Agree) all|Akzeptieren|Zustimmen|Einverstanden|Verstanden|OK|Got it|Ich stimme zu)$/i;
        const genericButton = page.getByRole('button', { name: genericRegex }).first();
        if (await genericButton.isVisible({ timeout: 1000 })) {
            logs.push('🍪 Generischer Cookie-Banner gefunden! Klicke...');
            await genericButton.click({ timeout: 3000, force: true });
            await page.waitForTimeout(1000);
            logs.push('✓ Cookie dismissed (Generisch)');
            return true;
        }

    } catch (e: any) {
        logs.push(`⚠️ Cookie-Check-Fehler: ${e.message.split('\n')[0]}`);
    }
    logs.push('ℹ️ Kein Cookie-Banner gefunden oder geklickt.');
    return false;
}

export function updateSessionState(page: Page, sessionState: SessionState) {
    const currentUrl = page.url();
    sessionState.currentUrl = currentUrl;

    // Generische Produkt/Detailseiten-Erkennung
    if (currentUrl.includes('/p/') || currentUrl.includes('/produkt/') || currentUrl.includes('/item/') || currentUrl.includes('/rooms/')) {
        sessionState.onProductPage = true;
        sessionState.onSearchResults = false;
    }
    // Generische Suchergebnis-Erkennung
    else if (currentUrl.includes('/suche/') ||
        currentUrl.includes('/search/') ||
        currentUrl.includes('?q=') ||
        currentUrl.includes('/s/')) {
        sessionState.onSearchResults = true;
        sessionState.onProductPage = false;
    } else {
        sessionState.onSearchResults = false;
        sessionState.onProductPage = false;
    }
}