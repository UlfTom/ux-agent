// app/_lib/simulation/react-agent/plan.ts
// ⭐️ NEUE VERSION (GENERISCH & KONTEXTBEWUSST) ⭐️

import { callOllama } from '../utils';
import { SessionState, PersonaType, Language } from '../types';

export async function getPlan(
    task: string,
    personaPrompt: string,
    personaType: PersonaType,
    sessionState: SessionState,
    currentUrl: string,
    language: Language = 'de'
): Promise<string> {
    console.log(`[PLAN] Generiere Plan. Kontext: onPDP=${sessionState.onProductPage}, onResults=${sessionState.onSearchResults}`);

    // 1. Kontext für die KI zusammenstellen
    const context = language === 'de' ? `
**Navigations-Kontext:**
- Aktuelle URL: ${currentUrl}
- Auf Startseite: ${!sessionState.onSearchResults && !sessionState.onProductPage}
- Auf Ergebnisseite: ${sessionState.onSearchResults}
- Auf Detailseite: ${sessionState.onProductPage}
- Letzte Aktion: ${sessionState.lastAction || 'Start der Session'}
` : `
**Navigation Context:**
- Current URL: ${currentUrl}
- On Homepage: ${!sessionState.onSearchResults && !sessionState.onProductPage}
- On Search Results: ${sessionState.onSearchResults}
- On Detail Page: ${sessionState.onProductPage}
- Last Action: ${sessionState.lastAction || 'Session Start'}
`;

    // 2. Generische Verhaltensregeln (Domain-Agnostisch)
    const strategyDE = `
**GENERISCHE NAVIGATIONS-STRATEGIE (Version 2.0):**

Du bist ein universeller User-Agent. Du weißt NICHT, auf welcher Art von Website du bist.

**Deine Regeln für den nächsten Schritt, basierend auf dem SEITENTYP:**

1. **Wenn 'Auf Startseite' true ist:**
   - **Ziel:** Die Aufgabe starten.
   - **Pragmatische Persona (Du):** Nutze die **SUCHFUNKTION**.
   - **Plan-Beispiel:** "Suchfunktion nutzen, um [Task] zu finden."

2. **Wenn 'Auf Ergebnisseite' true ist:**
   - **Ziel:** Das beste Ergebnis anhand der Persona-Leitplanken finden.
   - **Aktion:** Scanne die sichtbaren Ergebnisse.
   - **Entscheidung:** "Passendes Produkt/Listing auswählen."
   - **Fallback:** Wenn nichts passt -> "scrollen".

3. **Wenn 'Auf Detailseite' true ist:**
   - **Ziel:** Die Aufgabe abschließen (Kauf/Buchung).
   - **Aktion:** Suche nach den finalen Aktions-Buttons.
   - **Entscheidung:**
     - **Plan-Beispiel:** "Produkt in den Warenkorb legen."
     - **Plan-Beispiel:** "Größe oder Option auswählen."
     - **Plan-Beispiel:** "Buchung abschließen" oder "Datum auswählen."
     - (Wenn es nicht passt -> "Zurück zu den Ergebnissen".)

**Entscheide basierend auf deiner Persona ("${personaType}"):**
- Pragmatisch: Wählt den direktesten Weg.
- Vorsichtig: Scrollt vielleicht erst, liest Bewertungen, bevor er klickt.

Formuliere deinen nächsten Schritt kurz und präzise.
`;

    const prompt = `${personaPrompt}

**Task:** "${task}"

${context}

${strategyDE}

**Was ist dein nächster logischer Schritt?** (1 kurzer Satz)
Dein Plan:`;

    try {
        const plan = await callOllama('mistral:latest', prompt, undefined, language, undefined);
        console.log(`[PLAN] Generated: "${plan}"`);
        // Letzte Aktion für den nächsten Plan-Schritt speichern
        sessionState.lastAction = plan;
        return plan.trim();
    } catch (error) {
        console.error('[PLAN] Error:', error);
        sessionState.lastAction = "Error";
        return "Seite analysieren und Orientierung suchen"; // Fallback
    }
}