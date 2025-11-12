// app/_lib/simulation/react-agent/observe.ts
// FIX: Vision-based product detection + Code-based fallback

import { Page } from 'playwright';
import { callOllama } from '../utils';
import { InteractableElement } from '../types';
import { Language } from '../types';

export async function observeCurrentState(
    page: Page,
    plan: string,
    elements: InteractableElement[],
    screenshotBase64: string,
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

    // CRITICAL FIX: Count product links (HIGH priority >= 800)
    const productLinks = elements.filter(e =>
        e.role === 'link' &&
        e.priorityScore &&
        e.priorityScore >= 800
    );

    console.log(`[OBSERVE] Is on search results: ${isOnSearchResults}`);
    console.log(`[OBSERVE] Product links found: ${productLinks.length}`);

    // Build element summary (Top 10 products + 5 other)
    const topProducts = elements.filter(e => e.priorityScore && e.priorityScore >= 800).slice(0, 10);
    const otherElements = elements.filter(e => !e.priorityScore || e.priorityScore < 800).slice(0, 5);
    const relevantElements = [...topProducts, ...otherElements];

    const elementSummary = relevantElements.map(e =>
        `[ID ${e.id}] ${e.role}: "${e.text.substring(0, 60)}" (priority: ${e.priorityScore || 0})`
    ).join('\n');

    // CRITICAL FIX: Add product context
    const productContext = productLinks.length > 0 ? `
🛍️ **PRODUKTE GEFUNDEN!**
Anzahl: ${productLinks.length}
Top 3:
${productLinks.slice(0, 3).map((p, i) => `${i + 1}. [ID ${p.id}] "${p.text.substring(0, 50)}"`).join('\n')}
` : `⚠️ **KEINE PRODUKTE** im Code gefunden (priority >= 800)`;

    const promptDE = `Du bist ein KI-Shopping-Agent der Produkte auswählen soll.

**Dein Plan:**
"${plan}"

**Verfügbare Elemente (Top ${relevantElements.length}):**
${elementSummary}

${productContext}

**WICHTIGE ANWEISUNGEN:**

1. **VISUELL PRÜFEN:** Schaue dir den Screenshot an:
   - Siehst du Produkt-Kacheln mit Bildern?
   - Siehst du Produktnamen und Preise (€)?
   - Wie viele Produkte sind sichtbar?

2. **PRODUKTE BESCHREIBEN:**
   - Wenn du Produkte siehst: "Ich sehe [Anzahl] Produkte: [Namen]"
   - Nenne konkrete Produktnamen die du SIEHST
   - Erwähne Preise wenn sichtbar

3. **AUSWAHL TREFFEN:**
   - Wenn mehrere Produkte da sind: Sage welches dir am besten gefällt und WARUM
   - "Die [Farbe] [Produkt] mit [Feature] gefällt mir weil [Grund]"
   - Gib die Element-ID an: [ID X]

4. **KEINE HALLUZINATION:**
   - Erfinde KEINE Element-IDs
   - Sage nicht "Produkte da" wenn du keine siehst
   - Sage klar wenn NICHTS passt

Beschreibe was du siehst (2-4 Sätze, inkl. Produktauswahl wenn möglich):`;

    const promptEN = `You are an AI shopping agent who needs to select products.

**Your Plan:**
"${plan}"

**Available Elements (Top ${relevantElements.length}):**
${elementSummary}

${productContext}

**IMPORTANT INSTRUCTIONS:**

1. **VISUAL CHECK:** Look at the screenshot:
   - Do you see product tiles with images?
   - Do you see product names and prices (€)?
   - How many products are visible?

2. **DESCRIBE PRODUCTS:**
   - If you see products: "I see [number] products: [names]"
   - Name specific products you SEE
   - Mention prices if visible

3. **MAKE SELECTION:**
   - If multiple products: Say which one you like best and WHY
   - "The [color] [product] with [feature] appeals to me because [reason]"
   - Provide element ID: [ID X]

4. **NO HALLUCINATION:**
   - Don't invent element IDs
   - Don't say "products there" if you see none
   - Clearly state if NOTHING fits

Describe what you see (2-4 sentences, incl. product selection if possible):`;

    const prompt = language === 'de' ? promptDE : promptEN;

    try {
        const observation = await callOllama('llava:latest', prompt, screenshotBase64, language, undefined);
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
                return `⚠️ Ich sehe die Suchergebnisseite, aber der Code findet keine Produkte (priority >= 800). Möglicherweise muss ich scrollen oder die Seite ist noch am Laden.`;
            } else {
                return `⚠️ I see the search results page, but the code finds no products (priority >= 800). May need to scroll or page is still loading.`;
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