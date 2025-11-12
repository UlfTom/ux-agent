// app/_lib/simulation/elements.ts
// FIX: Better product link detection + prioritization

import { Page } from 'playwright';
import { InteractableElement } from './types';

// Primary selectors (most specific, prioritized)
const PRIMARY_SELECTORS = [
    // Search fields (highest priority)
    'input[type="search"]',
    'input[type="text"][placeholder*="such" i]',
    'input[type="text"][placeholder*="search" i]',
    '[role="search"] input',
    '[role="searchbox"]',
    // All text inputs
    'input[type="text"]',
    'textarea',
    // Buttons
    'button:not([aria-hidden="true"]):not([disabled])',
    '[role="button"]:not([aria-hidden="true"])',
    // Links
    'a[href]:not([aria-hidden="true"])',
    '[role="link"]',
    // Other inputs
    'input[type="email"]',
    'input[type="password"]',
    'select',
];

// Fallback: Broader selectors
const FALLBACK_SELECTORS = [
    'input:not([type="hidden"])',
    'button',
    'a',
    'textarea',
    'select',
    '[onclick]',
    '[role="button"]',
    '[role="link"]',
    '[tabindex="0"]',
    '[tabindex="1"]',
];

function calculatePriorityScore(
    role: 'link' | 'button' | 'textbox',
    text: string,
    placeholder: string | null,
    ariaRole: string | null,
    tagName: string,
    inputType: string | null,
    href: string | null // ← NEW: Pass href for product detection
): number {
    let score = 0;

    // Textboxes get highest base priority
    if (role === 'textbox') {
        score = 1000;

        // Extra boost for search-related fields
        const isSearchField =
            inputType === 'search' ||
            placeholder?.toLowerCase().includes('such') ||
            placeholder?.toLowerCase().includes('search') ||
            text.toLowerCase().includes('such') ||
            text.toLowerCase().includes('search') ||
            ariaRole === 'searchbox';

        if (isSearchField) {
            score = 2000; // TOP PRIORITY!
        }
    } else if (role === 'button') {
        score = 500;

        // Boost for primary action buttons
        const isPrimaryCTA =
            text.toLowerCase().includes('suchen') ||
            text.toLowerCase().includes('search') ||
            text.toLowerCase().includes('kaufen') ||
            text.toLowerCase().includes('buy');

        if (isPrimaryCTA) {
            score = 700;
        }
    } else if (role === 'link') {
        score = 100; // Base score for links

        // CRITICAL FIX: Detect PRODUCT links by href and text
        const isProductLink = (
            href &&
            (
                href.includes('/p/') ||
                href.includes('/product/') ||
                href.includes('/artikel/') ||
                href.includes('/item/')
            )
        );

        const hasProductText = (
            text.length > 20 && // Product names are usually longer
            !text.toLowerCase().includes('home') &&
            !text.toLowerCase().includes('konto') &&
            !text.toLowerCase().includes('service') &&
            !text.toLowerCase().includes('merkzettel') &&
            !text.toLowerCase().includes('warenkorb') &&
            !text.toLowerCase().includes('menu') &&
            !text.toLowerCase().includes('navigation')
        );

        if (isProductLink || hasProductText) {
            score = 900; // HIGH PRIORITY for product links!
            console.log(`[ELEMENTS] 🎯 Product link detected: "${text.substring(0, 50)}" (href: ${href})`);
        }

        // PENALIZE header/navigation links
        const isNavLink = (
            text.toLowerCase().includes('mein konto') ||
            text.toLowerCase().includes('service') ||
            text.toLowerCase().includes('merkzettel') ||
            text.toLowerCase().includes('warenkorb') ||
            text.toLowerCase().includes('home') ||
            text.toLowerCase().includes('weihnachten') ||
            text.toLowerCase().includes('damen-mode') ||
            text.toLowerCase().includes('herren-mode') ||
            text.toLowerCase().includes('baby') ||
            text.toLowerCase().includes('sport') ||
            text.toLowerCase().includes('beauty') ||
            text.toLowerCase().includes('multimedia') ||
            text.toLowerCase().includes('haushalt') ||
            text.toLowerCase().includes('küche') ||
            text.toLowerCase().includes('marken') ||
            text.toLowerCase().includes('sale')
        );

        if (isNavLink) {
            score = 50; // VERY LOW priority for nav links!
            console.log(`[ELEMENTS] ⚠️ Nav link detected (low priority): "${text.substring(0, 30)}"`);
        }
    }

    return score;
}

