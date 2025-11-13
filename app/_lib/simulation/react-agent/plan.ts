// app/_lib/simulation/react-agent/plan.ts
// ⭐️ KORREKTE, SAUBERE VERSION ⭐️

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
    console.log(`[PLAN] Generiere generischen Plan für: ${currentUrl}`);

    // 1. Generische URL-Analyse
    let urlObj;
    try {
        urlObj = new URL(currentUrl);
    } catch (e) {
        urlObj = { pathname: '/', search: '' };
    }

    // Seitentyp bestimmen
    const isHomepage = urlObj.pathname === '/' || urlObj.pathname === '';
    const isSearchPage = sessionState.onSearchResults;
    const isProductPage = sessionState.onProductPage;

    // Kontext für die KI zusammenstellen
    const context = language === 'de' ? `
**Navigations-Kontext:**
- Aktuelle URL: ${currentUrl}
- Seitentyp (geschätzt): ${isProductPage ? 'DETAILSEITE' : isSearchPage ? 'LISTEN- / ERGEBNISSEITE' : 'STARTSEITE'}
- Letzte Aktion: ${sessionState.lastAction || 'Start der Session'}
- Suche bereits genutzt (Gedächtnis): ${sessionState.searchSubmitted ? 'JA' : 'NEIN'}
` : `
**Navigation Context:**
- Current URL: ${currentUrl}
- Page Type (estimated): ${isProductPage ? 'DETAIL PAGE' : isSearchPage ? 'LIST / RESULTS PAGE' : 'HOMEPAGE'}
- Last Action: ${sessionState.lastAction || 'Session Start'}
- Search used (Memory): ${sessionState.searchSubmitted ? 'YES' : 'NO'}
`;

    // 2. Generische Verhaltensregeln (Domain-Agnostisch)
    const strategyDE = `
**GENERISCHE NAVIGATIONS-STRATEGIE (Version 2.0):**

Du bist ein universeller User-Agent. Du weißt NICHT, auf welcher Art von Website du bist.

**Deine Regeln für den nächsten Schritt, basierend auf dem SEITENTYP:**

1. **Auf einer STARTSEITE:**
   - **Ziel:** Orientierung finden und die Aufgabe starten.
   - **Pragmatische Persona (Du):** Nutze die **SUCHFUNKTION**. Das ist fast immer der schnellste Weg.

2. **Auf einer LISTEN- / ERGEBNISSEITE (z.B. nach einer Suche):**
   - **Ziel:** Das beste Ergebnis anhand der Persona-Leitplanken finden.
   - **Aktion:** Scanne die sichtbaren Ergebnisse.
   - **Entscheidung:** "Passendes Produkt/Listing auswählen" (basierend auf Task und Persona).
   - **Fallback:** Wenn nichts passt oder du mehr Auswahl brauchst -> "scrollen".

3. **Auf einer DETAILSEITE (PDP / Job-Detail / Airbnb-Listing):**
   - **Ziel:** Prüfen, ob das Element die Aufgabe erfüllt, und die finale Aktion ausführen.
   - **Aktion:** Suche nach den "Leitplanken" (Preis, Größe, Standort, Bewertungen).
   - **Entscheidung:**
     - Wenn alles passt -> "In den Warenkorb legen", "Jetzt buchen", "Bewerben".
     - Wenn etwas fehlt -> "Größe 42 auswählen", "Datum auswählen".
     - Wenn es nicht passt -> "Zurück zu den Ergebnissen".

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
Beispiele für gute, generische Pläne:
- "Suchfunktion nutzen um Ziel zu finden"
- "Passendes Produkt aus der Liste auswählen"
- "Nach unten scrollen um mehr Inhalte zu sehen"
- "Produktdetails prüfen und in den Warenkorb legen"

Dein Plan:`;

    try {
        // HINWEIS: Hier ist kein `elementList`
        const plan = await callOllama('mistral:latest', prompt, undefined, language, undefined);
        console.log(`[PLAN] Generated: "${plan}"`);
        return plan.trim();
    } catch (error) {
        console.error('[PLAN] Error:', error);
        return "Seite analysieren und Orientierung suchen"; // Fallback
    }
}