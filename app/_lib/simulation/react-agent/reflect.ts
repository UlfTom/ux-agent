// app/_lib/simulation/react-agent/reflect.ts
// ⭐️ FIX: Simplifiziert, um "STOPP"-Halluzinationen zu verhindern ⭐️

import { callOllama } from '../utils';
import { Language, SessionState } from '../types';

export async function reflectOnProgress(
    plan: string,
    observation: string,
    executionResult: string,
    sessionState: SessionState,
    originalTask: string,
    stepNumber: number,
    language: Language = 'de'
): Promise<string> {
    console.log(`[REFLECT] Step ${stepNumber}: Reflecting on progress...`);
    console.log(`[REFLECT] Plan: "${plan}"`);
    console.log(`[REFLECT] Result: "${executionResult}"`);

    const hasProducts = observation.includes('product') ||
        observation.includes('Produkt') ||
        observation.includes('🛍️') ||
        observation.includes('available');

    // ⭐️ VEREINFACHTER PROMPT: 
    // Wir entziehen dem LLM die Verantwortung, "STOPP" zu sagen.
    // Das LLM soll nur noch qualitativ reflektieren.
    // Die harte "STOPP"-Logik wird deterministisch in route.ts implementiert.

    const promptDE = `Du bist ein KI-Agent der über seinen Fortschritt reflektiert.

**Original Task:** "${originalTask}"
**Aktueller Plan:** "${plan}"
**Observation:** "${observation}"
**Execution Result:** "${executionResult}"

**Session Info:**
- Scroll count: ${sessionState.scrollCount || 0}
- Products visible (laut Code): ${hasProducts ? 'YES' : 'NO'}
- Step: ${stepNumber}

**Deine Aufgabe:**
Reflektiere in einem kurzen Satz über den letzten Schritt.
- War die Aktion erfolgreich?
- Passt das Ergebnis zum Plan?
- Was ist der logische nächste Gedanke?

**Beispiele:**
- "Aktion war erfolgreich, fahre mit dem Plan fort."
- "Ich habe gescrollt, aber immer noch keine Produkte gefunden. Ich muss vielleicht nochmal scrollen."
- "Fehler beim Klicken, das Element war vielleicht nicht bereit. Ich versuche es nochmal oder ändere die Strategie."
- "Produkte sind jetzt sichtbar. Nächster Schritt ist die Auswahl."

Reflexion (1 kurzer Satz):`;

    const promptEN = `You are an AI agent reflecting on your progress.

**Original Task:** "${originalTask}"
**Current Plan:** "${plan}"
**Observation:** "${observation}"
**Execution Result:** "${executionResult}"

**Session Info:**
- Scroll count: ${sessionState.scrollCount || 0}
- Products visible (per code): ${hasProducts ? 'YES' : 'NO'}
- Step: ${stepNumber}

**Your Task:**
Reflect on the last step in one short sentence.
- Was the action successful?
- Does the result match the plan?
- What is the logical next thought?

**Examples:**
- "Action was successful, continuing with the plan."
- "I scrolled, but still no products found. I might need to scroll again."
- "Error during click, element might not have been ready. I will try again or change strategy."
- "Products are now visible. Next step is to select one."

Reflection (1 short sentence):`;

    const prompt = language === 'de' ? promptDE : promptEN;

    try {
        const reflection = await callOllama('llama3.2:latest', prompt, 'text');
        console.log(`[REFLECT] ✅ Reflection: ${reflection}`);
        return reflection;
    } catch (error) {
        console.error('[REFLECT] Error:', error);
        return language === 'de'
            ? 'Weiter mit nächstem Schritt'
            : 'Continue with next step';
    }
}