// app/_lib/simulation/browser.ts

import { chromium, firefox, webkit, Browser } from 'playwright';

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
    page: any,
    logs: string[]
): Promise<boolean> {
    try {
        // Robusteres Regex
        const cookieRegex = /^(Alle (akzeptieren|annehmen|zulassen)|(Accept|Confirm|Agree) all|Akzeptieren|Zustimmen|Einverstanden|Verstanden|OK|Got it|Ich stimme zu)$/i;

        // ⭐️ KORREKTUR: Suche nach Text statt nur 'button' role.
        // Das findet auch <a role="button"> oder <div>-basierte Buttons.
        const cookieButton = page.locator(`*:text-matches("${cookieRegex}")`).first();

        const isVisible = await cookieButton.isVisible({ timeout: 1500 }); // Etwas mehr Zeit geben
        if (isVisible) {
            logs.push('🍪 Cookie-Banner gefunden! Klicke...');
            await cookieButton.click({ timeout: 3000, force: true }); // force: true klickt auch wenn was davor liegt
            await page.waitForTimeout(1000); // Warten bis Banner weg-animiert ist
            logs.push('✓ Cookie dismissed');
            return true;
        }
    } catch {
        // Kein Cookie-Banner gefunden, alles gut
    }
    return false;
}

export function updateSessionState(page: any, sessionState: any) {
    const currentUrl = page.url();
    sessionState.currentUrl = currentUrl;

    if (currentUrl.includes('/suche/') ||
        currentUrl.includes('/search/') ||
        currentUrl.includes('?q=') ||
        currentUrl.includes('/results')) {
        sessionState.onSearchResults = true;
        sessionState.searchSubmitted = true;
    }
}
