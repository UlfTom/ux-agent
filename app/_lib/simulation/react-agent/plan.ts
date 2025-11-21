// app/_lib/simulation/react-agent/plan.ts
// ⭐️ KORRIGIERTE VERSION: Mit SimulationMode Parameter & Import ⭐️

import { callLLM } from '../utils';
// FIX 1: SimulationMode importieren
import { SessionState, PersonaType, Language, SimulationMode } from '../types';

export async function getPlan(
    task: string,
    personaPrompt: string,
    personaType: PersonaType,
    sessionState: SessionState,
    currentUrl: string,
    language: Language = 'de',
    // FIX 2: Parameter hinzufügen (optional mit default)
    simulationMode: SimulationMode = 'default'
): Promise<string> {
    console.log(`[PLAN] Generiere Plan. Mode=${simulationMode} | Context: PDP=${sessionState.onProductPage}, Results=${sessionState.onSearchResults}`);

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
   - **Fallback:** Wenn nichts passt oder du mehr Auswahl brauchst -> "scrollen".

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
- **Verhalte dich menschlich:** "Ich schaue mir erst die Bilder an" oder "Ich lese die Beschreibung".
   - Wenn das Produkt nicht passt: "Zurück zur Suche".
   - Wenn es passt: "In den Warenkorb"/"Buchen"/...

Formuliere deinen nächsten Schritt kurz und präzise.
`;

    // 3. Accessibility-Strategie (Barrierefreiheit)
    let accessibilityInstruction = "";

    if (simulationMode === 'motor_keyboard') {
        accessibilityInstruction = `
    ⚠️ WICHTIG - MOTORISCHE EINSCHRÄNKUNG:
    Du kannst KEINE Maus benutzen. 
    Du darfst nur Elemente klicken, die per Tastatur (Tab/Enter) erreichbar wirken.
    Wenn ein Element wie ein Button aussieht, aber im Code nicht als solcher markiert ist, kannst du es NICHT nutzen.
    `;
    }

    if (simulationMode === 'cognitive_distracted') {
        accessibilityInstruction = `
    ⚠️ WICHTIG - KOGNITIVE EINSCHRÄNKUNG:
    Du bist sehr leicht ablenkbar und verstehst komplexe Texte schwer.
    - Wenn zu viele Pop-ups kommen, brich ab oder klicke das Falsche.
    - Wenn Texte lang sind, lies sie nicht.
    - Suche nach den einfachsten, größten Buttons.
    `;
    }

    if (simulationMode === 'elderly_user') {
        accessibilityInstruction = `
    ⚠️ WICHTIG - SENIOR USER:
    Du siehst schlecht und bist technisch unsicher.
    - Klicke nur auf Dinge, die GROSS und DEUTLICH lesbar sind.
    - Wenn du ein Cookie-Banner siehst, stimme sofort allem zu, um es loszuwerden.
    `;
    }

    const prompt = `${personaPrompt}
${accessibilityInstruction}
**Task:** "${task}"
${context}
${strategyDE}

**Was ist dein nächster logischer Schritt?** (1 kurzer Satz)
Dein Plan:`;

    try {
        const plan = await callLLM('mistral:latest', prompt, undefined, language, undefined);
        console.log(`[PLAN] Generated: "${plan}"`);
        sessionState.lastAction = plan;
        return plan.trim();
    } catch (error) {
        console.error('[PLAN] Error:', error);
        sessionState.lastAction = "Error";
        return "Seite analysieren und Orientierung suchen";
    }
}