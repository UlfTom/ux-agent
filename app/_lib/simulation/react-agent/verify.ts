// app/_lib/simulation/react-agent/verify.ts
// FIX: Force product selection + correct imports

import { callOllama } from '../utils';
import { InteractableElement, SessionState, Language } from '../types';

export type VerificationResult = {
    match: boolean;
    confidence: number;
    action: 'click' | 'type' | 'scroll' | 'wait' | 'swipe' | 'longPress' | 'doubleTap'; // ERWEITERT
    elementId?: number;
    textToType?: string;
    scrollDirection?: 'up' | 'down';
    rationale: string;
};

export async function verifyPlanMatch(
    plan: string,
    observation: string,
    elements: InteractableElement[],
    sessionState: SessionState,
    task: string,
    language: Language = 'de'
): Promise<VerificationResult> {
    console.log(`[VERIFY] Matching plan to observation...`);
    console.log(`[VERIFY] Plan: "${plan}"`);
    console.log(`[VERIFY] Elements available: ${elements.length}`);

    // CRITICAL FIX: Detect product links
    const productLinks = elements.filter(e =>
        e.role === 'link' &&
        e.priorityScore &&
        e.priorityScore >= 800
    );

    console.log(`[VERIFY] Product links found: ${productLinks.length}`);

    // CRITICAL FIX: If plan mentions product selection and we have products → FORCE CLICK
    const planLower = plan.toLowerCase();
    const wantsProduct = planLower.includes('produkt') || planLower.includes('product') ||
        planLower.includes('auswäh') || planLower.includes('select') ||
        planLower.includes('klick') || planLower.includes('click') ||
        planLower.includes('jeans') || planLower.includes('hose');

    if (wantsProduct && productLinks.length > 0) {
        console.log('[VERIFY] Plan wants product + products available → Forcing product click');

        // Select first product
        const selectedProduct = productLinks[0];

        return {
            match: true,
            confidence: 0.95,
            action: 'click',
            elementId: selectedProduct.id,
            rationale: language === 'de'
                ? `Produkt gefunden: "${selectedProduct.text.substring(0, 40)}". Klicke darauf.`
                : `Product found: "${selectedProduct.text.substring(0, 40)}". Clicking on it.`
        };
    }

    // Build element list for LLM
    const elementList = elements.slice(0, 15).map(e =>
        `[ID ${e.id}] ${e.role}: "${e.text.substring(0, 50)}" ${e.placeholder ? `(placeholder: "${e.placeholder}")` : ''} (priority: ${e.priorityScore || 0})`
    ).join('\n');

    const promptDE = `Du bist ein Verifikations-Agent. Deine Aufgabe ist es, einen Plan mit Observation + verfügbaren Elementen abzugleichen.

**Original Task:**
"${task}"

**Plan:**
"${plan}"

**Observation:**
"${observation}"

**Verfügbare Elemente:**
${elementList}

**WICHTIG - PRODUKT-PRIORISIERUNG:**
${productLinks.length > 0 ? `
🎯 **${productLinks.length} PRODUKTE VERFÜGBAR!**
Top 3:
${productLinks.slice(0, 3).map(p => `[ID ${p.id}] "${p.text.substring(0, 40)}"`).join('\n')}

➡️ **Wenn Plan Produktauswahl erwähnt: Klicke auf eins dieser Produkte!**
` : '⚠️ Keine Produkte gefunden (priority >= 800)'}

**Deine Entscheidung:**
1. **action:** "click" | "type" | "scroll" | "wait"
2. **elementId:** (nur für click/type, verwende ID aus Liste oben!)
3. **textToType:** (nur für type)
4. **scrollDirection:** "up" | "down" (nur für scroll)
5. **rationale:** Kurze Begründung (1 Satz)

**Regeln:**
- Wenn Plan "Produkt" erwähnt und Produkte da sind → action: "click" auf Produkt-ID
- Wenn Plan "scrollen" erwähnt → action: "scroll"
- Wenn Plan "Suchfeld" erwähnt → action: "click" auf Textbox, dann "type"
- KEINE Navigation-Links klicken (Mein Konto, Service, etc.)!

Antworte im JSON-Format:
{
  "action": "...",
  "elementId": ...,
  "textToType": "...",
  "scrollDirection": "...",
  "rationale": "..."
}`;

    const promptEN = `You are a verification agent. Your task is to match a plan with observation + available elements.

**Original Task:**
"${task}"

**Plan:**
"${plan}"

**Observation:**
"${observation}"

**Available Elements:**
${elementList}

**IMPORTANT - PRODUCT PRIORITIZATION:**
${productLinks.length > 0 ? `
🎯 **${productLinks.length} PRODUCTS AVAILABLE!**
Top 3:
${productLinks.slice(0, 3).map(p => `[ID ${p.id}] "${p.text.substring(0, 40)}"`).join('\n')}

➡️ **If plan mentions product selection: Click on one of these products!**
` : '⚠️ No products found (priority >= 800)'}

**Your Decision:**
1. **action:** "click" | "type" | "scroll" | "wait"
2. **elementId:** (only for click/type, use ID from list above!)
3. **textToType:** (only for type)
4. **scrollDirection:** "up" | "down" (only for scroll)
5. **rationale:** Brief reason (1 sentence)

**Rules:**
- If plan mentions "product" and products available → action: "click" on product ID
- If plan mentions "scroll" → action: "scroll"
- If plan mentions "search field" → action: "click" on textbox, then "type"
- DON'T click navigation links (My Account, Service, etc.)!

Respond in JSON format:
{
  "action": "...",
  "elementId": ...,
  "textToType": "...",
  "scrollDirection": "...",
  "rationale": "..."
}`;

    const prompt = language === 'de' ? promptDE : promptEN;

    try {
        // ⭐️ KORREKTUR: Kein 'json' format erzwingen, da unzuverlässig
        const response = await callOllama('llama3.2:latest', prompt, undefined, language, undefined);

        // ⭐️ KORREKTUR: JSON manuell aus der Antwort extrahieren
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch || !jsonMatch[0]) {
            // Wenn kein JSON, prüfen ob es eine einfache Aktion ist (z.B. "scroll")
            if (response.toLowerCase().includes('scroll')) {
                return {
                    match: true,
                    confidence: 0.6,
                    action: 'scroll',
                    scrollDirection: 'down',
                    rationale: `Fallback: KI hat 'scroll' vorgeschlagen. (${response})`
                };
            }
            throw new Error(`Ollama hat kein valides JSON zurückgegeben. Antwort: ${response.substring(0, 50)}...`);
        }

        const parsed = JSON.parse(jsonMatch[0]);
        // --- Ende der robusten JSON-Extraktion ---

        // CRITICAL FIX: If LLM selects wrong element type, override
        if (parsed.action === 'click' && parsed.elementId !== undefined) {
            const element = elements.find(e => e.id === parsed.elementId);

            // If LLM chose nav link but products available → override
            if (element && element.priorityScore && element.priorityScore < 500 && productLinks.length > 0) {
                console.warn(`[VERIFY] LLM chose low-priority element ${parsed.elementId}, overriding with product`);
                parsed.elementId = productLinks[0].id;
                parsed.rationale = language === 'de'
                    ? `Überschrieben: Produkt statt Navigation`
                    : `Overridden: Product instead of navigation`;
            }
        }

        // CRITICAL FIX: If no action but products available → scroll
        if (!parsed.action && productLinks.length === 0 && elements.length > 0) {
            console.log('[VERIFY] No clear action and no products → scroll');
            return {
                match: true,
                confidence: 0.7,
                action: 'scroll',
                scrollDirection: 'down',
                rationale: language === 'de'
                    ? 'Scrolle um mehr Produkte zu sehen'
                    : 'Scroll to see more products'
            };
        }

        return {
            match: true,
            confidence: 0.85,
            action: parsed.action || 'wait',
            elementId: parsed.elementId,
            textToType: parsed.textToType,
            scrollDirection: parsed.scrollDirection || 'down',
            rationale: parsed.rationale || (language === 'de' ? 'Nächster Schritt' : 'Next step')
        };
    } catch (error) {
        console.error('[VERIFY] Error:', error);

        // SMART FALLBACK: If products available → click first one
        if (productLinks.length > 0) {
            return {
                match: true,
                confidence: 0.8,
                action: 'click',
                elementId: productLinks[0].id,
                rationale: language === 'de'
                    ? `Fallback: Klicke auf erstes Produkt [ID ${productLinks[0].id}]`
                    : `Fallback: Click on first product [ID ${productLinks[0].id}]`
            };
        }

        // Otherwise scroll
        return {
            match: true,
            confidence: 0.5,
            action: 'scroll',
            scrollDirection: 'down',
            rationale: language === 'de' ? 'Fallback: Scroll' : 'Fallback: Scroll'
        };
    }
}