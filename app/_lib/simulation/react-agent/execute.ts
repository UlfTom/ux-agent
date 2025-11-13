// app/_lib/simulation/react-agent/execute.ts
// UPGRADED: Integriert Persona-Skill-Level für menschliche Interaktion

import { Page } from 'playwright';
import { InteractableElement, PersonaType } from '../types';
import type { VerificationResult } from './verify';

// ===== Persona-basierte Interaktions-Helfer =====

/**
 * Simuliert die Tippgeschwindigkeit basierend auf der Persona.
 * "Vorsichtig" (Oma) tippt langsam und bedacht.
 * "Pragmatisch" (Ich/User) tippt schnell und effizient.
 */
function getTypingDelay(personaType: PersonaType): number {
    switch (personaType) {
        case 'Vorsichtig & Skeptisch':
            return 120 + (Math.random() * 80); // 120-200ms (Langsam, suchend)
        case 'Explorativ & Neugierig':
            return 70 + (Math.random() * 50);  // 70-120ms (Normal)
        case 'Pragmatisch & Zielorientiert':
            return 40 + (Math.random() * 40);  // 40-80ms (Schnell, geübt)
        default:
            return 70 + (Math.random() * 50);
    }
}

/**
 * Simuliert die Mausbewegungs-Geschwindigkeit (Anzahl der Schritte).
 * "Vorsichtig" (Oma) bewegt die Maus langsamer und "suchender".
 */
function getMouseSteps(personaType: PersonaType): number {
    switch (personaType) {
        case 'Vorsichtig & Skeptisch':
            return 15; // Langsame, zögerliche Mausbewegung
        case 'Explorativ & Neugierig':
            return 7;  // Normale Mausbewegung
        case 'Pragmatisch & Zielorientiert':
            return 3;  // Schnelle, direkte Mausbewegung
        default:
            return 7;
    }
}

/**
 * Simuliert die Wartezeit nach einer Aktion.
 * "Vorsichtig" (Oma) pausiert länger, um das Ergebnis zu prüfen.
 */
function getPostActionDelay(personaType: PersonaType): number {
    switch (personaType) {
        case 'Vorsichtig & Skeptisch':
            return 2000; // Längere Pause zum Lesen/Verarbeiten
        case 'Explorativ & Neugierig':
            return 1200;
        case 'Pragmatisch & Zielorientiert':
            return 800; // Kurze Pause, sofort weiter
        default:
            return 1000;
    }
}

// ===== Haupt-Aktions-Handler =====

