// app/api/run-simulation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { chromium, firefox, webkit, Page, Locator } from 'playwright';

type LogStep = { step: string; logs: string[]; image?: string; };

// GEÄNDERT: 'index' ist jetzt 'realIndex' (der NTH-Index)
// 'id' ist der neue, saubere Index (0, 1, 2...) für die KI
type InteractableElement = {
    id: number; // Für die KI
    realIndex: number; // Für Playwright
    text: string;
    placeholder: string | null;
    role: 'link' | 'button' | 'textbox';
    isHoverTarget: boolean;
};

async function getInteractableElements(page: Page, baseSelector: string): Promise<InteractableElement[]> {
    const elements: InteractableElement[] = [];
    const locators = page.locator(baseSelector);
    const count = await locators.count();

    // Zähler für den sauberen 'id'-Index
    let cleanIdCounter = 0;

    for (let i = 0; i < count; i++) {
        const locator = locators.nth(i);
        let isVisible = false;
        try { isVisible = await locator.isVisible({ timeout: 100 }); } catch (e) { continue; }
        if (!isVisible) { continue; }

        const tagName = await locator.evaluate(el => el.tagName.toUpperCase());
        let role: 'link' | 'button' | 'textbox' = 'button';
        if (tagName === 'A') role = 'link';
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') role = 'textbox';
        let text = (await locator.innerText() || await locator.getAttribute('aria-label') || '').trim();
        let placeholder: string | null = null;
        if (role === 'textbox') {
            placeholder = (await locator.getAttribute('placeholder')) || null;
            if (!text && placeholder) text = placeholder;
        }
        const isHoverTarget = (tagName === 'A' && (await locator.evaluate(el => el.closest('nav') !== null || el.closest('[role="navigation"]') !== null)));

        if (text || role === 'textbox') {
            elements.push({
                id: cleanIdCounter, // Der saubere Index (0, 1, 2...)
                realIndex: i, // Der "echte" NTH-Index (z.B. 15, 17, 20...)
                text: text.substring(0, 100) || 'Kein Text',
                placeholder: placeholder,
                role: role,
                isHoverTarget: isHoverTarget,
            });
            cleanIdCounter++; // Zähler erhöhen
        }
    }
    return elements;
}

// --- "Gott-Modus" (Persona-Erstellung) ---
async function generatePersonaPrompt(task: string, domain: string, personaType: string): Promise<string> {
    const prompt = `
    Du bist ein Senior UX Researcher. Deine Aufgabe ist es, eine realistische Persona (n=1) zu entwerfen, die einen Usability-Test durchführen wird.
    Kontext für den Test:
    - Domain: "${domain}"
    - Persona-Typ: "${personaType}"
    - Aufgabe: "${task}"
    Erstelle einen System-Prompt (eine Anweisung) für einen KI-Agenten, der diese Persona spielen soll.
    Der Prompt muss in der "Du"-Form geschrieben sein und eine kurze Motivation enthalten, die den Persona-Typ (${personaType}) und die Aufgabe (${task}) widerspiegelt.
    Antworte NUR mit dem reinen System-Prompt, ohne Begrüßung oder Anführungszeichen.
    
    Beispiel (Pragmatisch):
    Du bist Markus (42), ein vielbeschäftigter Projektmanager. Du bist pragmatisch und weißt genau, was du willst. Du suchst schnell eine Winter-Jeans für Damen als Geschenk für deine Frau. Du hasst es, Zeit mit Stöbern zu verschwenden und nutzt die Suchleiste, um die Aufgabe effizient zu erledigen.
    
    Beispiel (Inspirativ):
    Du bist Julia (29), Social-Media-Managerin. Du bist in Stöberlaune (inspirativ) und suchst nach einer neuen Winter-Jeans. Du bist offen für Vorschläge, klickst gerne auf Banner (z.B. 'Sale') und schaust dich in Kategorien um, bevor du die Suche benutzt.
  `;

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            body: JSON.stringify({
                // GEÄNDERT: Wir nutzen ein Text-Modell, kein Vision-Modell!
                // (Stelle sicher, dass du 'mistral' gepullt hast: `ollama pull mistral`)
                model: 'mistral',
                prompt: prompt,
                stream: false,
            }),
        });
        if (!response.ok) throw new Error(`Ollama API-Fehler (Persona): ${response.statusText}`);
        const body = await response.json();
        return body.response.trim().replace(/^"|"$/g, '');
    } catch (e: any) {
        console.error("Fehler bei Persona-Generierung:", e);
        return `Du bist ein Standard-Benutzer, der die Aufgabe ('${task}') erledigen soll.`; // Fallback
    }
}

