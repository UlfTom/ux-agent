// app/_lib/simulation/elements.ts

import { Page } from 'playwright';
import { InteractableElement } from './types';

const SEARCH_SELECTORS = [
    'input[type="search"]',
    'input[type="text"][placeholder*="such" i]',
    'input[type="text"][placeholder*="search" i]',
    '[role="search"] input',
    '[role="searchbox"]',
];

const BUTTON_SELECTORS = [
    'button:not([aria-hidden="true"])',
    '[role="button"]:not([aria-hidden="true"])',
];

const LINK_SELECTORS = [
    'a[href]:not([aria-hidden="true"])',
];

const INPUT_SELECTORS = [
    'textarea',
    'input[type="email"]',
    'input[type="password"]',
];

export const ELEMENT_SELECTOR = [
    ...SEARCH_SELECTORS,
    ...BUTTON_SELECTORS,
    ...LINK_SELECTORS,
    ...INPUT_SELECTORS,
].join(', ');

function calculatePriorityScore(
    role: 'link' | 'button' | 'textbox',
    text: string,
    placeholder: string | null,
    ariaRole: string | null
): number {
    let score = 0;

    if (role === 'textbox') {
        score = 1000;

        const isSearchField =
            placeholder?.toLowerCase().includes('such') ||
            placeholder?.toLowerCase().includes('search') ||
            text.toLowerCase().includes('such') ||
            text.toLowerCase().includes('search') ||
            ariaRole === 'searchbox';

        if (isSearchField) {
            score = 2000; // TOP PRIORITY
        }
    } else if (role === 'button') {
        score = 500;
    } else if (role === 'link') {
        score = 100;
    }

    return score;
}

export async function getInteractableElements(
    page: Page,
    maxElements: number = 120
): Promise<InteractableElement[]> {
    const elements: InteractableElement[] = [];
    const locators = page.locator(ELEMENT_SELECTOR);
    const count = await locators.count();
    let cleanIdCounter = 0;

    const maxCount = Math.min(count, maxElements);

    for (let i = 0; i < maxCount; i++) {
        const locator = locators.nth(i);
        let box: { x: number; y: number; width: number; height: number } | null = null;

        try {
            box = await locator.boundingBox({ timeout: 50 });
        } catch (e) {
            continue;
        }

        if (!box || box.width === 0 || box.height === 0) continue;

        try {
            const isVisible = await locator.isVisible({ timeout: 50 });
            if (!isVisible) continue;
        } catch (e) {
            continue;
        }

        const tagName = await locator.evaluate(el => el.tagName.toUpperCase());
        let role: 'link' | 'button' | 'textbox' = 'button';

        if (tagName === 'A') role = 'link';
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') role = 'textbox';

        const ariaRole = await locator.getAttribute('role');
        if (ariaRole === 'link' || ariaRole === 'listitem' || ariaRole === 'option') role = 'link';
        if (ariaRole === 'button') role = 'button';
        if (ariaRole === 'textbox' || ariaRole === 'searchbox') role = 'textbox';

        let text = (await locator.innerText() || await locator.getAttribute('aria-label') || '').trim();
        let placeholder: string | null = null;

        if (role === 'textbox') {
            placeholder = (await locator.getAttribute('placeholder')) || null;
            if (!text && placeholder) text = placeholder;
        }

        if (!text || text.length === 0) continue;

        const priorityScore = calculatePriorityScore(role, text, placeholder, ariaRole);

        elements.push({
            id: cleanIdCounter,
            realIndex: i,
            role,
            box,
            text: text.substring(0, 80),
            placeholder,
            isHoverTarget: false,
            priorityScore
        });

        cleanIdCounter++;
    }

    // Sort by priority
    elements.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

    // Reassign IDs after sorting
    elements.forEach((el, idx) => {
        el.id = idx;
    });

    return elements;
}
