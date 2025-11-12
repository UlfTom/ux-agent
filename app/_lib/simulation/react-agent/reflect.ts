// app/_lib/simulation/react-agent/reflect.ts
// FIX: Smart reflection to stop endless scroll

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

    // CRITICAL FIX: Detect endless scroll
    const isScrollAction = executionResult.includes('scroll') || executionResult.includes('Scroll');
    const hasScrolledRecently = sessionState.scrollCount && sessionState.scrollCount >= 2;

    console.log(`[REFLECT] Is scroll action: ${isScrollAction}`);
    console.log(`[REFLECT] Scroll count: ${sessionState.scrollCount || 0}`);

    // CRITICAL FIX: Check if we have products
    const hasProducts = observation.includes('product') ||
        observation.includes('Produkt') ||
        observation.includes('🛍️') ||
        observation.includes('available');

    console.log(`[REFLECT] Has products in observation: ${hasProducts}`);

    const promptDE = `Du bist ein KI-Agent der über seinen Fortschritt reflektiert.

**Original Task:**
"${originalTask}"

**Aktueller Plan:**
"${plan}"

**Observation:**
"${observation}"

**Execution Result:**
"${executionResult}"

**Session Info:**
- Scroll count: ${sessionState.scrollCount || 0}
- Products visible: ${hasProducts ? 'YES' : 'NO'}
- Search submitted: ${sessionState.searchSubmitted ? 'YES' : 'NO'}
- Step: ${stepNumber}

**WICHTIG:**
1. Wenn "Scroll count" >= 3 UND "Products visible" = YES → Sage: "STOPP: Jetzt Produkt auswählen!"
2. Wenn "Scroll count" >= 5 → Sage: "STOPP: Zu viel gescrollt, keine Produkte gefunden!"
3. Wenn Produkte sichtbar sind → Sage: "✅ Produkte gefunden, nächster Schritt: Auswählen"
4. Wenn Plan erfolgreich ausgeführt → Sage: "Weiter mit nächstem Schritt"
5. Wenn Plan fehlgeschlagen → Sage: "⚠️ Problem: [kurze Beschreibung]"

Reflexion (1 kurzer Satz):`;

    const promptEN = `You are an AI agent reflecting on your progress.

**Original Task:**
"${originalTask}"

**Current Plan:**
"${plan}"

**Observation:**
"${observation}"

**Execution Result:**
"${executionResult}"

**Session Info:**
- Scroll count: ${sessionState.scrollCount || 0}
- Products visible: ${hasProducts ? 'YES' : 'NO'}
- Search submitted: ${sessionState.searchSubmitted ? 'YES' : 'NO'}
- Step: ${stepNumber}

**IMPORTANT:**
1. If "Scroll count" >= 3 AND "Products visible" = YES → Say: "STOP: Now select product!"
2. If "Scroll count" >= 5 → Say: "STOP: Scrolled too much, no products found!"
3. If products visible → Say: "✅ Products found, next step: Select"
4. If plan executed successfully → Say: "Continue with next step"
5. If plan failed → Say: "⚠️ Problem: [short description]"

Reflection (1 short sentence):`;

    const prompt = language === 'de' ? promptDE : promptEN;

    try {
        const reflection = await callOllama('llama3.2:latest', prompt, 'text');
        console.log(`[REFLECT] ✅ Reflection: ${reflection}`);

        // CRITICAL FIX: Override if endless scroll detected
        if (hasScrolledRecently && isScrollAction) {
            if (hasProducts) {
                const stopReflection = language === 'de'
                    ? '🛑 STOPP: Produkte gefunden nach mehrmaligem Scrollen. Jetzt Produkt auswählen!'
                    : '🛑 STOP: Products found after multiple scrolls. Now select product!';
                console.warn(`[REFLECT] ⚠️ Overriding with: ${stopReflection}`);
                return stopReflection;
            } else if ((sessionState.scrollCount || 0) >= 5) {
                const stopReflection = language === 'de'
                    ? '🛑 STOPP: Zu oft gescrollt ohne Erfolg. Strategie ändern!'
                    : '🛑 STOP: Scrolled too many times without success. Change strategy!';
                console.warn(`[REFLECT] ⚠️ Overriding with: ${stopReflection}`);
                return stopReflection;
            }
        }

        return reflection;
    } catch (error) {
        console.error('[REFLECT] Error:', error);

        // SMART FALLBACK
        if (hasProducts) {
            return language === 'de'
                ? '✅ Produkte gefunden, nächster Schritt: Auswählen'
                : '✅ Products found, next step: Select';
        }

        if (hasScrolledRecently && isScrollAction) {
            return language === 'de'
                ? '⚠️ Mehrfach gescrollt, eventuell Strategie ändern'
                : '⚠️ Scrolled multiple times, may need to change strategy';
        }

        return language === 'de'
            ? 'Weiter mit nächstem Schritt'
            : 'Continue with next step';
    }
}