// --- "Piloten-Gehirn" (Aktions-Entscheidung) ---
async function getNextAction(task: string, logHistory: string[], screenshotBase64: string, interactableElements: InteractableElement[], personaPrompt: string): Promise<any> {

    // GEÄNDERT: Der Prompt bittet jetzt um die "id", nicht "indexToInteract"
    const prompt = `
    ${personaPrompt} 
    Deine Aufgabe: "${task}"
    Hier ist, was du bisher getan hast (dein Gedächtnis):
    ---
    ${logHistory.join('\n')}
    ---
    Du siehst den Screenshot der aktuellen Seite.
    Hier ist eine LISTE VON ELEMENTEN (mit ihrer "Rolle" und "id"), die ich für dich gefunden habe:
    ${JSON.stringify(interactableElements, null, 2)}
    
    Was ist dein nächster logischer Schritt? Wähle eine Aktion und die "id" aus der Liste oben.
    
    PRIORITÄT 1: Wenn du einen Cookie-Banner siehst (Texte wie "Cookies", "OK", "Einwilligung"), musst du diesen ZUERST schließen.
    WICHTIG:
    1. Wenn ein Element 'isHoverTarget: true' hat (wie 'Damen'), ist es wahrscheinlich ein Menü. Du solltest 'hover' statt 'click' verwenden, um es zu öffnen.
    2. Wenn du tippen willst (z.B. 'Jeans'), wähle eine 'textbox'.
    3. Wiederhole keine Aktionen, die dich im Kreis führen!
    
    Antworte NUR mit einem JSON-Objekt in einem der folgenden Formate:
    { "action": "click", "idToInteract": <id>, "rationale": "Begründung" }
    ODER
    { "action": "type", "idToInteract": <id>, "textToType": "<Text>", "rationale": "Begründung" }
    ODER
    { "action": "hover", "idToInteract": <id>, "rationale": "Ich hovere, um das Menü zu öffnen." }
    ODER
    { "action": "finish", "rationale": "Ich bin fertig." }
  `;
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST', body: JSON.stringify({
                model: 'llava', prompt: prompt, format: 'json', images: [screenshotBase64], stream: false,
            }),
        });
        if (!response.ok) throw new Error(`Ollama API-Fehler (Aktion): ${response.statusText}`);
        const body = await response.json();
        const rawResponse = body.response as string;
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch || !jsonMatch[0]) {
            throw new Error(`KI hat kein gültiges JSON-Objekt zurückgegeben. Antwort war: ${rawResponse}`);
        }
        const actionJson = JSON.parse(jsonMatch[0]);
        return actionJson;
    } catch (e: any) {
        console.error("Fehler beim Aufruf von Ollama:", e); throw e;
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
    const elementSelector = 'a[href], button, input[type="text"], input[type="search"], textarea, nav a, [role="navigation"] a';

    try {
        logHistory.push("Generiere Persona...");
        const personaPrompt = await generatePersonaPrompt(task, domain, personaType);

        logHistory.push(`Starte ${browserType}-Browser...`);
        switch (browserType) {
            case 'firefox': browser = await firefox.launch({ headless: true }); break;
            case 'safari': browser = await webkit.launch({ headless: true }); break;
            default: browser = await chromium.launch({ headless: true });
        }

        const page = await browser.newPage();
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
            const screenshotBase64 = screenshotBuffer.toString('base64');

            const interactableElements = await getInteractableElements(page, elementSelector);

            if (interactableElements.length === 0) {
                currentStepLogs.push("Aktion: Keine (sichtbaren) Elemente im Viewport gefunden. Stoppe.");
                structuredLog.push({ step: currentStepName, logs: currentStepLogs, image: screenshotBase64 });
                break;
            }

            currentStepLogs.push(`Denke nach (rufe Ollama mit ${interactableElements.length} Elementen auf)...`);

            // GEÄNDERT: 'aiAction' enthält jetzt 'idToInteract'
            const aiAction = await getNextAction(task, logHistory, screenshotBase64, interactableElements, personaPrompt);

            const currentStep: LogStep = { step: currentStepName, logs: currentStepLogs, image: screenshotBase64 };

            // --- DER NEUE "RE-INDEXING"-CHECK ---
            // 1. Hole die 'id', die die KI (dumm) gewählt hat (z.B. 0)
            const chosenId = aiAction.idToInteract;

            // 2. Finde das ECHTE Element in unserer Liste
            const elementToInteract = interactableElements.find(el => el.id === chosenId);

            if (!elementToInteract) {
                currentStepLogs.push(`Aktion: KI wollte ID ${chosenId} wählen, aber die existiert nicht in der Liste. Stoppe.`);
                structuredLog.push(currentStep); break;
            }

            try {
                // 3. Hole die ECHTE Playwright-Indexnummer
                const { role, text, realIndex } = elementToInteract;

                // 4. Benutze den 'realIndex' (z.B. 15), um das Element sicher zu finden
                const locator = page.locator(elementSelector).nth(realIndex);

                if (aiAction.action === 'click' && (role === 'link' || role === 'button')) {
                    currentStepLogs.push(`KI-Entscheidung: Klicke (Rolle: ${role}) mit Text: "${text}"`);
                    currentStepLogs.push(`Begründung: ${aiAction.rationale}`);
                    await locator.click({ timeout: 10000 });
                    await page.waitForURL('**', { waitUntil: 'load' });
                    const newUrl = page.url();
                    currentStepLogs.push(`Aktion: Erfolgreich geklickt. Neue URL: ${newUrl}`);
                    logHistory.push(`Aktion: Klick auf "${text}", neue URL: ${newUrl}`);

                } else if (aiAction.action === 'type' && role === 'textbox' && aiAction.textToType) {
                    currentStepLogs.push(`KI-Entscheidung: Tippe '${aiAction.textToType}' in (Rolle: ${role}) mit Text/Placeholder: "${text}"`);
                    currentStepLogs.push(`Begründung: ${aiAction.rationale}`);
                    await locator.fill(aiAction.textToType, { timeout: 10000 });
                    currentStepLogs.push(`Aktion: Erfolgreich getippt.`);
                    logHistory.push(`Aktion: Tippe "${aiAction.textToType}" in "${text}"`);

                } else if (aiAction.action === 'hover' && (role === 'link' || role === 'button')) {
                    currentStepLogs.push(`KI-Entscheidung: Hover über (Rolle: ${role}) mit Text: "${text}"`);
                    currentStepLogs.push(`Begründung: ${aiAction.rationale}`);
                    await locator.hover({ timeout: 10000 });
                    currentStepLogs.push(`Aktion: Erfolgreich gehovert. Warte auf Flyout...`);
                    logHistory.push(`Aktion: Hover über "${text}"`);
                    await page.waitForTimeout(1000);

                } else if (aiAction.action === 'finish') {
                    currentStepLogs.push(`KI-Entscheidung: Aufgabe beendet.`);
                    currentStepLogs.push(`Begründung: ${aiAction.rationale}`);
                    logHistory.push("Aktion: Aufgabe beendet.");
                    structuredLog.push(currentStep); break;
                } else {
                    currentStepLogs.push(`Aktion: KI wollte ungültige Aktion (${aiAction.action} auf ${role}) ausführen. Stoppe.`);
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