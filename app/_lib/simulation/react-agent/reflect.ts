import { callLLM } from '../utils';
// KORREKTUR: 'SimulationState' entfernt, da es nicht existiert. Wir nutzen 'SessionState'.
import { SimulationResult, Language, SessionState } from '../types';

/**
 * Funktion 1: REFLECTION DURING RUN
 * Wird NACH jeder Aktion aufgerufen, damit der Agent kurz innehält und prüft:
 * "Hat das geklappt? Bin ich noch auf dem richtigen Weg?"
 */
export async function reflectOnProgress(
    plan: string,
    observation: string,
    executionResult: string,
    sessionState: SessionState, // Hier nutzen wir den korrekten Typ aus types.ts
    originalTask: string,
    stepNumber: number,
    language: Language = 'de'
): Promise<string> {
    console.log(`[REFLECT] Step ${stepNumber}: Reflecting on progress...`);

    // Kurzer Check, ob Produkte sichtbar sind (hilft dem LLM bei der Orientierung)
    const hasProducts = observation.includes('product') ||
        observation.includes('Produkt') ||
        observation.includes('🛍️') ||
        observation.includes('available');

    // Prompt für die Zwischen-Reflektion
    const prompt = `Du bist ein KI-Agent, der eine Website testet. Reflektiere kurz über deinen letzten Schritt.

    TASK: "${originalTask}"
    GEPLANTER SCHRITT: "${plan}"
    ERGEBNIS DER AKTION: "${executionResult}"
    BEOBACHTUNG NACH AKTION: "${observation}"
    
    CONTEXT:
    - Step: ${stepNumber}
    - Bereits gescrollt: ${sessionState.scrollCount || 0} mal
    - Produkte sichtbar: ${hasProducts ? 'JA' : 'NEIN'}

    BEWERTE:
    1. War die Aktion erfolgreich?
    2. Hat sich die Seite so verändert, wie erwartet?
    3. Was ist logischerweise der nächste Schritt? (Nur grob)
    
    Antworte extrem kurz (max. 2 Sätze). Kein JSON.`;

    try {
        // Wir nutzen hier das schnelle Modell (Mistral), da es nur ein Zwischengedanke ist
        const reflection = await callLLM('mistral:latest', prompt, undefined, language);
        return reflection.trim();
    } catch (e) {
        console.error("Reflect Error:", e);
        return "Konnte nicht reflektieren. Mache weiter.";
    }
}


/**
 * Funktion 2: FINAL ANALYSIS
 * Wird AM ENDE der kompletten Simulation aufgerufen.
 * Erstellt den UX-Score, die Friction Points und die Zusammenfassung.
 */
export async function analyzeSimulationResult(
    history: SessionState['actionHistory'], // Zugriff auf die History im State
    goal: string,
    isSuccess: boolean
): Promise<Pick<SimulationResult, 'summary' | 'frictionPoints' | 'uxScore'>> {

    // Wir bauen den Verlauf als lesbaren Text für das LLM zusammen
    const historyText = history
        .map((h, i) => `Step ${i + 1}: 
        - Plan: "${h.plan}"
        - Action: "${h.action}"
        - Result: "${h.result}"`)
        .join('\n\n');

    const prompt = `
    Du bist ein Senior UX Researcher. Analysiere diesen User-Test-Verlauf im Detail.
    
    ZIEL DES USERS: "${goal}"
    STATUS AM ENDE: ${isSuccess ? 'ERFOLGREICH' : 'ABGEBROCHEN / GESCHEITERT'}
    
    VERLAUF:
    ${historyText}
    
    DEINE AUFGABE:
    1. Bewerte die User Experience (UX Score 0-100).
       - 100 = Perfekter, glatter Durchlauf ohne Zögern.
       - < 50 = Schwere Probleme, Verwirrung, technische Fehler.
    2. Identifiziere "Friction Points" (Reibungspunkte).
       - Wo hat der User (Agent) gezögert?
       - Wo musste er suchen oder scrollen ohne Erfolg?
       - Wo hat er Dinge falsch interpretiert?
    3. Schreibe eine Management-Summary (max 3 Sätze).
    
    Antworte AUSSCHLIESSLICH als valides JSON in diesem Format:
    {
      "summary": "Der User fand das Produkt schnell, war aber beim Checkout durch das Cookie-Banner verwirrt.",
      "uxScore": 85,
      "frictionPoints": [
        { "step": 2, "description": "Suchergebnisseite wurde nicht sofort als solche erkannt.", "severity": "medium" }
      ]
    }
    `;

    try {
        // Hier nutzen wir JSON-Mode, damit wir das Ergebnis direkt im Frontend anzeigen können
        const response = await callLLM('mistral:latest', prompt, undefined, 'de', 'json');

        // Manchmal packen LLMs Markdown (```json ... ```) drumrum, das entfernen wir:
        const cleanJson = response.replace(/```json|```/g, '').trim();

        const data = JSON.parse(cleanJson);

        return {
            summary: data.summary || "Keine Zusammenfassung erstellt.",
            uxScore: typeof data.uxScore === 'number' ? data.uxScore : 50,
            frictionPoints: Array.isArray(data.frictionPoints) ? data.frictionPoints : []
        };

    } catch (e) {
        console.error("Analysis Failed:", e);
        // Fallback, falls das LLM Quatsch zurückgibt
        return {
            summary: `Simulation beendet. ${isSuccess ? 'Ziel erreicht.' : 'Ziel nicht erreicht.'} (Analyse fehlgeschlagen)`,
            frictionPoints: [],
            uxScore: isSuccess ? 70 : 30
        };
    }
}