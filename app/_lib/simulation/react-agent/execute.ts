// app/_lib/simulation/react-agent/execute.ts
// ⭐️ FIX: Korrekte Persona-IDs verwenden

import { Page } from 'playwright';
import { InteractableElement, PersonaType } from '../types';
import type { VerificationResult } from './verify';

// ===== Persona-basierte Interaktions-Helfer =====

function getTypingDelay(personaType: PersonaType): number {
    switch (personaType) {
        case 'unsure': // WAR: 'Vorsichtig & Skeptisch'
            return 120 + (Math.random() * 80);
        case 'explorative': // WAR: 'Explorativ & Neugierig'
            return 70 + (Math.random() * 50);
        case 'pragmatic': // WAR: 'Pragmatisch & Zielorientiert'
            return 40 + (Math.random() * 40);
        default:
            return 70 + (Math.random() * 50);
    }
}

function getMouseSteps(personaType: PersonaType): number {
    switch (personaType) {
        case 'unsure':
            return 15;
        case 'explorative':
            return 7;
        case 'pragmatic':
            return 3;
        default:
            return 7;
    }
}

function getPostActionDelay(personaType: PersonaType): number {
    switch (personaType) {
        case 'unsure':
            return 2000;
        case 'explorative':
            return 1200;
        case 'pragmatic':
            return 800;
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
    personaType: PersonaType
): Promise<string> {
    const { action, elementId, textToType, scrollDirection } = verification;
    console.log(`[EXECUTE] Action: ${action} (Persona: ${personaType})`, { elementId, textToType, scrollDirection });

    try {
        switch (action) {
            case 'click':
                return await executeClick(page, elements, elementId!, personaType);

            case 'type':
                const text = textToType || task;
                return await executeType(page, elements, elementId!, text, personaType);

            case 'scroll':
                return await executeScroll(page, scrollDirection || 'down', personaType);

            case 'wait':
                await page.waitForTimeout(getPostActionDelay(personaType));
                return '⏸️ Warte...';

            default:
                // Ignoriere unbekannte Aktionen oder logge Warnung
                if (['swipe', 'longPress'].includes(action)) {
                    await page.waitForTimeout(1000);
                    return `🤷 Aktion ${action} (Mobile-Geste) simuliert.`;
                }
                throw new Error(`Unbekannte Aktion: ${action}`);
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[EXECUTE] Fehler bei Ausführung:', errorMsg);
        throw new Error(`Aktion ${action} fehlgeschlagen: ${errorMsg}`);
    }
}

// ===== Aktions-Implementierungen =====

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

    // Scrollen, falls Element nicht sichtbar (Sicherheitsnetz)
    // await element.scrollIntoViewIfNeeded(); // Playwright macht das oft automatisch, aber gut zu wissen

    console.log(`[EXECUTE] Klicke auf [ID ${elementId}] bei (${Math.round(x)}, ${Math.round(y)}) mit ${steps} Schritten`);

    await page.mouse.move(x, y, { steps });
    await page.waitForTimeout(50 + Math.random() * 100);

    await page.mouse.down();
    await page.waitForTimeout(30 + Math.random() * 50);
    await page.mouse.up();

    await page.waitForTimeout(getPostActionDelay(personaType));

    return `🖱️ Geklickt auf "${element.text.substring(0, 40)}" [ID ${elementId}]`;
}

async function executeType(
    page: Page,
    elements: InteractableElement[],
    elementId: number,
    text: string,
    personaType: PersonaType
): Promise<string> {
    const element = elements.find(e => e.id === elementId);
    if (!element) throw new Error(`Element [ID ${elementId}] nicht gefunden`);

    // Check: Ist es wirklich ein Input? Manchmal erkennt die KI div als Input.
    // Wir versuchen es trotzdem, klicken aber sicherheitshalber.

    const x = element.box.x + element.box.width / 2;
    const y = element.box.y + element.box.height / 2;
    const steps = getMouseSteps(personaType);

    console.log(`[EXECUTE] Tippe "${text}" in [ID ${elementId}] (Persona: ${personaType})`);

    await page.mouse.move(x, y, { steps });
    await page.mouse.click(x, y);
    await page.waitForTimeout(100);

    // Text löschen
    await page.mouse.click(x, y, { clickCount: 3 });
    await page.waitForTimeout(50);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(getTypingDelay(personaType) / 2);

    for (const char of text) {
        const delay = getTypingDelay(personaType);
        await page.keyboard.type(char, { delay: delay + (Math.random() * 20 - 10) });
    }
    await page.waitForTimeout(500);

    console.log('[EXECUTE] Drücke Enter zum Abschicken');
    await page.keyboard.press('Enter');

    try {
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } catch (e) {
        // Timeout ignorieren, manche SPAs laden nicht neu
    }
    await page.waitForTimeout(getPostActionDelay(personaType));

    return `⌨️ Getippt "${text}" in [ID ${elementId}] und Enter gedrückt`;
}

async function executeScroll(
    page: Page,
    direction: 'up' | 'down',
    personaType: PersonaType
): Promise<string> {

    const scrollAmount = personaType === 'pragmatic' ? 1000 : 700;
    const behavior = personaType === 'unsure' ? 'smooth' : 'auto';

    const amount = direction === 'down' ? scrollAmount : -scrollAmount;

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