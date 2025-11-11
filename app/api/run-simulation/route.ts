// app/api/run-simulation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { chromium, firefox, webkit, Page, Locator } from 'playwright';
import sharp from 'sharp';

type LogStep = { step: string; logs: string[]; image?: string; };

// --- 1. Die "Hände": (KORRIGIERTE TYPDEFINITION) ---

type InteractableElement = {
    id: number;
    realIndex: number;
    role: 'link' | 'button' | 'textbox';
    box: { x: number; y: number; width: number; height: number };
    text: string;
    placeholder: string | null;
    isHoverTarget: boolean;
};

async function getInteractableElements(page: Page, baseSelector: string): Promise<InteractableElement[]> {
    const elements: InteractableElement[] = [];
    const locators = page.locator(baseSelector);
    const count = await locators.count();
    let cleanIdCounter = 0;

    for (let i = 0; i < count; i++) {
        const locator = locators.nth(i);
        let box: { x: number; y: number; width: number; height: number } | null = null;
        try {
            box = await locator.boundingBox({ timeout: 100 });
        } catch (e) {
            continue;
        }
        if (!box || box.width === 0 || box.height === 0) {
            continue;
        }

        const tagName = await locator.evaluate(el => el.tagName.toUpperCase());
        let role: 'link' | 'button' | 'textbox' = 'button';
        if (tagName === 'A') role = 'link';
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') role = 'textbox';
        const ariaRole = await locator.getAttribute('role');
        if (ariaRole === 'link' || ariaRole === 'listitem' || ariaRole === 'option') role = 'link';
        if (ariaRole === 'button') role = 'button';
        if (ariaRole === 'textbox' || ariaRole === 'searchbox') role = 'textbox';

        let text = (await locator.innerText() || await locator.getAttribute('aria-label') || '').trim();
        let placeholder: string | null = null;
        if (role === 'textbox') {
            placeholder = (await locator.getAttribute('placeholder')) || null;
            if (!text && placeholder) text = placeholder;
        }
        const isHoverTarget = (tagName === 'A' && (await locator.evaluate(el => el.closest('nav') !== null || el.closest('[role="navigation"]') !== null)));

        elements.push({
            id: cleanIdCounter,
            realIndex: i,
            role: role,
            box: box,
            text: text.substring(0, 100) || 'Kein Text',
            placeholder: placeholder,
            isHoverTarget: isHoverTarget,
        });
        cleanIdCounter++;
    }
    return elements;
}

// --- 2. Die "Augen": (Annotations-Funktion) ---
async function annotateImage(
    screenshotBuffer: Buffer,
    elements: InteractableElement[]
): Promise<string> {
    const { width, height } = await sharp(screenshotBuffer).metadata();
    const svgOverlays = elements.map(el => `
    <rect x="${el.box.x}" y="${el.box.y}" width="${el.box.width}" height="${el.box.height}" 
          stroke="#FF0000" fill="none" stroke-width="2"/>
    <text x="${el.box.x + 5}" y="${el.box.y + 20}" 
          font-family="Arial" font-size="16" fill="white" 
          stroke="black" stroke-width="0.5"
          style="background-color: #FF0000; padding: 2px 4px; border-radius: 2px;">
      ${el.id}
    </text>
  `).join('');
    const svg = `<svg width="${width}" height="${height}">${svgOverlays}</svg>`;
    const annotatedBuffer = await sharp(screenshotBuffer)
        .composite([
            { input: Buffer.from(svg), top: 0, left: 0 }
        ])
        .png()
        .toBuffer();
    return annotatedBuffer.toString('base64');
}

// --- 3. Das "Gott-Gehirn": (Persona-Erstellung) ---
async function generatePersonaPrompt(task: string, domain: string, personaType: string): Promise<string> {
    // (Funktion bleibt gleich, nutzt Mistral)
    const prompt = `
    Du bist ein Senior UX Researcher. Deine Aufgabe ist es, eine realistische Persona (n=1) zu entwerfen, die einen Usability-Test durchführen wird.
    Kontext:
    - Domain: "${domain}"
    - Persona-Typ: "${personaType}"
    - Aufgabe: "${task}"
    Erstelle einen System-Prompt (eine Anweisung) für einen KI-Agenten, der diese Persona spielen soll.
    Der Prompt muss in der "Du"-Form geschrieben sein und eine kurze Motivation enthalten, die den Persona-Typ (${personaType}) und die Aufgabe (${task}) widerspiegelt.
    Antworte NUR mit dem reinen System-Prompt, ohne Begrüßung oder Anführungszeichen.
  `;
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST', body: JSON.stringify({
                model: 'mistral', prompt: prompt, stream: false,
            }),
        });
        if (!response.ok) throw new Error(`Ollama API-Fehler (Persona): ${response.statusText}`);
        const body = await response.json();
        return body.response.trim().replace(/^"|"$/g, '');
    } catch (e: any) {
        console.error("Fehler bei Persona-Generierung:", e);
        return `Du bist ein Standard-Benutzer, der die Aufgabe ('${task}') erledigen soll.`;
    }
}