export async function executeAction(
    verification: VerificationResult,
    page: Page,
    elements: InteractableElement[],
    task: string,
    personaType: PersonaType // WICHTIG: Persona wird durchgereicht
): Promise<string> {
    const { action, elementId, textToType, scrollDirection } = verification;
    console.log(`[EXECUTE] Action: ${action} (Persona: ${personaType})`, { elementId, textToType, scrollDirection });

    try {
        switch (action) {
            case 'click':
                return await executeClick(page, elements, elementId!, personaType);

            case 'type':
                // Wenn kein Text vom LLM vorgegeben wird (selten), nimm den Task als Fallback
                const text = textToType || task;
                return await executeType(page, elements, elementId!, text, personaType);

            case 'scroll':
                return await executeScroll(page, scrollDirection || 'down', personaType);

            // ZUKUNFT: Hier könnten Mobile-Gesten (dein "Ich"-Szenario) hin
            case 'swipe':
            case 'longPress':
            case 'doubleTap':
                console.warn(`[EXECUTE] Aktion ${action} ist für die Zukunft vorgesehen, führe 'wait' aus.`);
                await page.waitForTimeout(1000);
                return `🤷 Aktion ${action} (Mobile-Geste) noch nicht implementiert.`;

            case 'wait':
                await page.waitForTimeout(getPostActionDelay(personaType)); // Wartezeit auch Persona-abhängig
                return '⏸️ Warte...';

            default:
                throw new Error(`Unbekannte Aktion: ${action}`);
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[EXECUTE] Fehler bei Ausführung:', errorMsg);
        // Wirf den Fehler weiter, damit die Haupt-Route ihn fangen kann
        throw new Error(`Aktion ${action} fehlgeschlagen: ${errorMsg}`);
    }
}

// ===== Aktions-Implementierungen =====

/**
 * Führt einen "menschlichen" Klick aus.
 * Bewegt die Maus, simuliert ein echtes Drücken und Loslassen.
 */
async function executeClick(
    page: Page,
    elements: InteractableElement[],
    elementId: number,
    personaType: PersonaType
): Promise<string> {
    const element = elements.find(e => e.id === elementId);
    if (!element) throw new Error(`Element [ID ${elementId}] nicht gefunden`);

    const x = element.box.x + element.box.width / 2;
    const y = element.box.y + element.box.height / 2;
    const steps = getMouseSteps(personaType);

    console.log(`[EXECUTE] Klicke auf [ID ${elementId}] bei (${Math.round(x)}, ${Math.round(y)}) mit ${steps} Schritten`);

    // Maus hinbewegen
    await page.mouse.move(x, y, { steps });
    await page.waitForTimeout(50 + Math.random() * 100); // Kurze Pause vor Klick

    // Echten Klick simulieren (zuverlässiger als .click())
    await page.mouse.down();
    await page.waitForTimeout(30 + Math.random() * 50);
    await page.mouse.up();

    // Warten, bis die Seite reagiert
    await page.waitForTimeout(getPostActionDelay(personaType));

    return `🖱️ Geklickt auf "${element.text.substring(0, 40)}" [ID ${elementId}]`;
}

/**
 * Führt "menschliches" Tippen aus (Zeichen für Zeichen).
 * Klickt erst ins Feld, löscht alten Text, tippt langsam/schnell je nach Persona und drückt Enter.
 */
async function executeType(
    page: Page,
    elements: InteractableElement[],
    elementId: number,
    text: string,
    personaType: PersonaType
): Promise<string> {
    const element = elements.find(e => e.id === elementId);
    if (!element) throw new Error(`Element [ID ${elementId}] nicht gefunden`);
    if (element.role !== 'textbox') throw new Error(`Element [ID ${elementId}] ist kein Textfeld!`);

    const x = element.box.x + element.box.width / 2;
    const y = element.box.y + element.box.height / 2;
    const steps = getMouseSteps(personaType);

    console.log(`[EXECUTE] Tippe "${text}" in [ID ${elementId}] (Persona: ${personaType})`);

    // 1. Hinfahren und fokussieren
    await page.mouse.move(x, y, { steps });
    await page.mouse.click(x, y); // Klick zum Fokussieren
    await page.waitForTimeout(100);

    // 2. Text löschen (Dreifach-Klick + Backspace ist robust)
    await page.mouse.click(x, y, { clickCount: 3 });
    await page.waitForTimeout(50);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(getTypingDelay(personaType) / 2); // Kurze Pause

    // 3. Zeichen für Zeichen tippen (löst JS-Events aus)
    for (const char of text) {
        const delay = getTypingDelay(personaType);
        await page.keyboard.type(char, { delay: delay + (Math.random() * 20 - 10) }); // +Jitter
    }
    await page.waitForTimeout(500); // Warten auf Autocomplete/Vorschläge

    // 4. Enter drücken (Universelle Submit-Aktion)
    console.log('[EXECUTE] Drücke Enter zum Abschicken');
    await page.keyboard.press('Enter');

    // 5. Auf Navigation/Ergebnisse warten
    try {
        await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
    } catch (e) {
        console.log('[EXECUTE] Keine volle Navigation nach Enter, warte auf Timeout.');
    }
    await page.waitForTimeout(getPostActionDelay(personaType)); // Warten auf JS-Rendering

    return `⌨️ Getippt "${text}" in [ID ${elementId}] und Enter gedrückt`;
}

/**
 * Führt "menschliches" Scrollen aus.
 * "Pragmatisch" scrollt schnell (große Sprünge), "Vorsichtig" scrollt langsam.
 */
async function executeScroll(
    page: Page,
    direction: 'up' | 'down', // Dieser Parameter wird jetzt genutzt
    personaType: PersonaType
): Promise<string> {

    const scrollAmount = personaType === 'Pragmatisch & Zielorientiert' ? 1000 : 700;
    const behavior = personaType === 'Vorsichtig & Skeptisch' ? 'smooth' : 'auto';

    // ⭐️ KORREKTUR: 'direction' wird hier verwendet ⭐️
    const amount = direction === 'down' ? scrollAmount : -scrollAmount; // Negativer Wert für "Hochscrollen"

    console.log(`[EXECUTE] Scrolle ${direction} um ${Math.abs(amount)}px (Behavior: ${behavior})`);

    await page.evaluate(({ amount, behavior }) => {
        window.scrollBy({
            top: amount,
            behavior: behavior as ScrollBehavior
        });
    }, { amount, behavior });

    await page.waitForTimeout(getPostActionDelay(personaType));

    return `📜 ${direction === 'down' ? 'Runter' : 'Hoch'} gescrollt (${Math.abs(amount)}px)`;
}