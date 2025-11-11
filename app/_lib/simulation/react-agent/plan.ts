// app/_lib/simulation/react-agent/plan.ts

import { SessionState, Language, PersonaType } from '../types';
import { callOllama } from '../utils';

function getPersonaBehaviorHint(personaType: PersonaType, sessionState: SessionState, language: Language): string {
    if (personaType.includes('Pragmatisch') || personaType.includes('Pragmatic')) {
        return language === 'de'
            ? `
**DEIN CHARAKTER (Pragmatisch):**
- Du bist EFFIZIENT und UNGEDULDIG
- Du nutzt SOFORT die Suche wenn verfügbar
- ${sessionState.seenSearchField ? '⚠️ Du erinnerst dich: SUCHFELD IST OBEN!' : ''}
- Du scrollst nur wenn absolut nötig
- Du gehst direkt zum Ziel
`
            : `
**YOUR CHARACTER (Pragmatic):**
- You are EFFICIENT and IMPATIENT
- You use search IMMEDIATELY when available
- ${sessionState.seenSearchField ? '⚠️ You remember: SEARCH FIELD IS AT TOP!' : ''}
- You scroll only if absolutely necessary
- You go straight to the goal
`;
    } else if (personaType.includes('Explorativ') || personaType.includes('Exploratory')) {
        return language === 'de'
            ? `
**DEIN CHARAKTER (Explorativ):**
- Du bist NEUGIERIG und GEDULDIG
- Du scrollst ERSTMAL um dir einen Überblick zu verschaffen
- Nach 2-3 Scrolls: Dann nutzt du die Suche
- ${sessionState.seenSearchField ? 'Du erinnerst dich: Suchfeld war oben' : ''}
- Du entdeckst gerne
`
            : `
**YOUR CHARACTER (Exploratory):**
- You are CURIOUS and PATIENT
- You scroll FIRST to get an overview
- After 2-3 scrolls: Then you use search
- ${sessionState.seenSearchField ? 'You remember: Search field was at top' : ''}
- You like to discover
`;
    } else {
        return language === 'de'
            ? `
**DEIN CHARAKTER (Vorsichtig):**
- Du bist SKEPTISCH und ÜBERLEGTSAM
- Du liest Beschreibungen genau
- Du überprüfst bevor du klickst
- ${sessionState.seenSearchField ? 'Du erinnerst dich: Suchfeld war oben' : ''}
`
            : `
**YOUR CHARACTER (Cautious):**
- You are SKEPTICAL and THOUGHTFUL
- You read descriptions carefully
- You verify before you click
- ${sessionState.seenSearchField ? 'You remember: Search field was at top' : ''}
`;
    }
}

export async function getPlan(
    task: string,
    personaPrompt: string,
    personaType: PersonaType,
    sessionState: SessionState,
    currentUrl: string,
    language: Language = 'de'
): Promise<string> {
    const recentHistory = sessionState.actionHistory.slice(-3);
    const historyText = recentHistory.length > 0
        ? recentHistory.map(h => `- ${h.plan} → ${h.action} → ${h.result}`).join('\n')
        : (language === 'de' ? 'Noch keine Aktionen' : 'No actions yet');

    const behaviorHint = getPersonaBehaviorHint(personaType, sessionState, language);

    const prompt = language === 'de'
        ? `
${personaPrompt}

${behaviorHint}

AUFGABE: "${task}"

AKTUELLER STAND:
- URL: ${currentUrl}
- Letzte 3 Aktionen:
${historyText}

Du bist jetzt an der Reihe. **WIE gehst du als nächstes vor?**

Denke strategisch entsprechend deinem Charakter.

Antworte in EINEM klaren Satz, was deine STRATEGIE ist (nicht die konkrete Aktion).

Beispiele:
- "Ich will die Suchfunktion nutzen um schnell zu finden"
- "Ich möchte erstmal scrollen um mir einen Überblick zu verschaffen"
- "Ich will auf ein Produkt aus der Liste klicken"

Antworte JETZT:
`
        : `
${personaPrompt}

${behaviorHint}

TASK: "${task}"

CURRENT STATUS:
- URL: ${currentUrl}
- Last 3 actions:
${historyText}

You're up next. **HOW do you proceed?**

Think strategically according to your character.

Answer in ONE clear sentence what your STRATEGY is (not the concrete action).

Examples:
- "I want to use the search function to find quickly"
- "I want to scroll first to get an overview"
- "I want to click on a product from the list"

Answer NOW:
`;

    return await callOllama('mistral', prompt, language);
}
