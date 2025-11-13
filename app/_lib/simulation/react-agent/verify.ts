// app/_lib/simulation/react-agent/verify.ts
// ⭐️ KORREKTE, SAUBERE VERSION ⭐️

import { callOllama } from '../utils';
import { InteractableElement, SessionState, Language, PersonaType } from '../types';

export type VerificationResult = {
    match: boolean;
    confidence: number;
    action: 'click' | 'type' | 'scroll' | 'wait' | 'swipe' | 'longPress' | 'doubleTap';
    elementId?: number;
    textToType?: string;
    scrollDirection?: 'up' | 'down';
    rationale: string;
};

// Helfer-Funktion, um den reinen Suchbegriff zu extrahieren
async function extractSearchTerm(task: string, language: Language): Promise<string> {
    const prompt = language === 'de'
        ? `Extrahiere nur die 2-3 wichtigsten Suchbegriffe aus dieser Aufgabe: "${task}". Antworte nur mit den Begriffen. Beispiel: "Winter-Jeans Damen".`
        : `Extract just the 2-3 most important search keywords from this task: "${task}". Respond only with the keywords. Example: "Winter Jeans Women".`;

    return await callOllama('mistral:latest', prompt, undefined, language, undefined);
}

export async function verifyPlanMatch(
    plan: string,
    observation: string,
    elements: InteractableElement[],
    sessionState: SessionState,
    task: string,
    personaType: PersonaType,
    language: Language = 'de'
): Promise<VerificationResult> {
    console.log(`[VERIFY] Matching plan to observation...`);
    console.log(`[VERIFY] Plan: "${plan}"`);
    console.log(`[VERIFY] Search Submitted (Memory): ${sessionState.searchSubmitted}`);

    // ⭐️⭐️ GOLDENE REGEL (ROLLEN-BASIERT) ⭐️⭐️
    const planLower = plan.toLowerCase();
    const wantsSearch = planLower.includes('such') || planLower.includes('search');

    if (wantsSearch && elements.length > 0 && !sessionState.searchSubmitted) {
        const searchElement = elements.find(e => e.priorityScore && e.priorityScore >= 5000); // 5000 = Prio für Suchleisten

        if (searchElement) {
            console.log(`[VERIFY] ⭐️ Golden Rule: Plan will search, Search-Element [ID ${searchElement.id}] found!`);

            if (searchElement.role === 'textbox') {
                // FÜR OTTO/AMAZON: Direkte Eingabe
                const searchTerm = await extractSearchTerm(task, language);
                console.log(`[VERIFY] Element is 'textbox'. Typing: "${searchTerm}"`);
                return {
                    match: true, confidence: 1.0, action: 'type',
                    elementId: searchElement.id,
                    textToType: searchTerm,
                    rationale: `Heuristik: Plan will suchen, Element ist Textbox. Führe 'type' aus mit: "${searchTerm}".`
                };
            } else {
                // FÜR AIRBNB: Zuerst klicken, um Suche zu öffnen
                console.log(`[VERIFY] Element is '${searchElement.role}'. Clicking to open search.`);
                return {
                    match: true, confidence: 1.0, action: 'click',
                    elementId: searchElement.id,
                    rationale: `Heuristik: Plan will suchen, Element ist Klick-basiert ('${searchElement.role}'). Führe 'click' aus.`
                };
            }
        }
    }
    // ⭐️⭐️ ENDE GOLDENE REGEL ⭐️⭐️

    console.log(`[VERIFY] Golden Rule not applied. Using LLM for verification...`);

    const productLinks = elements.filter(e => e.priorityScore && e.priorityScore >= 6000); // 6000 = Prio für Produkte
    console.log(`[VERIFY] Product links found: ${productLinks.length}`);

    const elementList = elements.slice(0, 15).map(e =>
        `[ID ${e.id}] ${e.role}: "${e.text.substring(0, 50)}" (priority: ${e.priorityScore || 0})`
    ).join('\n');

    const promptDE = `Du bist ein Verifikations-Agent.

**DEINE PERSONA (DEINE LEITPLANKEN):**
- Archetyp: ${personaType}
- Zielorientierung: HOCH (Fokussiert auf die Aufgabe)
- Sensibilität: HOCH (Achtet auf Preis, Aufwand, Relevanz)

**Original Task:**
"${task}"

**Aktueller Status (vom System):**
- Plan: "${plan}"
- Search Submitted (Gedächtnis): ${sessionState.searchSubmitted}
- Auf Ergebnisseite: ${sessionState.onSearchResults}
- Auf Detailseite: ${sessionState.onProductPage}

**Observation (Was die KI sieht):**
"${observation}"

**Verfügbare Elemente (Code-Analyse):**
${elementList}

${productLinks.length > 0 ? `
🎯 **${productLinks.length} PRODUKTE/LISTINGS VERFÜGBAR!** (Priorität >= 6000)
Top 3:
${productLinks.slice(0, 3).map(p => `[ID ${p.id}] "${p.text.substring(0, 40)}"`).join('\n')}
` : '⚠️ Keine Produkte/Listings mit hoher Priorität gefunden.'}

**Deine Entscheidung (Antworte NUR mit JSON):**
{
  "action": "click" | "type" | "scroll" | "wait",
  "elementId": <id>,
  "textToType": "<text>",
  "scrollDirection": "up" | "down",
  "rationale": "..."
}

**WICHTIGE GENERISCHE REGELN:**

1.  **GEDÄCHTNIS:**
    - Wenn 'Search Submitted' **true** ist, ist \`action: "type"\` auf [ID 0] (Suchfeld) **VERBOTEN**.
    - Wähle stattdessen \`click\` (auf ein Produkt/Filter) oder \`scroll\`.

2.  **LEITPLANKEN (AUSWAHL):**
    - Wenn 'Auf Ergebnisseite' **true** ist, wähle das Produkt [ID X], das am besten zu Task UND Persona passt.
    - FÜR TASK "Winter-Jeans": Ein Produkt mit "Thermo" oder "Gefüttert" ist besser als "Skinny Jeans".
    - FÜR PERSONA "Preissensibel": Ein günstigeres Produkt ist besser als ein teures.
    - Begründe deine Wahl in "rationale".

3.  **KONTEXT (INTERAKTION):**
    - FÜR TASK "Unterkunft für Silvester": Die Aufgabe erfordert einen ORT (z.B. "Berlin") und ein DATUM ("Silvester").
    - Wenn der Plan "Suchen" ist, aber das Element [ID 0] ein Button "Wohin?" ist, ist die korrekte Aktion \`click\` auf [ID 0].
    - Wenn die Suche bereits erfolgt ist, ist der nächste logische Schritt \`click\` auf "Check-in" oder "Datum".
    
4.  **ZIEL (DETAILSEITE):**
    - Wenn 'Auf Detailseite' **true** ist, suche nach Aktionen wie "In den Warenkorb", "Buchen", "Größe auswählen" oder "Datum auswählen".
`;

    const prompt = promptDE;

    try {
        const response = await callOllama('llama3.2:latest', prompt, undefined, language, undefined);

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch || !jsonMatch[0]) {
            if (response.toLowerCase().includes('scroll')) {
                return { match: true, confidence: 0.6, action: 'scroll', scrollDirection: 'down', rationale: `Fallback: KI hat 'scroll' vorgeschlagen. (${response})` };
            }
            throw new Error(`Ollama hat kein valides JSON zurückgegeben. Antwort: ${response.substring(0, 50)}...`);
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonMatch[0]);
        } catch (e: any) {
            throw new Error(`Ollama gab kaputtes JSON zurück: ${e.message}. Antwort: ${jsonMatch[0]}`);
        }

        if (parsed.elementId && typeof parsed.elementId !== 'number') {
            console.warn(`[VERIFY] KI gab ungültige elementId zurück: "${parsed.elementId}". Versuche, Zahl zu parsen...`);
            parsed.elementId = parseInt(String(parsed.elementId).replace(/[^0-9]/g, ''), 10);
            if (isNaN(parsed.elementId)) {
                // Fallback, wenn ID komplett unbrauchbar ist
                console.warn(`[VERIFY] Konnte ID nicht parsen, erzwinge Scroll.`);
                return { match: false, confidence: 0.3, action: 'scroll', scrollDirection: 'down', rationale: "KI gab unbrauchbare ID zurück." };
            }
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
    } catch (error: any) {
        console.error('[VERIFY] Error:', error.message);

        // Fallback: scrollen
        return {
            match: true,
            confidence: 0.5,
            action: 'scroll',
            scrollDirection: 'down',
            rationale: language === 'de' ? 'Fallback: Scroll nach KI-Fehler' : 'Fallback: Scroll after AI error'
        };
    }
}