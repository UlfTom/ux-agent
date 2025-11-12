// app/_lib/simulation/react-agent/execute.ts
// KORRIGIERT: Scroll + Click + Type actions

import { Page } from 'playwright';
import { InteractableElement } from '../types';
import type { VerificationResult } from './verify';

export async function executeAction(
    verification: VerificationResult,
    page: Page,
    elements: InteractableElement[],
    task: string
): Promise<string> {
    const { action, elementId, textToType, scrollDirection } = verification;
    console.log(`[EXECUTE] Action: ${action}`, { elementId, textToType, scrollDirection });

    try {
        switch (action) {
            case 'click':
                return await executeClick(page, elements, elementId!);
            case 'type':
                return await executeType(page, elements, elementId!, textToType || task);
            case 'scroll':
                return await executeScroll(page, scrollDirection || 'down');
            case 'wait':
                await page.waitForTimeout(2000);
                return '⏸️ Warte 2 Sekunden...';
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[EXECUTE] Error:', errorMsg);
        throw new Error(`Execution failed: ${errorMsg}`);
    }
}

async function executeClick(page: Page, elements: InteractableElement[], elementId: number): Promise<string> {
    const element = elements.find(e => e.id === elementId);
    if (!element) {
        throw new Error(`Element with ID ${elementId} not found`);
    }

    console.log(`[EXECUTE] Clicking element ${elementId}:`, {
        role: element.role,
        text: element.text.substring(0, 50),
        box: element.box
    });

    // Calculate center point
    const x = element.box.x + element.box.width / 2;
    const y = element.box.y + element.box.height / 2;

    // Move mouse and click
    await page.mouse.move(x, y);
    await page.waitForTimeout(300);
    await page.mouse.click(x, y);
    await page.waitForTimeout(1000); // Wait for navigation/interaction

    return `🖱️ Clicked on "${element.text.substring(0, 40)}"`;
}

async function executeType(
    page: Page,
    elements: InteractableElement[],
    elementId: number,
    text: string
): Promise<string> {
    const element = elements.find(e => e.id === elementId);
    if (!element) {
        throw new Error(`Element with ID ${elementId} not found`);
    }

    console.log(`[EXECUTE] Typing into element ${elementId}:`, {
        role: element.role,
        text: element.text,
        typeText: text
    });

    // Calculate center point
    const x = element.box.x + element.box.width / 2;
    const y = element.box.y + element.box.height / 2;

    // Click to focus
    await page.mouse.move(x, y);
    await page.waitForTimeout(200);
    await page.mouse.click(x, y);
    await page.waitForTimeout(300);

    // Clear existing text (triple-click to select all, then type)
    await page.mouse.click(x, y, { clickCount: 3 });
    await page.waitForTimeout(200);

    // Type new text
    await page.keyboard.type(text, { delay: 50 });
    await page.waitForTimeout(500);

    // Press Enter to submit (for search fields)
    if (element.role === 'textbox' && (element.placeholder?.toLowerCase().includes('such') || text.toLowerCase().includes('such'))) {
        console.log('[EXECUTE] Pressing Enter to submit search');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000); // Wait for search results
    }

    return `⌨️ Typed "${text}" into search field`;
}

async function executeScroll(page: Page, direction: 'up' | 'down'): Promise<string> {
    const scrollAmount = direction === 'down' ? 800 : -800;

    console.log(`[EXECUTE] Scrolling ${direction} by ${Math.abs(scrollAmount)}px`);

    await page.evaluate((amount) => {
        window.scrollBy({
            top: amount,
            behavior: 'smooth'
        });
    }, scrollAmount);

    await page.waitForTimeout(1500); // Wait for scroll + content load

    return `📜 Scrolled ${direction} by ${Math.abs(scrollAmount)}px`;
}