// --- 4. Das "Piloten-Auge": (Llava - Visuelle Absicht) ---
async function getVisualIntention(
    task: string,
    logHistory: string[],
    annotatedScreenshotBase64: string,
    personaPrompt: string
): Promise<string> {

    const isPragmatic = personaPrompt.toLowerCase().includes('pragmatisch');
    const lastActionWasType = logHistory.at(-1)?.includes("Aktion: Erfolgreich getippt");

    const prompt = `
    ${personaPrompt} 
    Deine Aufgabe: "${task}"
    Dein Gedächtnis: ${logHistory.join(' -> ')}

    Schau dir das Bild an. Ich habe alle interaktiven Elemente mit **roten Boxen und einer ID-Nummer** (z.B. [0], [1]) markiert.
    
    Was ist dein nächster logischer Schritt? 
    
    *** WICHTIGE REGELN (BEFOLGE SIE!) ***
    1. **PRIO 1 (Cookie):** Wenn du einen Cookie-Banner (z.B. mit "OK") siehst, klicke ZUERST auf die ID-Nummer der "OK"-Box.
    
    2. **DEINE PERSONA-REGEL:**
       ${isPragmatic
            ? "Du bist PRAGMATISCH. Dein Ziel ist die SUCHE. Finde die ID der 'Wonach suchst du?'-Box, um zu tippen."
            : "Du bist INSPIRATIV. Stöbere gerne. Klicke auf interessante Kategorien wie [Damen-Mode] oder [Sale]."
        }

    3. **SUCH-REGEL:**
       ${lastActionWasType
            ? "DU HAST GERADE GETIPPT. Dein nächster Schritt MUSS sein, auf den 'Suchen'-Button (das Lupen-Icon [2]) zu klicken, um die Suche abzuschicken."
            : "Wenn du tippen willst, wähle eine 'textbox'."
        }

    4. **SCROLL-REGEL:** Scrolle NUR, wenn du dein Ziel (z.B. die Suchleiste) absolut nicht auf dem Bildschirm sehen kannst.
    
    Beschreibe deine Absicht (was du tun willst) und auf welche ID-Nummer du dich beziehst.
    Antworte in einem einzigen, kurzen Satz.
    
    Beispiel 1: Ich bin pragmatisch, also tippe ich 'Winter-Jeans' in die Suchleiste [1].
    Beispiel 2: Ich habe getippt, jetzt klicke ich auf das Lupen-Icon [2], um zu suchen.
    Beispiel 3: Ich sehe mein Ziel nicht, ich scrolle nach unten.
  `;
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST', body: JSON.stringify({
                model: 'llava', prompt: prompt,
                images: [annotatedScreenshotBase64],
                stream: false,
            }),
        });
        if (!response.ok) throw new Error(`Ollama API-Fehler (Llava): ${response.statusText}`);
        const body = await response.json();
        return body.response.trim();
    } catch (e: any) {
        console.error("Fehler beim Aufruf von Ollama (Llava):", e); throw e;
    }
}

