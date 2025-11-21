// app/_lib/simulation/react-agent/verify.ts
// ⭐️ NEUE GENERISCHE VERSION (OHNE GOLDENE REGEL) ⭐️

import { callLLM } from '../utils';
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

    return await callLLM('mistral:latest', prompt, undefined, language, undefined);
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

    console.log(`[VERIFY] Generische Verifizierung. Plan: "${plan}"`);
    console.log(`[VERIFY] Kontext: SearchSubmitted=${sessionState.searchSubmitted}, OnResults=${sessionState.onSearchResults}, OnPDP=${sessionState.onProductPage}`);

    // ⭐️ GOLDENE REGEL WURDE ENTFERNT, WIR VERTRAUEN DER KI ⭐️
    // (Die "Goldene Regel" war der Grund für den Airbnb-Fehler in Debug 57/59)

    const productLinks = elements.filter(e => e.priorityScore && e.priorityScore >= 6000); // 6000 = Prio für Produkte
    console.log(`[VERIFY] Produkt-Links mit Prio >= 6000 gefunden: ${productLinks.length}`);

    const elementList = elements.slice(0, 30).map(e => // ⭐️ Sende mehr Elemente (Top 30)
        `[ID ${e.id}] ${e.role}: "${e.text.substring(0, 50)}" (priority: ${e.priorityScore || 0})`
    ).join('\n');

    // ⭐️ FIX (LEITPLANKEN & GENERISCH): Persona-Typ wird in den Prompt injiziert
    const promptDE = `Du bist ein Verifikations-Agent.

**DEINE PERSONA (DEINE LEITPLANKEN):**
- Archetyp: ${personaType}
- Zielorientierung: HOCH (Fokussiert auf die Aufgabe)
- Sensibilität: HOCH (Achtet auf Preis, Aufwand, Relevanz)

**Original Task:**
"${task}"

**Aktueller Status (vom System):**
- Plan: "${plan}"
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
  "textToType": "<text>", // NUR wenn action 'type' ist!
  "scrollDirection": "up" | "down",
  "rationale": "..." // WICHTIG: Begründe, warum dieses Element zur Persona (Preis, Relevanz) und Task passt!
}

**WICHTIGE GENERISCHE REGELN:**

1.  **KONTEXT (STARTSEITE):**
    - Wenn 'Auf Ergebnisseite' **false** UND 'Auf Detailseite' **false** ist:
    - Finde das Such-Element (z.B. [ID 0] "Wonach suchst du?").
    - **REGEL (OTTO):** Wenn es eine \`textbox\` ist -> \`action: "type"\`, \`textToType: "..."\` (extrahiere Begriffe aus Task).
    - **REGEL (AIRBNB):** Wenn es ein \`button\` "Wohin?" ist -> \`action: "click"\` auf [ID 0] "Wohin?".
    - **REGEL (AIRBNB DATUM):** Wenn die Aufgabe "Silvester" enthält, ist nach dem Klick auf "Wohin?" der nächste Schritt \`click\` auf "Check-in" oder "Datum".

2.  **KONTEXT (ERGEBNISSEITE):**
    - Wenn 'Auf Ergebnisseite' **true** ist:
    - **GEBOT:** \`action: "click"\` auf das beste Produkt-Link [ID X] (Priorität >= 6000), das zu Task UND Persona passt.
    - (z.B. Für "Winter-Jeans" ist "Thermo" oder "Gefüttert" besser als "Skinny").
    - (Fallback: \`action: "scroll"\` wenn nichts passt).

3.  **KONTEXT (DETAILSEITE/PDP):**
    - Wenn 'Auf Detailseite' **true** ist:
    - **GEBOT:** Finde und klicke auf die logische nächste Aktion (z.B. "In den Warenkorb", "Größe auswählen", "Jetzt buchen").
`;

    const prompt = promptDE;

    try {
        const response = await callLLM('llama3.2:latest', prompt, undefined, language, undefined);

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
                console.warn(`[VERIFY] Konnte ID nicht parsen, erzwinge Scroll.`);
                return { match: false, confidence: 0.3, action: 'scroll', scrollDirection: 'down', rationale: "KI gab unbrauchbare ID zurück." };
            }
        }

        // ⭐️ WICHTIG: Wenn die KI 'type' wählt, extrahiere den Suchbegriff
        if (parsed.action === 'type' && !parsed.textToType && !sessionState.searchSubmitted) {
            parsed.textToType = await extractSearchTerm(task, language);
            parsed.rationale += ` (Suchbegriff extrahiert: "${parsed.textToType}")`;
            // Setze Gedächtnis HIER, da die Aktion bestätigt ist
            sessionState.searchSubmitted = true;
            console.log(`[VERIFY] 🧠 Gedächtnis: Suche wird abgeschickt.`);
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
        return {
            match: true, confidence: 0.5, action: 'scroll',
            scrollDirection: 'down',
            rationale: language === 'de' ? 'Fallback: Scroll nach KI-Fehler' : 'Fallback: Scroll after AI error'
        };
    }
}