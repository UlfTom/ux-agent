// app/_lib/simulation/react-agent/plan.ts

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

    // 1. Generische URL-Analyse (Funktioniert für jede Domain)
    let urlObj;
    try {
        urlObj = new URL(currentUrl);
    } catch (e) {
        urlObj = { pathname: '/', search: '' };
    }

    // Startseite: Pfad ist leer oder nur '/'
    const isHomepage = urlObj.pathname === '/' || urlObj.pathname === '' || urlObj.pathname === '/index.html';

    // Suchergebnisse: Typische Indikatoren in URL
    const isSearchPage = currentUrl.includes('q=') ||
        currentUrl.includes('search') ||
        currentUrl.includes('suche') ||
        currentUrl.includes('query');

    // Kontext für die KI zusammenstellen
    const context = language === 'de' ? `
**Navigations-Kontext:**
- Aktuelle URL: ${currentUrl}
- Seitentyp (geschätzt): ${isHomepage ? 'STARTSEITE (Einstieg)' : isSearchPage ? 'SUCHERGEBNISSE / LISTE' : 'UNTERSEITE / DETAIL'}
- Letzte Aktion: ${sessionState.lastAction || 'Start der Session'}
- Suche bereits genutzt: ${sessionState.searchSubmitted ? 'JA' : 'NEIN'}
` : `
**Navigation Context:**
- Current URL: ${currentUrl}
- Page Type (estimated): ${isHomepage ? 'HOMEPAGE (Entry)' : isSearchPage ? 'SEARCH RESULTS / LIST' : 'SUBPAGE / DETAIL'}
- Last Action: ${sessionState.lastAction || 'Session Start'}
- Search used: ${sessionState.searchSubmitted ? 'YES' : 'NO'}
`;

    // 2. Generische Verhaltensregeln (Domain-Agnostisch)
    const strategyDE = `
**GENERISCHE NAVIGATIONS-STRATEGIE:**

Du bist ein universeller User-Agent. Du weißt NICHT, auf welcher Art von Website du bist (es könnte ein Shop, ein Jobportal, eine News-Seite oder ein Buchungstool sein).

**Deine Regeln für den nächsten Schritt:**

1. **Auf einer STARTSEITE:**
   - Orientierung ist das Ziel.
   - Wenn die Aufgabe spezifisch ist ("Finde X"), ist die **SUCHE** meist der beste Weg.
   - Wenn die Aufgabe offen ist ("Stöbere..."), nutze die **NAVIGATION** oder Kategorien.
   - Achte auf Popups (Cookies), die den Weg versperren.

2. **Auf einer LISTEN- / ERGEBNISSEITE:**
   - Scanne die Ergebnisse visuell.
   - Wenn Ergebnisse passen: Wähle das beste aus.
   - Wenn Ergebnisse unpassend sind: Nutze Filter oder verfeinere die Suche.
   - Wenn nichts sichtbar ist: Scrolle.

3. **Auf einer DETAILSEITE:**
   - Prüfe, ob dies das Ziel der Aufgabe erfüllt.
   - Führe die Ziel-Aktion aus (z.B. "Kaufen", "Bewerben", "Lesen", "Kontaktieren").

**Entscheide basierend auf deiner Persona ("${personaType}"):**
- Pragmatisch: Wählt den direktesten Weg (Suche).
- Explorativ: Klickt sich eher durch Menüs und Inspirationen.
- Vorsichtig: Liest Details genau, sucht nach Vertrauenssignalen.

Formuliere deinen nächsten Schritt kurz und präzise (ohne Annahmen über den Inhalt der Seite).
`;

    const prompt = `${personaPrompt}

**Task:** "${task}"

${context}

${strategyDE}

**Was ist dein nächster logischer Schritt?** (1 kurzer Satz)
Beispiele für gute, generische Pläne:
- "Suchfunktion nutzen um Ziel zu finden"
- "Liste durchgehen und passenden Eintrag wählen"
- "Nach unten scrollen um mehr Inhalte zu sehen"
- "Details prüfen und Aktion ausführen"

Dein Plan:`;

    try {
        const plan = await callOllama('mistral:latest', prompt, undefined, language); console.log(`[PLAN] Generated: "${plan}"`);
        return plan.trim();
    } catch (error) {
        console.error('[PLAN] Error:', error);
        return "Seite analysieren und Orientierung suchen"; // Fallback
    }
}