// --- 5. Das "Piloten-Gehirn": (Mistral - Logik & JSON) ---
async function getLogicalAction(
    visualIntention: string,
    interactableElements: InteractableElement[],
    task: string
): Promise<any> {

    const prompt = `
    Du bist ein Logik-Modul (Modul 2). Deine Aufgabe ist es, die Absicht eines "Piloten" (Modul 1) in einen sauberen JSON-Befehl umzusetzen.
    
    Absicht des Piloten (Rohtext): "${visualIntention}"
    Aufgabe: "${task}"
    
    Hier ist die "Speisekarte" (JSON-Liste) der Elemente, die auf der Seite verfügbar sind:
    ${JSON.stringify(interactableElements, null, 2)}
    
    Finde das EINE Element aus der Liste, das am besten zur Absicht des Piloten passt.
    
    **Deine Logik-Regeln:**
    1. Wenn die Absicht "tippen" oder "suchen" ist, MUSS deine Aktion "type" sein und das Ziel MUSS die "role: 'textbox'" sein.
    2. Wenn die Absicht "klicken" oder "auswählen" ist, MUSS deine Aktion "click" sein und das Ziel MUSS "role: 'link'" oder "role: 'button'" sein.
    3. Wenn die Absicht "hovern" oder "Menü öffnen" ist, MUSS deine Aktion "hover" sein.
    4. Wenn die Absicht "scrollen" ist, MUSS deine Aktion "scroll" sein.
    5. Wenn der Pilot eine ID erwähnt (z.B. "klicke [3]"), finde das Element mit "id: 3".
    Antworte NUR mit einem JSON-Objekt in einem der folgenden Formate:
    { "action": "click", "idToInteract": <id>, "rationale": "Begründung basierend auf Absicht." }
    ODER
    { "action": "type", "idToInteract": <id>, "textToType": "<der Text für die Aufgabe, z.B. '${task}'>", "rationale": "Begründung." }
    ODER
    { "action": "hover", "idToInteract": <id>, "rationale": "Begründung." }
    ODER
    { "action": "scroll", "direction": "down", "pixels": 500, "rationale": "Pilot will scrollen." }
    ODER
    { "action": "finish", "rationale": "Pilot ist fertig." }
  `;
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST', body: JSON.stringify({
                model: 'mistral', prompt: prompt, format: 'json', stream: false,
            }),
        });
        if (!response.ok) throw new Error(`Ollama API-Fehler (Mistral-Logik): ${response.statusText}`);
        const body = await response.json();
        const rawResponse = body.response as string;
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch || !jsonMatch[0]) {
            throw new Error(`KI (Mistral) hat kein gültiges JSON zurückgegeben. Antwort war: ${rawResponse}`);
        }
        const actionJson = JSON.parse(jsonMatch[0]);
        return actionJson;
    } catch (e: any) {
        console.error("Fehler beim Aufruf von Ollama (Mistral):", e); throw e;
    }
}


