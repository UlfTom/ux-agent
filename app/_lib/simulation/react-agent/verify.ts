// app/_lib/simulation/react-agent/verify.ts
// ⭐️ NEUE VERSION MIT "GOLDENER REGEL" FÜR DIE SUCHE ⭐️

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

// ⭐️ NEU: Helfer-Funktion, um den reinen Suchbegriff zu extrahieren
async function extractSearchTerm(task: string, language: Language): Promise<string> {
    const prompt = language === 'de'
        ? `Extrahiere nur die 2-3 wichtigsten Suchbegriffe aus dieser Aufgabe: "${task}". Antworte nur mit den Begriffen. Beispiel: "Winter-Jeans Damen".`
        : `Extract just the 2-3 most important search keywords from this task: "${task}". Respond only with the keywords. Example: "Winter Jeans Women".`;

    // Nimm Mistral, das ist schnell für Text-Extraktion
    return await callOllama('mistral:latest', prompt, undefined, language, undefined);
}

export async function verifyPlanMatch(
    plan: string,
    observation: string,
    elements: InteractableElement[],
    sessionState: SessionState,
    task: string,
    personaType: PersonaType, // ⭐️ HIER HINZUGEFÜGT
    language: Language = 'de'
): Promise<VerificationResult> {
    console.log(`[VERIFY] Matching plan to observation...`);
    console.log(`[VERIFY] Plan: "${plan}"`);

    // ⭐️⭐️ GOLDENE REGEL (JETZT ROLLEN-BASIERT) ⭐️⭐️
    const planLower = plan.toLowerCase();
    const wantsSearch = planLower.includes('such') || planLower.includes('search');

    if (wantsSearch && elements.length > 0 && !sessionState.searchSubmitted) {
        const searchBox = elements.find(e => e.priorityScore && e.priorityScore >= 5000); // 5000 = Prio für Suchleisten

        if (searchBox) {
            console.log(`[VERIFY] ⭐️ Golden Rule: Plan will search, Search-Element [ID ${searchBox.id}] found!`);

            // ⭐️ FIX: Prüfe die ROLLE des Such-Elements
            if (searchBox.role === 'textbox') {
                // FÜR OTTO/AMAZON: Direkte Eingabe
                const searchTerm = await extractSearchTerm(task, language);
                console.log(`[VERIFY] Element is 'textbox'. Typing: "${searchTerm}"`);
                return {
                    match: true, confidence: 1.0, action: 'type',
                    elementId: searchBox.id,
                    textToType: searchTerm,
                    rationale: `Heuristik: Plan will suchen, Element ist Textbox. Führe 'type' aus mit: "${searchTerm}".`
                };
            } else {
                // FÜR AIRBNB: Zuerst klicken, um Suche zu öffnen
                console.log(`[VERIFY] Element is '${searchBox.role}'. Clicking to open search.`);
                return {
                    match: true, confidence: 1.0, action: 'click',
                    elementId: searchBox.id,
                    rationale: `Heuristik: Plan will suchen, Element ist Klick-basiert ('${searchBox.role}'). Führe 'click' aus.`
                };
            }
        }
    }
    // ⭐️⭐️ ENDE GOLDENE REGEL ⭐️⭐️


    // Wenn die goldene Regel nicht greift, fahre mit der KI-Logik fort
    console.log(`[VERIFY] Golden Rule not applied. Using LLM for verification...`);
    console.log(`[VERIFY] Elements available: ${elements.length}`);

    const productLinks = elements.filter(e => e.priorityScore && e.priorityScore >= 800);
    console.log(`[VERIFY] Product links found: ${productLinks.length}`);

    // (Dein Code für die Produkt-Klick-Logik, falls vorhanden, kann hier bleiben)
    // ...

    // Build element list for LLM
    const elementList = elements.slice(0, 15).map(e =>
        `[ID ${e.id}] ${e.role}: "${e.text.substring(0, 50)}" ${e.placeholder ? `(placeholder: "${e.placeholder}")` : ''} (priority: ${e.priorityScore || 0})`
    ).join('\n');

    const promptDE = `Du bist ein Verifikations-Agent. Deine Aufgabe ist es, einen Plan mit Observation + verfügbaren Elementen abzugleichen.

**DEINE PERSONA (DEINE LEITPLANKEN):**
- Archetyp: ${personaType}
- Zielorientierung: HOCH (Fokussiert auf die Aufgabe)
- Entdeckergeist: NIEDRIG (Ignoriert Werbung/Ablenkungen)
- Sensibilität: HOCH (Achtet auf Preis, Aufwand, unklare Schritte)

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

**Regeln (WICHTIG!):**
- **PASST DAS ELEMENT ZUM PLAN UND ZUR PERSONA?**
- Wenn Plan "Produkt auswählen": Wähle das Produkt, das am besten zu Task UND Persona passt (z.B. günstig, gute Bewertung).
- Wenn Plan "scrollen" erwähnt → action: "scroll"
- KEINE Navigation-Links klicken (Mein Konto, Service, etc.), außer sie sind Teil des Plans.

Antworte NUR im JSON-Format:
{
  "action": "...",
  "elementId": ...,
  "textToType": "...",
  "scrollDirection": "...",
  "rationale": "..." // Begründe, warum dieses Element zur Persona passt!
}`;

    // (Hier käme der promptEN, falls benötigt)
    const prompt = promptDE;

    try {
        // ⭐️ KORREKTUR: Kein 'json' format erzwingen
        const response = await callOllama('llama3.2:latest', prompt, undefined, language, undefined);

        // ⭐️ KORREKTUR: JSON manuell aus der Antwort extrahieren
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch || !jsonMatch[0]) {
            // Wenn kein JSON, prüfen ob es eine einfache Aktion ist
            if (response.toLowerCase().includes('scroll')) {
                return {
                    match: true, confidence: 0.6, action: 'scroll',
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
    } catch (error: any) {
        console.error('[VERIFY] Error:', error.message);

        // SMART FALLBACK: Wenn Plan Suche wollte, aber KI versagte, nimm Element 0
        if (wantsSearch && elements.length > 0 && elements[0].role === 'textbox' && !sessionState.searchSubmitted) {
            console.warn(`[VERIFY] Fallback: KI-Verifizierung fehlgeschlagen, nutze Fallback-Regel für Suche.`);
            return {
                match: true,
                confidence: 0.6,
                action: 'type',
                elementId: elements[0].id,
                textToType: task,
                rationale: "Fallback: KI-Fehler, aber Plan will Suche und Element 0 ist Textbox."
            };
        }

        // Sonst scrollen
        return {
            match: true,
            confidence: 0.5,
            action: 'scroll',
            scrollDirection: 'down',
            rationale: language === 'de' ? 'Fallback: Scroll nach KI-Fehler' : 'Fallback: Scroll after AI error'
        };
    }
}