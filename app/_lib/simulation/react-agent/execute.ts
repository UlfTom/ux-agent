// app/_lib/simulation/react-agent/execute.ts

import { Page } from 'playwright';
import { InteractableElement, SessionState } from '../types';
import { VerificationResult } from './verify';

export async function executeAction(
    page: Page,
    verification: VerificationResult,
    elements: InteractableElement[],
    sessionState: SessionState,
    logs: string[]
): Promise<string> {

    let result = '';
    const startUrl = page.url();

    try {
        if (verification.action === 'click' && verification.elementId !== undefined) {
            const element = elements.find(el => el.id === verification.elementId);

            if (element) {
                const locator = page.locator('input, textarea, button, a').nth(element.realIndex);
                logs.push(`   🖱️ Klicke auf "${element.text}" [ID ${element.id}]`);

                await locator.click({ timeout: 8000 });
                await page.waitForLoadState('domcontentloaded', { timeout: 8000 });

                try {
                    await page.waitForLoadState('networkidle', { timeout: 3000 });
                } catch { }

                await page.waitForTimeout(800);

                const endUrl = page.url();
                result = startUrl !== endUrl ? `Navigation zu ${endUrl}` : 'Geklickt';
                logs.push(`   ✓ ${result}`);
            }

        } else if (verification.action === 'type' && verification.elementId !== undefined && verification.textToType) {
            const element = elements.find(el => el.id === verification.elementId);

            if (element && element.role === 'textbox') {
                const locator = page.locator('input, textarea').nth(element.realIndex);
                logs.push(`   ⌨️ Tippe "${verification.textToType}" [ID ${element.id}]`);

                await locator.fill(verification.textToType, { timeout: 8000 });

                try {
                    await locator.press('Enter', { timeout: 2000 });
                    await page.waitForLoadState('domcontentloaded', { timeout: 8000 });

                    logs.push(`   ⏳ Warte auf Inhalte...`);
                    try {
                        await page.waitForLoadState('networkidle', { timeout: 5000 });
                    } catch { }

                    await page.waitForTimeout(1500);

                    const endUrl = page.url();
                    result = `Getippt + Enter → ${endUrl}`;

                    sessionState.searchText = verification.textToType;
                    sessionState.searchSubmitted = true;

                    if (endUrl.includes('/suche/') || endUrl.includes('/search/') || endUrl.includes('?q=')) {
                        sessionState.onSearchResults = true;
                        logs.push(`   ✅ Auf Suchergebnissen!`);
                    }

                } catch {
                    result = `Getippt "${verification.textToType}"`;
                }

                logs.push(`   ✓ ${result}`);
            }

        } else if (verification.action === 'scroll') {
            const pixels = 600;
            logs.push(`   📜 Scrolle ${pixels}px`);
            await page.mouse.wheel(0, pixels);
            await page.waitForTimeout(500);
            result = 'Gescrollt';
            logs.push(`   ✓ ${result}`);

        } else if (verification.action === 'wait') {
            logs.push(`   ⏸️ Warte...`);
            await page.waitForTimeout(1000);
            result = 'Gewartet';
            logs.push(`   ✓ ${result}`);
        }

        // Update session state
        const currentUrl = page.url();
        sessionState.currentUrl = currentUrl;

        if (currentUrl.includes('/suche/') ||
            currentUrl.includes('/search/') ||
            currentUrl.includes('?q=') ||
            currentUrl.includes('/results')) {
            sessionState.onSearchResults = true;
            sessionState.searchSubmitted = true;
        }

    } catch (error) {
        result = `Fehler: ${error instanceof Error ? error.message : 'Unknown'}`;
        logs.push(`   ❌ ${result}`);
        console.error(`[EXECUTE] Error:`, error);
    }

    return result;
}