function stripAnsiCodes(str: string): string {
    return str.replace(/[\u001b\u009b][[()#;?]?[0-9]{1,4}(?:;[0-9]{0,4})?[0-9A-ORZcf-nqry=><]/g, '');
}

// (preFlightCookieClick bleibt unverändert)
async function preFlightCookieClick(page: Page, logHistory: string[], structuredLog: LogStep[]) {
    logHistory.push("Suche nach Cookie-Banner...");
    const currentStepLogs: string[] = [];
    const cookieRegex = /^(OK|Alle akzeptieren|Einwilligung|Akzeptieren|Verstanden|Alle annehmen)$/i;
    try {
        const cookieButton = page.getByRole('button', { name: cookieRegex, exact: false }).first();
        await cookieButton.waitFor({ state: 'visible', timeout: 5000 });
        const buttonText = (await cookieButton.innerText()) || "OK-Button";
        currentStepLogs.push(`Pre-Flight: Cookie-Banner-Button gefunden. Klicke auf: "${buttonText}"`);
        await cookieButton.click({ force: true, timeout: 5000 });
        logHistory.push(`Aktion: Cookie-Banner ("${buttonText}") geschlossen.`);
        await page.waitForTimeout(1000);
        structuredLog.push({
            step: "Schritt 1.5 (Cookie-Banner)",
            logs: currentStepLogs,
            image: (await page.screenshot({ type: 'png' })).toString('base64')
        });
    } catch (error) {
        currentStepLogs.push("Pre-Flight: Kein Cookie-Banner gefunden. Fahre fort.");
        logHistory.push("Pre-Flight: Kein Cookie-Banner gefunden.");
    }
}

// --- POST-Handler (Orchestrator) ---
export async function POST(request: NextRequest) {
    const { url, task, browserType, clickDepth, domain, personaType } = await request.json() as {
        url: string; task: string; browserType: 'chrome' | 'firefox' | 'safari';
        clickDepth: number; domain: string; personaType: string;
    };

    if (!url || !task || !domain || !personaType) {
        return NextResponse.json({ message: 'URL, Aufgabe, Domain und Persona-Typ sind erforderlich' }, { status: 400 });
    }

    const structuredLog: LogStep[] = [];
    const logHistory: string[] = [];
    let browser = null;
    const elementSelector = 'a[href], button, input[type="text"], input[type="search"], textarea, nav a, [role="navigation"] a, [role="link"], [role="button"], [role="listitem"], [role="option"]';

    try {
        logHistory.push("Generiere Persona...");
        const personaPrompt = await generatePersonaPrompt(task, domain, personaType);

        logHistory.push(`Starte ${browserType}-Browser...`);
        switch (browserType) {
            case 'firefox': browser = await firefox.launch({ headless: true }); break;
            case 'safari': browser = await webkit.launch({ headless: true }); break;
            default: browser = await chromium.launch({ headless: true });
        }

        const page = await browser.newPage({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        await page.goto(url, { waitUntil: 'load' });

        structuredLog.push({
            step: "Schritt 1 (Start)",
            logs: [`Gehe zu: ${url}`],
            image: (await page.screenshot({ type: 'png' })).toString('base64')
        });
        logHistory.push(`1. Gehe zu: ${url}`);

        structuredLog.push({
            step: "Schritt 1.2 (Persona-Briefing)",
            logs: [
                "Der KI-Agent wird instruiert mit folgendem Prompt:",
                `"${personaPrompt}"`
            ]
        });
        logHistory.push(`Persona-Briefing: ${personaPrompt}`);

        await preFlightCookieClick(page, logHistory, structuredLog);

        for (let i = 0; i < clickDepth; i++) {
            const currentStepName = `--- Schritt ${i + 2} / ${clickDepth + 2} ---`;
            const currentStepLogs: string[] = [];

            await page.waitForTimeout(500);
            const screenshotBuffer = await page.screenshot({ type: 'png' });

            const interactableElements = await getInteractableElements(page, elementSelector);

            if (interactableElements.length === 0 && i > 0) {
                currentStepLogs.push("Aktion: Keine (sichtbaren) Elemente im Viewport gefunden. Scrolle...");
                await page.mouse.wheel(0, 500);
                logHistory.push("Aktion: Scrolle nach unten.");
                structuredLog.push({ step: currentStepName, logs: currentStepLogs, image: screenshotBuffer.toString('base64') });
                continue;
            }

            currentStepLogs.push(`Denke nach (annotiere ${interactableElements.length} Elemente)...`);
            const annotatedScreenshotBase64 = await annotateImage(screenshotBuffer, interactableElements);


            // --- NEUER 2-SCHRITT-DENKPROZESS ---
            // 1. "Augen" (Llava): Was will ich tun?
            currentStepLogs.push(`Denke nach (Schritt 1/2: Visuelle Absicht mit Llava)...`);
            const visualIntention = await getVisualIntention(task, logHistory, annotatedScreenshotBase64, personaPrompt);
            currentStepLogs.push(`KI-Absicht (Llava): ${visualIntention}`);

            // 2. "Logiker" (Mistral): Welches JSON-Objekt passt zu dieser Absicht?
            currentStepLogs.push(`Denke nach (Schritt 2/2: Logische Aktion mit Mistral)...`);
            const aiAction = await getLogicalAction(visualIntention, interactableElements, task);
            // --- ENDE 2-SCHRITT-DENKPROZESS ---

            const currentStep: LogStep = { step: currentStepName, logs: currentStepLogs, image: annotatedScreenshotBase64 };

            const chosenIdRaw = aiAction.idToInteract;
            const chosenId = parseInt(String(chosenIdRaw), 10);
            const elementToInteract = interactableElements.find(el => el.id === chosenId);

            if ((aiAction.action === 'click' || aiAction.action === 'type' || aiAction.action === 'hover') && (!elementToInteract || isNaN(chosenId))) {
                currentStepLogs.push(`Aktion: KI (Mistral) wollte ID ${chosenIdRaw} wählen, aber die existiert nicht in der Liste. Stoppe.`);
                structuredLog.push(currentStep); break;
            }

            try {
                const { role, text, realIndex } = elementToInteract || {};
                const locator = elementToInteract ? page.locator(elementSelector).nth(realIndex!) : null;

                // ** ERWEITERTES DEBUGGING **
                currentStepLogs.push(`KI-JSON (Mistral): ${JSON.stringify(aiAction)}`);
                currentStepLogs.push(`Gefundenes Element: ${JSON.stringify(elementToInteract || 'null')}`);

                if (aiAction.action === 'click' && locator && (role === 'link' || role === 'button')) {
                    currentStepLogs.push(`KI-Entscheidung: Klicke (Rolle: ${role}) mit Text: "${text}" [ID: ${chosenId}]`);

                    const [newPage] = await Promise.all([
                        page.waitForEvent('load', { timeout: 10000 }).catch(() => null),
                        locator.click({ timeout: 10000 })
                    ]);

                    if (newPage) {
                        const newUrl = page.url();
                        currentStepLogs.push(`Aktion: Erfolgreich geklickt. Neue URL: ${newUrl}`);
                        logHistory.push(`Aktion: Klick (ID ${chosenId}), neue URL: ${newUrl}`);
                    } else {
                        currentStepLogs.push(`Aktion: Erfolgreich geklickt (keine Navigation).`);
                        logHistory.push(`Aktion: Klick (ID ${chosenId}) (keine Navigation).`);
                    }

                } else if (aiAction.action === 'type' && locator && role === 'textbox' && aiAction.textToType) {
                    currentStepLogs.push(`KI-Entscheidung: Tippe '${aiAction.textToType}' in (Rolle: ${role}) mit Text/Placeholder: "${text}" [ID: ${chosenId}]`);

                    await locator.fill(aiAction.textToType, { timeout: 10000 });
                    currentStepLogs.push(`Aktion: Erfolgreich getippt.`);
                    logHistory.push(`Aktion: Tippe "${aiAction.textToType}" in ID ${chosenId}`);

                } else if (aiAction.action === 'hover' && locator && (role === 'link' || role === 'button')) {
                    currentStepLogs.push(`KI-Entscheidung: Hover über (Rolle: ${role}) mit Text: "${text}" [ID: ${chosenId}]`);

                    await locator.hover({ timeout: 10000 });
                    currentStepLogs.push(`Aktion: Erfolgreich gehovert. Warte auf Flyout...`);
                    logHistory.push(`Aktion: Hover über ID ${chosenId}`);
                    await page.waitForTimeout(1000);

                } else if (aiAction.action === 'scroll') {
                    const pixels = aiAction.pixels || 500;
                    currentStepLogs.push(`KI-Entscheidung: Scrolle nach unten (${pixels}px).`);
                    await page.mouse.wheel(0, pixels);
                    currentStepLogs.push(`Aktion: Erfolgreich gescrollt.`);
                    logHistory.push(`Aktion: Scrolle nach unten.`);

                } else if (aiAction.action === 'finish') {
                    currentStepLogs.push(`KI-Entscheidung: Aufgabe beendet.`);
                    logHistory.push("Aktion: Aufgabe beendet.");
                    structuredLog.push(currentStep); break;
                } else {
                    currentStepLogs.push(`Aktion: KI wollte ungültige Aktion (${aiAction.action} auf ${role || 'unbekannt'}) ausführen. Stoppe.`);
                    logHistory.push("Aktion: Ungültige Aktion.");
                    structuredLog.push(currentStep); break;
                }
                structuredLog.push(currentStep);

            } catch (interactionError: any) {
                const errorMsg = stripAnsiCodes(interactionError.message);
                currentStepLogs.push(`Aktion: Interaktion fehlgeschlagen. Stoppe.`);
                currentStepLogs.push(`FEHLER: ${errorMsg}`);
                logHistory.push(`Aktion: Interaktion fehlgeschlagen.`);
                structuredLog.push(currentStep);
                throw interactionError;
            }
        }

        if (structuredLog.length > 0 && !structuredLog.at(-1)?.logs.some(l => l.includes("beendet"))) {
            structuredLog.push({ step: "Simulation gestoppt", logs: ["Limit der Aktionen erreicht."] });
        }
        return NextResponse.json({ log: structuredLog });

    } catch (error: any) {
        const rawErrorMessage = (error instanceof Error) ? error.message : "Unbekannter Fehler";
        const errorMessage = stripAnsiCodes(rawErrorMessage);
        structuredLog.push({ step: "FATALER FEHLER", logs: [errorMessage] });
        console.error(errorMessage);
        return NextResponse.json({ message: errorMessage, log: structuredLog }, { status: 500 });
    } finally {
        if (browser) { await browser.close(); }
    }
}