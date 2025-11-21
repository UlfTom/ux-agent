// app/_lib/simulation/react-agent/observe.ts
// ⭐️ KORRIGIERTER FIX: Verwendet jetzt den korrekten Prio-Score (6000) ⭐️

import { Page } from 'playwright';
import { callLLM } from '../utils';
import { InteractableElement } from '../types';
import { Language } from '../types';

export async function observeCurrentState(
    page: Page,
    plan: string,
    elements: InteractableElement[],
    screenshotBase64: string,
    personaPrompt: string,
    language: Language = 'de'
): Promise<string> {
    console.log(`[OBSERVE] Analyzing state...`);
    console.log(`[OBSERVE] Plan: "${plan}"`);
    console.log(`[OBSERVE] Elements found: ${elements.length}`);

    // Get current URL for context
    const currentUrl = page.url();
    console.log(`[OBSERVE] Current URL: ${currentUrl}`);

    // CRITICAL FIX: Detect context
    const isOnSearchResults = currentUrl.includes('/suche/') || currentUrl.includes('/search/');

    // ⭐️ KORREKTUR: Filtert nach 6000, nicht 800
    const productLinks = elements.filter(e =>
        e.role === 'link' &&
        e.priorityScore &&
        e.priorityScore >= 6000 // ⭐️ WAR 800, MUSS 6000 SEIN
    );

    console.log(`[OBSERVE] Is on search results: ${isOnSearchResults}`);
    console.log(`[OBSERVE] Product links found (Prio >= 6000): ${productLinks.length}`);

    // Build element summary (Top 10 products + 5 other)
    // ⭐️ KORREKTUR: Filtert nach 6000, nicht 800
    const topProducts = elements.filter(e => e.priorityScore && e.priorityScore >= 6000).slice(0, 10);
    const otherElements = elements.filter(e => !e.priorityScore || e.priorityScore < 6000).slice(0, 5); // ⭐️ War 800
    const relevantElements = [...topProducts, ...otherElements];
    const urlContext = `Du bist auf der Webseite: ${currentUrl}`;

    const elementSummary = relevantElements.map(e =>
        `[ID ${e.id}] ${e.role}: "${e.text.substring(0, 60)}" (priority: ${e.priorityScore || 0})`
    ).join('\n');

    // CRITICAL FIX: Add product context
    const productContext = productLinks.length > 0 ? `
🛍️ **PRODUKTE GEFUNDEN!**
Anzahl: ${productLinks.length}
Top 3:
${productLinks.slice(0, 3).map((p, i) => `${i + 1}. [ID ${p.id}] "${p.text.substring(0, 50)}"`).join('\n')}
` : `⚠️ **KEINE PRODUKTE** im Code gefunden (priority >= 6000)`; // ⭐️ War 800

    const promptDE = `
${personaPrompt}

**AKTUELLER KONTEXT:**
${urlContext}
**Dein Plan:** "${plan}"

**Verfügbare Elemente (Code):**
${elementSummary}

**AUFGABE (AUS DEINER PERSONA-SICHT):**
1. Analysiere den Screenshot.
2. Beschreibe kurz, was du siehst, aber **filtere es durch deine Persönlichkeit**.
   - (Bist du pragmatisch? Dann suchst du den direkten Weg.)
   - (Bist du unsicher? Dann wirken viele Elemente vielleicht verwirrend.)
3. Gleiche das mit den "Verfügbaren Elementen" ab.

Beschreibe die Situation in 2-3 Sätzen (Ich-Form, aus deiner Rolle heraus):`;

    const promptEN = `
${personaPrompt}

**CONTEXT:**
${urlContext}
**Your Plan:** "${plan}"

**Available Elements:**
${elementSummary}

**TASK (FROM YOUR PERSONA PERSPECTIVE):**
1. Analyze the screenshot.
2. Describe what you see, but **filter it through your personality**.
3. Match with "Available Elements".

Describe the situation in 2-3 sentences (First person, in character):`;

    const prompt = language === 'de' ? promptDE : promptEN;

    try {
        const observation = await callLLM('llava:latest', prompt, screenshotBase64, language, undefined);
        console.log(`[OBSERVE] ✅ Vision observation: ${observation.substring(0, 200)}...`);

        // CRITICAL FIX: Enrich with code-based data
        let enrichedObservation = observation;

        if (productLinks.length > 0) {
            enrichedObservation += `\n\n💻 **Code-Analyse:** ${productLinks.length} klickbare Produkt-Links gefunden.`;
            enrichedObservation += `\n🎯 **Verfügbar:** ${productLinks.slice(0, 3).map(p => `[ID ${p.id}] "${p.text.substring(0, 30)}"`).join(', ')}`;
        }

        return enrichedObservation;
    } catch (error) {
        console.error('[OBSERVE] Vision error:', error);

        // FALLBACK: Code-based observation (language-aware)
        if (productLinks.length > 0) {
            if (language === 'de') {
                return `✅ Ich sehe die Suchergebnisseite mit ${productLinks.length} Produkten. Verfügbar: ${productLinks.slice(0, 3).map(p => `[ID ${p.id}] "${p.text.substring(0, 40)}"`).join(', ')}. Diese Produkte kann ich anklicken.`;
            } else {
                return `✅ I see the search results page with ${productLinks.length} products. Available: ${productLinks.slice(0, 3).map(p => `[ID ${p.id}] "${p.text.substring(0, 40)}"`).join(', ')}. I can click these products.`;
            }
        } else if (isOnSearchResults) {
            if (language === 'de') {
                return `⚠️ Ich sehe die Suchergebnisseite, aber der Code findet keine Produkte (priority >= 6000). Möglicherweise muss ich scrollen oder die Seite ist noch am Laden.`; // ⭐️ War 800
            } else {
                return `⚠️ I see the search results page, but the code finds no products (priority >= 6000). May need to scroll or page is still loading.`; // ⭐️ War 800
            }
        } else {
            if (language === 'de') {
                return `📄 Ich sehe die Seite mit ${elements.length} interaktiven Elementen. Keine Produkte erkannt.`;
            } else {
                return `📄 I see the page with ${elements.length} interactive elements. No products detected.`;
            }
        }
    }
}