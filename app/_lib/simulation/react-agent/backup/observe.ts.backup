// app/_lib/simulation/react-agent/observe.ts

import { InteractableElement, Language } from '../types';
import { callOllama } from '../utils';

function getSearchFieldHints(language: Language): string {
    return language === 'de'
        ? `
⚠️ WICHTIG: Achte besonders auf:
- 🔍 **Suchfelder** (meist GANZ OBEN, oft mit Lupe-Icon)
  → Haben oft KLEINE IDs (0-5) da priorisiert!
- 🔘 Große Buttons (CTAs, "Jetzt kaufen", "Zur Kasse")
- 📝 Eingabefelder (Login, Formulare)
- 🖼️ Produktbilder & Links

Textboxen haben Priorität und bekommen niedrige IDs!
`
        : `
⚠️ IMPORTANT: Pay special attention to:
- 🔍 **Search fields** (usually AT THE TOP, often with magnifier icon)
  → Often have LOW IDs (0-5) because prioritized!
- 🔘 Large buttons (CTAs, "Buy now", "Checkout")
- 📝 Input fields (Login, forms)
- 🖼️ Product images & links

Textboxes are prioritized and get low IDs!
`;
}

export async function observeScreen(
    plan: string,
    annotatedScreenshotBase64: string,
    elements: InteractableElement[],
    currentUrl: string,
    language: Language = 'de'
): Promise<string> {

    const searchFieldHints = getSearchFieldHints(language);

    const promptDE = `
Du bist ein User Agent.

DEIN PLAN: "${plan}"
AKTUELLE URL: ${currentUrl}

${searchFieldHints}

Schau das Bild an. Rote Boxen mit IDs sind interaktive Elemente.

**Was SIEHST du, das zu deinem Plan passt?**

Beschreibe präzise:
- Welches Element siehst du? (mit [ID])
- Wo ist es? (oben, Mitte, unten)
- Passt es zu deinem Plan?

Beispiele:
- "Ich sehe ein Suchfeld [ID 2] ganz oben rechts mit Lupe-Icon"
- "Ich sehe Produktbilder [ID 12, 15, 18] in der Mitte"
- "Ich sehe einen Login-Button [ID 7] oben"
- "Ich sehe viele Produkte, muss scrollen für mehr"

Antworte JETZT in 1-2 kurzen Sätzen:
`;

    const promptEN = `
You are a user agent.

YOUR PLAN: "${plan}"
CURRENT URL: ${currentUrl}

${searchFieldHints}

Look at the image. Red boxes with IDs are interactive elements.

**What do you SEE that matches your plan?**

Describe precisely:
- Which element do you see? (with [ID])
- Where is it? (top, middle, bottom)
- Does it match your plan?

Examples:
- "I see a search field [ID 2] at the very top right with magnifier icon"
- "I see product images [ID 12, 15, 18] in the middle"
- "I see a login button [ID 7] at the top"
- "I see many products, need to scroll for more"

Answer NOW in 1-2 short sentences:
`;

    const prompt = language === 'de' ? promptDE : promptEN;

    try {
        return await callOllama('llava', prompt, language, [annotatedScreenshotBase64]);
    } catch (e: any) {
        console.error("Observation failed:", e);
        throw new Error(`Llava not reachable: ${e.message}`);
    }
}
