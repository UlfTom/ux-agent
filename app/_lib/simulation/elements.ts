// app/_lib/simulation/elements.ts
// ⭐️ SCHNELLE, PLAYWRIGHT-NATIVE VERSION MIT KONTEXT-PRIORISIERUNG ⭐️

import { Page } from 'playwright';
import type { InteractableElement } from './types';

// Priorisierte Selektoren
const SELECTORS = [
    'input[type="search"]',
    'input[placeholder*="such" i]',
    'input[placeholder*="search" i]',
    'input[placeholder*="wonach suchst du" i]',
    'input[type="text"]',
    'input[type="email"]',
    'input[type="password"]',
    'textarea',
    'button:not([aria-hidden="true"]):not([disabled])',
    'a[href]:not([aria-hidden="true"]):not([disabled])',
    '[role="button"]:not([aria-hidden="true"]):not([disabled])',
    '[role="link"]:not([aria-hidden="true"]):not([disabled])',
    'select:not([aria-hidden="true"]):not([disabled])',
];

function getRole(tagName: string, el: any): 'link' | 'button' | 'textbox' {
    tagName = tagName.toLowerCase();
    const role = el.role;

    if (tagName === 'a' || role === 'link') return 'link';
    // ⭐️ FIX: Tippfehler '===a ===' korrigiert zu '==='
    if (tagName === 'input' || tagName === 'textarea' || role === 'searchbox' || role === 'textbox') return 'textbox';

    // Alles andere, was klickbar ist, ist ein 'button'
    return 'button';
}

// ⭐️ KORREKTUR: calculatePriority akzeptiert 'onSearchResults'
function calculatePriority(
    role: 'link' | 'button' | 'textbox',
    text: string,
    placeholder: string | null,
    onSearchResults: boolean // ⭐️ NEUER PARAMETER
): number {
    let score = 100;
    const t = text.toLowerCase();
    const p = (placeholder || '').toLowerCase();

    if (role === 'textbox') {
        score = 1000;
        if (p.includes('such') || p.includes('search') || p.includes('wonach')) {
            // ⭐️ KORREKTUR: Suchfeld ist auf Ergebnisseiten WENIGER wichtig
            score = onSearchResults ? 3000 : 5000;
        }
    }

    // ⭐️ NEU: Priorisiere gängige Filter/Such-Buttons auf Startseiten
    if (!onSearchResults && role === 'button') {
        if (t.includes('fahrzeugsuche') || t.includes('modelle') || t.includes('filter') || t.includes('suchen')) {
            score = 4000; // Hoch, aber niedriger als ein echtes Such-TEXTFELD (5000)
        }
    }

    // Navigationslinks abwerten
    if (role === 'link' && (t.includes('service') || t.includes('hilfe') || t.includes('konto') || t.includes('merkzettel'))) {
        score = 10;
    }

    // ⭐️ KORREKTUR: Produkt-Keywords auf Ergebnisseiten EXTREM aufwerten
    if (onSearchResults && role === 'link') {
        // Generische Produkt-Trigger
        if (t.includes('€') || t.includes('ab ') || t.match(/\d+,\d{2}/) || t.includes('bestseller') || t.includes('angebot')) {
            score = 6000; // ⭐️ HÖHER ALS DAS SUCHFELD (5000)
        }
        // Task-spezifische Trigger (für den "Winter-Jeans" Task)
        if (t.includes('jeans') || t.includes('damen') || t.includes('herren') || t.includes('thermo') || t.includes('fleecefutter')) {
            score = 6100; // Noch wichtiger
        }
    }

    // Produkt-Link-Struktur (generisch)
    if (role === 'link' && (t.includes('/p/') || t.includes('/produkt/') || t.includes('/artikel/'))) {
        score += 800;
    }

    return score;
}

// ⭐️ KORREKTUR: getInteractableElements akzeptiert 'onSearchResults'
export async function getInteractableElements(page: Page, onSearchResults: boolean): Promise<InteractableElement[]> {
    const elements: InteractableElement[] = [];
    await page.waitForTimeout(500); // Kurze Wartezeit auf lazy-loaded content

    const locators = page.locator(SELECTORS.join(', '));
    const count = await locators.count();

    console.log(`[ELEMENTS] Found ${count} raw candidate elements.`);

    for (let i = 0; i < Math.min(count, 500); i++) { // Limit auf 500 Elemente
        const locator = locators.nth(i);
        let box;
        try {
            box = await locator.boundingBox({ timeout: 200 }); // Schneller Timeout
            if (!box || box.width < 5 || box.height < 5) continue;

            const isVisible = await locator.isVisible();
            if (!isVisible) continue;

            const elProperties = await locator.evaluate(el => ({
                tagName: el.tagName,
                role: el.getAttribute('role'),
                text: el.textContent || el.getAttribute('aria-label') || (el as HTMLInputElement).placeholder || '',
                placeholder: (el as HTMLInputElement).placeholder || null,
            }));

            const text = elProperties.text.trim().replace(/\s+/g, ' ');
            const placeholder = elProperties.placeholder;
            const role = getRole(elProperties.tagName, elProperties);

            // ⭐️ KORREKTUR: 'onSearchResults' wird hier übergeben
            const priorityScore = calculatePriority(role, text, placeholder, onSearchResults);

            elements.push({
                id: i, // Temporäre ID
                realIndex: i, // Der "echte" Index im Playwright-Locator
                role: role,
                box: box,
                text: text.substring(0, 100),
                placeholder: placeholder,
                isHoverTarget: false,
                priorityScore: priorityScore
            });

        } catch (e) {
            continue;
        }
    }

    // Sortiere nach Priorität
    elements.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

    // IDs *NACH* dem Sortieren neu zuweisen
    elements.forEach((el, index) => {
        el.id = index;
    });

    console.log(`[ELEMENTS] Returning ${elements.length} filtered elements.`);
    return elements;
}