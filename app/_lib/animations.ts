// app/_lib/simulation/elements.ts
// ⭐️ INTELLIGENTE VERSION: Nutzt Accessibility-Labels für menschliche Wahrnehmung ⭐️

import { Page } from 'playwright';
import type { InteractableElement } from './types';

// Priorisierte Selektoren für interaktive Elemente
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
    '[role="searchbox"]',
    '[role="textbox"]'
];

function getRole(tagName: string, elProps: { role: string | null }): 'link' | 'button' | 'textbox' {
    const tag = tagName.toLowerCase();
    const role = (elProps.role || '').toLowerCase();

    if (tag === 'a' || role === 'link') return 'link';
    if (tag === 'input' || tag === 'textarea' || role === 'searchbox' || role === 'textbox') return 'textbox';

    // Alles andere, was klickbar ist, behandeln wir als Button
    return 'button';
}

/**
 * Berechnet, wie wichtig ein Element für den Agenten ist.
 * Nutzt jetzt das "Smart Label" statt nur Rohtext.
 */
function calculatePriority(
    role: 'link' | 'button' | 'textbox',
    label: string,
    placeholder: string | null,
    onSearchResults: boolean
): number {
    let score = 100;
    const t = label.toLowerCase();
    const p = (placeholder || '').toLowerCase();

    // 1. TEXTBOXEN (Eingabe hat oft hohe Prio am Anfang)
    if (role === 'textbox') {
        score = 1000;
        // Suchfelder erkennen
        if (t.includes('such') || t.includes('search') || t.includes('finde') || 
            p.includes('such') || p.includes('search')) {
            // Auf Ergebnisseiten ist das Suchfeld weniger wichtig als die Ergebnisse
            score = onSearchResults ? 3000 : 5000;
        }
    }

    // 2. BUTTONS (Aktionen)
    if (role === 'button') {
        // Wichtige Keywords für Navigation/Suche
        if (!onSearchResults) {
            if (t.includes('suchen') || t.includes('finden') || t.includes('filter') || t.includes('alle akzeptieren')) {
                score = 4000;
            }
        }
        // Cookie/Consent Buttons extrem hoch priorisieren, damit sie weggeklickt werden
        if (t.includes('akzeptieren') || t.includes('zustimmen') || t.includes('allow all') || t.includes('accept')) {
            score = 9000;
        }
    }

    // 3. LINKS (Navigation & Produkte)
    if (role === 'link') {
        // Unwichtige Links abwerten
        if (t.includes('impressum') || t.includes('datenschutz') || t.includes('agb') || t.includes('über uns')) {
            score = 10;
        }
        
        // Service-Links
        if (t.includes('service') || t.includes('hilfe') || t.includes('konto') || t.includes('anmelden')) {
            score = 50;
        }

        // ⭐️ PRODUKTE ERKENNEN (Besonders auf Ergebnisseiten)
        if (onSearchResults) {
            // Preissignale oder typische Produkt-Wörter
            if (t.includes('€') || t.match(/\d+,\d{2}/) || t.includes('ab ') || t.includes('bestseller')) {
                score = 6000; // Sehr hoch, damit der Agent Produkte sieht!
            }
            
            // Wenn der Link sehr lang ist, ist es oft ein Produkttitel
            if (t.length > 30 && !t.includes('tabelle')) {
                score += 500;
            }
        }
    }

    return score;
}

/**
 * Extrahiert alle interaktiven Elemente der Seite.
 * Neu: Intelligente Label-Ermittlung für semantisches Verständnis.
 */
export async function getInteractableElements(page: Page, onSearchResults: boolean): Promise<InteractableElement[]> {
    const elements: InteractableElement[] = [];
    
    // Kurze Wartezeit, damit JS-Frameworks (React/Vue) Hydration abschließen können
    await page.waitForTimeout(500);

    const locators = page.locator(SELECTORS.join(', '));
    
    // Wir nehmen nur die ersten X Elemente, um Performance zu wahren
    // (Auf Amazon/Otto können es tausende sein)
    const count = await locators.count();
    const maxElements = 400; 

    console.log(`[ELEMENTS] Roh-Elemente gefunden: ${count}. Analysiere Top ${maxElements}...`);

    for (let i = 0; i < Math.min(count, maxElements); i++) {
        const locator = locators.nth(i);
        
        try {
            // 1. Check: Ist es sichtbar und groß genug?
            const box = await locator.boundingBox({ timeout: 100 });
            if (!box || box.width < 5 || box.height < 5) continue;
            
            const isVisible = await locator.isVisible();
            if (!isVisible) continue;

            // 2. Smart Extraction im Browser-Kontext (schneller als einzelne Calls)
            // Hier holen wir uns das beste Label, das wir finden können
            const elProps = await locator.evaluate((el) => {
                const element = el as HTMLElement;
                const tagName = element.tagName.toLowerCase();
                const role = element.getAttribute('role');
                
                // LABEL-STRATEGIE (Wie ein Screenreader):
                // 1. aria-label (explizit für Maschinen)
                // 2. visible text (innerText)
                // 3. placeholder (für Inputs)
                // 4. alt text (für Bilder/Inputs)
                // 5. title attribute
                // 6. value (für Submit Buttons)
                
                let label = element.getAttribute('aria-label') || '';

                if (!label && element.innerText) {
                    // Text bereinigen (Newlines raus, doppelte Leerzeichen raus)
                    label = element.innerText.replace(/\s+/g, ' ').trim();
                }

                if (!label && (element as HTMLInputElement).placeholder) {
                    label = (element as HTMLInputElement).placeholder;
                }

                if (!label && element.getAttribute('alt')) {
                    label = element.getAttribute('alt') || '';
                }

                if (!label && element.getAttribute('title')) {
                    label = element.getAttribute('title') || '';
                }
                
                if (!label && (element as HTMLInputElement).value && tagName === 'input') {
                    label = (element as HTMLInputElement).value;
                }

                return {
                    tagName,
                    role,
                    label: label || '', // Fallback auf Leerstring
                    placeholder: (element as HTMLInputElement).placeholder || null,
                };
            });

            const role = getRole(elProps.tagName, elProps);
            
            // Leere Elemente ignorieren (außer Textboxen, die sind oft leer)
            if (role !== 'textbox' && elProps.label.length < 2) continue;

            // 3. Priorität berechnen
            const priorityScore = calculatePriority(role, elProps.label, elProps.placeholder, onSearchResults);

            elements.push({
                id: i, // Temporäre ID für diesen Step
                realIndex: i, // Echter Index für Playwright Locator
                role: role,
                box: box,
                text: elProps.label.substring(0, 120), // Begrenzte Länge für LLM-Kontext
                placeholder: elProps.placeholder,
                isHoverTarget: false, // Placeholder für zukünftiges Feature
                priorityScore: priorityScore
            });

        } catch (e) {
            // Elemente, die während der Analyse verschwinden (Dynamik), ignorieren wir
            continue;
        }
    }

    // Sortieren: Wichtige Elemente zuerst (für LLM-Kontext-Fenster)
    elements.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

    // IDs neu vergeben nach Sortierung, damit ID 0 das wichtigste Element ist
    // (Das hilft dem LLM, da kleine Zahlen psychologisch "wichtiger" wirken)
    elements.forEach((el, index) => {
        el.id = index;
    });

    console.log(`[ELEMENTS] ${elements.length} interaktive Elemente extrahiert & priorisiert.`);
    return elements;
}
