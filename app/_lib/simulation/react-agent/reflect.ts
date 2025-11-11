// app/_lib/simulation/react-agent/reflect.ts

import { SessionState, Language } from '../types';
import { callOllama } from '../utils';

export async function reflect(
    plan: string,
    action: string,
    result: string,
    newUrl: string,
    sessionState: SessionState,
    language: Language = 'de'
): Promise<string> {

    const promptDE = `
Du bist Reflexions-Modul.

PLAN war: "${plan}"
AKTION war: ${action}
RESULT: ${result}
NEW URL: ${newUrl}

**HAT ES FUNKTIONIERT? Was ist der nächste logische Schritt?**

Kurze Analyse in 1-2 Sätzen:

Beispiele:
- "Erfolgreich! Suche wurde abgeschickt. Nächster Schritt: Produkt aus Liste wählen"
- "Fehler beim Klicken. Nächster Schritt: Erstmal scrollen"
- "Erfolgreich gescrollt. Nächster Schritt: Mehr Produkte anschauen"
- "✅ Aufgabe abgeschlossen! Ich habe ein passendes Produkt gefunden."

WICHTIG: Wenn du ein Produkt gefunden hast das zur Aufgabe passt, schreibe EXAKT:
"✅ Aufgabe abgeschlossen!"

Antworte JETZT:
`;

    const promptEN = `
You are reflection module.

PLAN was: "${plan}"
ACTION was: ${action}
RESULT: ${result}
NEW URL: ${newUrl}

**DID IT WORK? What is the next logical step?**

Brief analysis in 1-2 sentences:

Examples:
- "Success! Search was submitted. Next step: Choose product from list"
- "Error clicking. Next step: Scroll first"
- "Successfully scrolled. Next step: Look at more products"
- "✅ Task completed! I found a matching product."

IMPORTANT: If you found a product that matches the task, write EXACTLY:
"✅ Task completed!"

Answer NOW:
`;

    const prompt = language === 'de' ? promptDE : promptEN;

    try {
        return await callOllama('mistral', prompt, language);
    } catch (e: any) {
        console.error("Reflection failed:", e);
        return language === 'de' ? "Weiter mit nächstem Schritt" : "Continue with next step";
    }
}
