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
        const cookieRegex = /^(OK|Alle akzeptieren|Akzeptieren|Accept|Verstanden|Einwilligung|Zustimmen)$/i;
        const cookieButton = page.getByRole('button', { name: cookieRegex }).first();

        const isVisible = await cookieButton.isVisible({ timeout: 1000 });
        if (isVisible) {
            logs.push('🍪 Cookie-Banner! Klicke OK...');
            await cookieButton.click({ timeout: 3000 });
            await page.waitForTimeout(500);
            logs.push('✓ Cookie dismissed');
            return true;
        }
    } catch {
        // No cookie
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
