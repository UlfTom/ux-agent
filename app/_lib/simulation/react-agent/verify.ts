// app/_lib/simulation/react-agent/verify.ts

import { InteractableElement, SessionState, Language } from '../types';
import { callOllama } from '../utils';

export type VerificationResult = {
    match: boolean;
    confidence: number;
    action: 'click' | 'type' | 'scroll' | 'wait';
    elementId?: number;
    textToType?: string;
    rationale: string;
};

export async function verifyPlanMatch(
    plan: string,
    observation: string,
    elements: InteractableElement[],
    sessionState: SessionState,
    language: Language = 'de'
): Promise<VerificationResult> {

    const typeCount = sessionState.actionHistory.filter(h => h.action.includes('type')).length;

    const promptDE = `
Du bist Verifikations-Modul.

PLAN: "${plan}"
OBSERVATION: "${observation}"

Top 20 Elemente (sortiert nach Priorität):
${JSON.stringify(elements.slice(0, 20), null, 2)}

STATE:
- Times typed: ${typeCount}
- On search results: ${sessionState.onSearchResults}
- Seen search field: ${sessionState.seenSearchField}

**PRÜFE: Passt die Observation zum Plan?**

CRITICAL RULES:
1. ${typeCount >= 1 ? '🚫 BEREITS getippt! KEIN "type" mehr!' : '✅ Darf "type" nutzen'}
2. Plan "Suchfunktion nutzen" + Observation "Suchfeld [ID X]" → type
3. Plan "Produkt klicken" + Observation "Produkt [ID Y]" → click
4. Plan "Überblick verschaffen" + Observation "muss scrollen" → scroll
5. IDs 0-5 sind oft Suchfelder (haben Priorität!)

Antworte NUR mit JSON:
{
  "match": true/false,
  "confidence": 0.0-1.0,
  "action": "click" | "type" | "scroll" | "wait",
  "elementId": <num> (nur bei click/type),
  "textToType": "<text>" (nur bei type),
  "rationale": "..."
}
`;

    const promptEN = `
You are verification module.

PLAN: "${plan}"
OBSERVATION: "${observation}"

Top 20 elements (sorted by priority):
${JSON.stringify(elements.slice(0, 20), null, 2)}

STATE:
- Times typed: ${typeCount}
- On search results: ${sessionState.onSearchResults}
- Seen search field: ${sessionState.seenSearchField}

**CHECK: Does the observation match the plan?**

CRITICAL RULES:
1. ${typeCount >= 1 ? '🚫 ALREADY typed! NO "type" anymore!' : '✅ May use "type"'}
2. Plan "use search" + Observation "search field [ID X]" → type
3. Plan "click product" + Observation "product [ID Y]" → click
4. Plan "get overview" + Observation "need to scroll" → scroll
5. IDs 0-5 are often search fields (prioritized!)

Answer ONLY with JSON:
{
  "match": true/false,
  "confidence": 0.0-1.0,
  "action": "click" | "type" | "scroll" | "wait",
  "elementId": <num> (only for click/type),
  "textToType": "<text>" (only for type),
  "rationale": "..."
}
`;

    const prompt = language === 'de' ? promptDE : promptEN;

    try {
        const rawResponse = await callOllama('mistral', prompt, language, undefined, 'json');

        // Extract JSON from response
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);

        if (!jsonMatch || !jsonMatch[0]) {
            throw new Error(`Mistral returned no JSON`);
        }

        const verificationJson = JSON.parse(jsonMatch[0]);

        // Enforce type limit
        if (typeCount >= 1 && verificationJson.action === 'type') {
            console.warn(`[OVERRIDE] Already typed ${typeCount}x. Forcing scroll.`);
            return {
                match: false,
                confidence: 0.5,
                action: 'scroll',
                rationale: 'Already typed, scrolling instead'
            };
        }

        // Validate elementId
        if ((verificationJson.action === 'click' || verificationJson.action === 'type')) {
            const elementId = parseInt(String(verificationJson.elementId), 10);
            const element = elements.find(el => el.id === elementId);

            if (!element || isNaN(elementId)) {
                console.warn(`[VERIFY] Invalid element ID ${elementId}, forcing scroll`);
                return {
                    match: false,
                    confidence: 0.3,
                    action: 'scroll',
                    rationale: `Element ${elementId} not found`
                };
            }

            // Role validation
            if (verificationJson.action === 'type' && element.role !== 'textbox') {
                const textboxes = elements.filter(el => el.role === 'textbox');
                if (textboxes.length > 0) {
                    verificationJson.elementId = textboxes[0].id;
                } else {
                    return {
                        match: false,
                        confidence: 0.2,
                        action: 'scroll',
                        rationale: 'No textbox found'
                    };
                }
            }

            if (verificationJson.action === 'click' && element.role !== 'link' && element.role !== 'button') {
                const clickables = elements.filter(el => el.role === 'link' || el.role === 'button');
                if (clickables.length > 0) {
                    const closest = clickables.reduce((closest, current) => {
                        const currentDist = Math.abs(current.id - elementId);
                        const closestDist = Math.abs(closest.id - elementId);
                        return currentDist < closestDist ? current : closest;
                    });
                    verificationJson.elementId = closest.id;
                } else {
                    return {
                        match: false,
                        confidence: 0.2,
                        action: 'scroll',
                        rationale: 'No clickable found'
                    };
                }
            }

            // Remember search field
            if (verificationJson.action === 'type' && element.role === 'textbox') {
                sessionState.seenSearchField = true;
                if (element.box.y < 200) {
                    sessionState.searchFieldPosition = 'top';
                }
            }
        }

        return verificationJson;

    } catch (e: any) {
        console.error("Verification failed:", e);
        return {
            match: false,
            confidence: 0.0,
            action: 'scroll',
            rationale: `Error: ${e.message}`
        };
    }
}