export async function getInteractableElements(
    page: Page,
    maxElements: number = 120
): Promise<InteractableElement[]> {
    console.log(`[ELEMENTS] Starting element detection...`);

    // TRY PRIMARY SELECTORS FIRST
    let selector = PRIMARY_SELECTORS.join(', ');
    let locators = page.locator(selector);
    let count = await locators.count();

    console.log(`[ELEMENTS] Primary selectors found: ${count} elements`);

    // FALLBACK if nothing found
    if (count === 0) {
        console.warn(`[ELEMENTS] ⚠️ No elements with primary selectors, trying fallback...`);
        selector = FALLBACK_SELECTORS.join(', ');
        locators = page.locator(selector);
        count = await locators.count();
        console.log(`[ELEMENTS] Fallback selectors found: ${count} elements`);
    }

    // LAST RESORT: Accept visible elements with certain tags
    if (count === 0) {
        console.error(`[ELEMENTS] ⚠️⚠️ Still no elements, using catch-all...`);
        selector = 'button, a, input, textarea, select';
        locators = page.locator(selector);
        count = await locators.count();
        console.log(`[ELEMENTS] Catch-all found: ${count} elements`);
    }

    const elements: InteractableElement[] = [];
    let cleanIdCounter = 0;
    let skipped = {
        notVisible: 0,
        noBox: 0,
        tooSmall: 0,
        noText: 0,
        notInteractive: 0
    };

    const maxCount = Math.min(count, maxElements);

    for (let i = 0; i < maxCount; i++) {
        const locator = locators.nth(i);

        // 1. Check bounding box
        let box: { x: number; y: number; width: number; height: number } | null = null;
        try {
            box = await locator.boundingBox({ timeout: 300 });
        } catch (e) {
            skipped.noBox++;
            continue;
        }

        if (!box || box.width === 0 || box.height === 0) {
            skipped.noBox++;
            continue;
        }

        if (box.width < 10 || box.height < 10) {
            skipped.tooSmall++;
            continue;
        }

        // 2. RELAXED visibility check
        try {
            const isExplicitlyHidden = await locator.evaluate(el => {
                const style = window.getComputedStyle(el);
                return (
                    style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    style.opacity === '0' ||
                    (el as HTMLElement).hidden
                );
            }, { timeout: 200 });

            if (isExplicitlyHidden) {
                skipped.notVisible++;
                continue;
            }
        } catch (e) {
            console.warn(`[ELEMENTS] Could not check visibility for element ${i}, assuming visible`);
        }

        // 3. Get element properties
        const tagName = await locator.evaluate(el => el.tagName.toUpperCase());
        const inputType = await locator.getAttribute('type');
        const href = await locator.getAttribute('href'); // ← NEW: Get href

        // 4. Determine role
        let role: 'link' | 'button' | 'textbox' = 'button';
        if (tagName === 'A') role = 'link';
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') role = 'textbox';
        if (tagName === 'SELECT') role = 'button';

        const ariaRole = await locator.getAttribute('role');
        if (ariaRole === 'link' || ariaRole === 'listitem' || ariaRole === 'option') role = 'link';
        if (ariaRole === 'button') role = 'button';
        if (ariaRole === 'textbox' || ariaRole === 'searchbox') role = 'textbox';

        // 5. Get text content
        let text = '';
        try {
            const innerText = await locator.innerText({ timeout: 200 });
            const ariaLabel = await locator.getAttribute('aria-label');
            const title = await locator.getAttribute('title');
            const placeholder = await locator.getAttribute('placeholder');
            const alt = await locator.getAttribute('alt');

            text = (innerText || ariaLabel || title || placeholder || alt || '').trim();
        } catch {
            // Ignore errors
        }

        let placeholder: string | null = null;
        if (role === 'textbox') {
            placeholder = (await locator.getAttribute('placeholder')) || null;
            if (!text && placeholder) text = placeholder;
        }

        // 6. Generate fallback text if empty
        if (!text || text.length === 0) {
            const id = await locator.getAttribute('id');
            const className = await locator.getAttribute('class');
            text = `${tagName}${id ? '#' + id : ''}${className ? '.' + className.split(' ')[0] : ''}`;

            // RELAXED: Accept even without text for important elements
            if (!id && !className && role !== 'textbox') {
                skipped.noText++;
                continue;
            }
        }

        // 7. Calculate priority (with href for product detection)
        const priorityScore = calculatePriorityScore(role, text, placeholder, ariaRole, tagName, inputType, href);

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

        // Early exit if we have enough high-priority elements
        if (elements.filter(e => (e.priorityScore || 0) >= 1000).length >= 30) {
            console.log(`[ELEMENTS] Early exit: Found 30+ high-priority elements`);
            break;
        }
    }

    console.log(`[ELEMENTS] ✅ Collected ${elements.length} valid elements`);
    console.log(`[ELEMENTS] Skipped: ${JSON.stringify(skipped)}`);

    if (elements.length > 0) {
        // Sort by priority
        elements.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

        // Reassign IDs after sorting
        elements.forEach((el, idx) => {
            el.id = idx;
        });

        // Log top elements
        console.log(`[ELEMENTS] Top 10 elements:`, elements.slice(0, 10).map(e => ({
            id: e.id,
            role: e.role,
            text: e.text.substring(0, 30),
            score: e.priorityScore
        })));
    }

    return elements;
}