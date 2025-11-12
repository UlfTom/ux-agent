// app/_lib/simulation/react-agent/plan.ts
// FIX: Product selection awareness

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
    console.log(`[PLAN] Creating plan for URL: ${currentUrl}`);
    console.log(`[PLAN] Session state:`, {
        searchSubmitted: sessionState.searchSubmitted,
        onSearchResults: sessionState.onSearchResults,
        onProductPage: sessionState.onProductPage
    });

    // CRITICAL FIX: Detect what phase we're in
    const isOnSearchResults = currentUrl.includes('/suche/') || currentUrl.includes('/search/');
    const isOnProductPage = currentUrl.includes('/p/') || currentUrl.includes('/produkt/');
    const isHomepage = currentUrl === 'https://www.otto.de' || currentUrl === 'https://www.otto.de/';

    const contextDE = `
**Aktueller Stand:**
- URL: ${currentUrl}
- Auf Startseite: ${isHomepage ? 'JA' : 'NEIN'}
- Auf Suchergebnisseite: ${isOnSearchResults ? 'JA' : 'NEIN'}
- Auf Produktseite: ${isOnProductPage ? 'JA' : 'NEIN'}
- Suche abgeschickt: ${sessionState.searchSubmitted ? 'JA' : 'NEIN'}
- Letzte Aktion: ${sessionState.lastAction || 'keine'}
`;

    const contextEN = `
**Current Status:**
- URL: ${currentUrl}
- On homepage: ${isHomepage ? 'YES' : 'NO'}
- On search results: ${isOnSearchResults ? 'YES' : 'NO'}
- On product page: ${isOnProductPage ? 'YES' : 'NO'}
- Search submitted: ${sessionState.searchSubmitted ? 'YES' : 'NO'}
- Last action: ${sessionState.lastAction || 'none'}
`;

    const promptDE = `${personaPrompt}

**Deine Aufgabe:**
"${task}"

${contextDE}

**WICHTIG - PRODUKT-AUSWAHLLOGIK:**

Wenn du auf der Suchergebnisseite bist:
1. **ERSTE PRIORITÄT:** Schaue dir die Produkte an (scroll wenn nötig)
2. **ZWEITE PRIORITÄT:** Wähle EIN Produkt aus das dir gefällt
3. **DRITTE PRIORITÄT:** Klicke darauf um Details zu sehen

**Entscheidungskriterien für Produktauswahl:**
- ${personaType === 'Pragmatisch & Zielorientiert' ? 'Preis-Leistung, gute Bewertungen, schneller Versand' : ''}
- ${personaType === 'Explorativ & Neugierig' ? 'Ausgefallenes Design, neue Marken, interessante Features' : ''}
- ${personaType === 'Vorsichtig & Skeptisch' ? 'Bekannte Marken, viele Bewertungen, detaillierte Infos' : ''}
- Passt das Produkt zur Aufgabe? (z.B. "Winter-Jeans" → warm, gefüttert)

**Wenn KEINE Produkte passen:**
- Sage klar: "Keines der Produkte passt, weil [Grund]"
- Überlege Filter anzuwenden (Größe, Preis, Farbe)

**Was ist dein nächster konkreter Schritt?** (1 kurzer Satz, max 10 Worte)
Beispiele:
- "Produkte anschauen"
- "Blaue Jeans in Position 2 auswählen"
- "Nach unten scrollen für mehr Produkte"
- "Auf Winter-Jeans mit Fleecefutter klicken"
- "Keine passende Hose, Filter öffnen"

Dein Plan:`;

    const promptEN = `${personaPrompt}

**Your Task:**
"${task}"

${contextEN}

**IMPORTANT - PRODUCT SELECTION LOGIC:**

When on search results page:
1. **FIRST PRIORITY:** Look at the products (scroll if needed)
2. **SECOND PRIORITY:** Choose ONE product you like
3. **THIRD PRIORITY:** Click on it to see details

**Decision criteria for product selection:**
- ${personaType === 'Pragmatisch & Zielorientiert' ? 'Price-value, good reviews, fast shipping' : ''}
- ${personaType === 'Explorativ & Neugierig' ? 'Unique design, new brands, interesting features' : ''}
- ${personaType === 'Vorsichtig & Skeptisch' ? 'Known brands, many reviews, detailed info' : ''}
- Does the product fit the task? (e.g. "winter jeans" → warm, lined)

**If NO products fit:**
- Say clearly: "None of the products fit because [reason]"
- Consider applying filters (size, price, color)

**What is your next concrete step?** (1 short sentence, max 10 words)
Examples:
- "Look at products"
- "Select blue jeans in position 2"
- "Scroll down for more products"
- "Click on winter jeans with fleece lining"
- "No suitable pants, open filter"

Your plan:`;

    const prompt = language === 'de' ? promptDE : promptEN;

    try {
        let plan = await callOllama('llama3.2:latest', prompt, 'text');

        // CRITICAL FIX: If on search results and plan is vague, make it specific
        if (isOnSearchResults && (
            plan.toLowerCase().includes('suche') ||
            plan.toLowerCase().includes('search') ||
            plan.length < 15
        )) {
            console.warn('[PLAN] Plan too vague on search results, forcing product focus');
            plan = language === 'de'
                ? 'Produkte anschauen und passendes auswählen'
                : 'Look at products and select suitable one';
        }

        console.log(`[PLAN] Generated: "${plan}"`);
        return plan.trim();
    } catch (error) {
        console.error('[PLAN] Error:', error);

        // SMART FALLBACK based on context
        if (isHomepage && !sessionState.searchSubmitted) {
            return language === 'de' ? 'Suchfeld nutzen' : 'Use search field';
        } else if (isOnSearchResults) {
            return language === 'de' ? 'Produkt auswählen' : 'Select product';
        } else if (isOnProductPage) {
            return language === 'de' ? 'Produktdetails ansehen' : 'View product details';
        } else {
            return language === 'de' ? 'Nächsten Schritt planen' : 'Plan next step';
        }
    }
}