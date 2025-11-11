// app/api/run-simulation/route.ts

import { NextRequest } from 'next/server';
import { chromium, firefox, webkit, Page } from 'playwright';
import sharp from 'sharp';

type LogStep = { step: string; logs: string[]; image?: string; timestamp?: number; };

type InteractableElement = {
    id: number;
    realIndex: number;
    role: 'link' | 'button' | 'textbox';
    box: { x: number; y: number; width: number; height: number };
    text: string;
    placeholder: string | null;
    isHoverTarget: boolean;
};

type SessionState = {
    searchText: string | null;
    searchSubmitted: boolean;
    onSearchResults: boolean;
    onProductPage: boolean;
    currentUrl: string;
    lastAction: string;
    actionHistory: string[];
};

function sendSSE(controller: ReadableStreamDefaultController, data: any) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
}

async function retryAsync<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    delayMs: number = 500
): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }
    }

    throw lastError;
}

async function getInteractableElements(page: Page, baseSelector: string, maxElements: number = 80): Promise<InteractableElement[]> {
    const elements: InteractableElement[] = [];
    const locators = page.locator(baseSelector);
    const count = await locators.count();
    let cleanIdCounter = 0;

    const maxCount = Math.min(count, maxElements);

    for (let i = 0; i < maxCount; i++) {
        const locator = locators.nth(i);
        let box: { x: number; y: number; width: number; height: number } | null = null;

        try {
            box = await locator.boundingBox({ timeout: 50 });
        } catch (e) {
            continue;
        }

        if (!box || box.width === 0 || box.height === 0) continue;

        // ✅ NEW: Check if element is visible
        try {
            const isVisible = await locator.isVisible({ timeout: 50 });
            if (!isVisible) {
                console.log(`[SKIP] Element ${i} not visible`);
                continue;
            }
        } catch (e) {
            console.log(`[SKIP] Element ${i} visibility check failed`);
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

        // ✅ NEW: Skip elements without meaningful text
        if (!text || text === 'Kein Text') {
            console.log(`[SKIP] Element ${i} has no text`);
            continue;
        }

        elements.push({
            id: cleanIdCounter,
            realIndex: i,
            role,
            box,
            text: text.substring(0, 80),
            placeholder,
            isHoverTarget: false,
        });

        cleanIdCounter++;
    }

    return elements;
}

async function annotateImage(
    screenshotBuffer: Buffer,
    elements: InteractableElement[]
): Promise<string> {
    const { width, height } = await sharp(screenshotBuffer).metadata();

    const elementsToAnnotate = elements.slice(0, 50);

    const svgOverlays = elementsToAnnotate.map(el => `
    <rect x="${el.box.x}" y="${el.box.y}" width="${el.box.width}" height="${el.box.height}" 
          fill="none" stroke="red" stroke-width="2"/>
    <text x="${el.box.x + 5}" y="${el.box.y + 20}" 
          fill="red" font-size="16" font-weight="bold" font-family="Arial">${el.id}</text>
  `).join('');

    const svg = `<svg width="${width}" height="${height}">${svgOverlays}</svg>`;

    const annotatedBuffer = await sharp(screenshotBuffer)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .png()
        .toBuffer();

    return annotatedBuffer.toString('base64');
}

async function generatePersonaPrompt(task: string, domain: string, personaType: string): Promise<string> {
    const prompt = `
Du bist ein Senior UX Researcher. Erstelle eine **realistische, lebendige Persona** für einen Usability-Test.

Kontext:
- Domain: "${domain}"
- Persona-Typ: "${personaType}"
- Aufgabe: "${task}"

**Wichtig:**
1. Die Persona soll ein ECHTER MENSCH sein
2. Die Demografie soll zur Aufgabe passen
3. Schreibe in "Du"-Form
4. Gib der Persona: Name, Alter, Beruf, Lebenssituation, Motivation

Antworte NUR mit dem Persona-Text in "Du"-Form.
`;

    try {
        return await retryAsync(async () => {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                body: JSON.stringify({
                    model: 'mistral',
                    prompt,
                    stream: false,
                }),
            });

            if (!response.ok) throw new Error(`Ollama Fehler: ${response.statusText}`);

            const body = await response.json();
            return body.response.trim().replace(/^\"|\"$/g, '');
        }, 2, 500);
    } catch (e: any) {
        console.error("Persona-Generierung fehlgeschlagen:", e);
        return `Du bist ein durchschnittlicher Nutzer, der die Aufgabe "${task}" erledigen möchte.`;
    }
}

async function getVisualIntention(
    task: string,
    annotatedScreenshotBase64: string,
    personaPrompt: string,
    sessionState: SessionState
): Promise<string> {
    const isPragmatic = personaPrompt.toLowerCase().includes('pragmatisch');

    const prompt = `
${personaPrompt}

Deine Aufgabe: "${task}"

CURRENT STATE:
- Search typed: ${sessionState.searchText || 'none'}
- Search submitted: ${sessionState.searchSubmitted}
- On search results: ${sessionState.onSearchResults}
- Last action: ${sessionState.lastAction}

Schau das Bild an. Rote Boxen mit IDs sind interaktiv.

RULES:
1. Cookie-Banner? Klicke "OK" ZUERST!
2. ${isPragmatic ? 'Nutze die Suche!' : 'Stöbere!'}
3. ${sessionState.searchText && !sessionState.searchSubmitted ? '⚠️ Du hast getippt aber NICHT abgeschickt! Klicke Suchen-Button JETZT!' : ''}
4. ${sessionState.onSearchResults ? '✅ Auf Suchergebnissen! Klicke PRODUKT!' : ''}

Beschreibe deine Absicht in EINEM Satz mit ID [X].

Beispiele:
- "Ich klicke auf OK [12]"
- "Ich tippe 'Winter-Jeans' in [1]"
- "Ich klicke auf Lupen-Icon [2]"
- "Ich klicke auf Produkt [45]"

Antworte JETZT:
`;

    try {
        return await retryAsync(async () => {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                body: JSON.stringify({
                    model: 'llava',
                    prompt,
                    images: [annotatedScreenshotBase64],
                    stream: false,
                }),
            });

            if (!response.ok) throw new Error(`Llava Fehler: ${response.statusText}`);

            const body = await response.json();
            return body.response.trim();
        }, 2, 500);
    } catch (e: any) {
        console.error("Llava-Aufruf fehlgeschlagen:", e);
        throw new Error(`Llava nicht erreichbar: ${e.message}`);
    }
}

async function getLogicalAction(
    visualIntention: string,
    interactableElements: InteractableElement[],
    task: string,
    sessionState: SessionState
): Promise<any> {

    const idMatch = visualIntention.match(/\[(\d+)\]/);
    const suggestedId = idMatch ? parseInt(idMatch[1], 10) : null;

    const prompt = `
Du bist Logik-Modul. Setze Absicht in JSON um.

Pilot sagt: "${visualIntention}"
Aufgabe: "${task}"

STATE:
- Search typed: "${sessionState.searchText || 'none'}"
- Search submitted: ${sessionState.searchSubmitted}
- On search results: ${sessionState.onSearchResults}
- Last: ${sessionState.actionHistory.slice(-2).join(', ')}

${suggestedId !== null ? `⚠️ Pilot erwähnte ID ${suggestedId}! VERWENDE SIE!` : ''}

Elemente (Top 30):
${JSON.stringify(interactableElements.slice(0, 30), null, 2)}

RULES:
1. Pilot ID ${suggestedId} → VERWENDE SIE!
2. "tippen" → NUR role: "textbox"
3. "klicken" → NUR role: "link" oder "button"
4. ${sessionState.searchText && !sessionState.searchSubmitted ? '⚠️ Search NOT submitted! Click search button!' : ''}

Antworte NUR mit JSON:
{ "action": "type", "idToInteract": <num>, "textToType": "<text>", "rationale": "..." }
{ "action": "click", "idToInteract": <num>, "rationale": "..." }
{ "action": "scroll", "direction": "down", "pixels": 500, "rationale": "..." }
{ "action": "finish", "rationale": "..." }
`;

    try {
        const actionJson = await retryAsync(async () => {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                body: JSON.stringify({
                    model: 'mistral',
                    prompt,
                    format: 'json',
                    stream: false,
                }),
            });

            if (!response.ok) throw new Error(`Mistral Fehler: ${response.statusText}`);

            const body = await response.json();
            const rawResponse = body.response as string;
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);

            if (!jsonMatch || !jsonMatch[0]) {
                throw new Error(`Mistral gab kein JSON zurück`);
            }

            return JSON.parse(jsonMatch[0]);
        }, 2, 500);

        const chosenId = parseInt(String(actionJson.idToInteract), 10);
        const elementToInteract = interactableElements.find(el => el.id === chosenId);

        // Smart Validation
        if (actionJson.action === 'type') {
            if (!elementToInteract || elementToInteract.role !== 'textbox') {
                console.error(`❌ Type on wrong element ID ${chosenId}`);

                const textboxes = interactableElements.filter(el => el.role === 'textbox');

                if (textboxes.length > 0) {
                    if (suggestedId !== null) {
                        const suggestedElement = interactableElements.find(el => el.id === suggestedId);
                        if (suggestedElement && suggestedElement.role === 'textbox') {
                            actionJson.idToInteract = suggestedId;
                            return actionJson;
                        }
                    }

                    actionJson.idToInteract = textboxes[0].id;
                    return actionJson;
                } else {
                    throw new Error(`Keine textbox gefunden`);
                }
            }
        }

        if (actionJson.action === 'click') {
            if (!elementToInteract || (elementToInteract.role !== 'link' && elementToInteract.role !== 'button')) {
                console.error(`❌ Click on wrong element ID ${chosenId}`);

                const clickables = interactableElements.filter(el => el.role === 'link' || el.role === 'button');

                if (clickables.length > 0) {
                    if (suggestedId !== null) {
                        const suggestedElement = interactableElements.find(el => el.id === suggestedId);
                        if (suggestedElement && (suggestedElement.role === 'link' || suggestedElement.role === 'button')) {
                            actionJson.idToInteract = suggestedId;
                            return actionJson;
                        }
                    }

                    const closestClickable = clickables.reduce((closest, current) => {
                        const currentDist = Math.abs(current.id - chosenId);
                        const closestDist = Math.abs(closest.id - chosenId);
                        return currentDist < closestDist ? current : closest;
                    });

                    actionJson.idToInteract = closestClickable.id;
                    return actionJson;
                } else {
                    throw new Error(`Kein clickable Element gefunden`);
                }
            }
        }

        if ((actionJson.action === 'click' || actionJson.action === 'type')) {
            if (!elementToInteract || isNaN(chosenId)) {
                throw new Error(`ID ${chosenId} existiert nicht`);
            }
        }

        return actionJson;

    } catch (e: any) {
        console.error("Mistral-Aufruf fehlgeschlagen:", e);
        throw new Error(`Mistral nicht erreichbar: ${e.message}`);
    }
}

function stripAnsiCodes(str: string): string {
    return str.replace(/[\u001b\u009b][[()#;?]?[0-9]{1,4}(?:;[0-9]{0,4})?[0-9A-ORZcf-nqry=><]/g, '');
}

async function preFlightCookieClick(
    page: Page,
    logHistory: string[],
    structuredLog: LogStep[],
    controller?: ReadableStreamDefaultController
) {
    const currentStepLogs: string[] = [];
    const cookieRegex = /^(OK|Alle akzeptieren|Einwilligung|Akzeptieren|Verstanden|Alle annehmen)$/i;

    try {
        const cookieButton = page.getByRole('button', { name: cookieRegex, exact: false }).first();
        await cookieButton.waitFor({ state: 'visible', timeout: 3000 });

        const buttonText = (await cookieButton.innerText()) || "OK";
        currentStepLogs.push(`✓ Cookie-Banner: "${buttonText}"`);

        await cookieButton.click({ force: true, timeout: 3000 });
        logHistory.push(`Cookie akzeptiert`);
        await page.waitForTimeout(500);

        const cookieStep: LogStep = {
            step: "Schritt 1.5 (Cookie-Banner)",
            logs: currentStepLogs,
            image: (await page.screenshot({ type: 'png' })).toString('base64'),
            timestamp: Date.now()
        };

        structuredLog.push(cookieStep);

        if (controller) {
            sendSSE(controller, { type: 'step', step: cookieStep, progress: 38 });
        }
    } catch (error) {
        currentStepLogs.push("ℹ️ Kein Cookie-Banner");
    }
}

export async function POST(request: NextRequest) {
    const { url, task, browserType, clickDepth, domain, personaType } = await request.json() as {
        url: string;
        task: string;
        browserType: 'chrome' | 'firefox' | 'safari';
        clickDepth: number;
        domain: string;
        personaType: string;
    };

    if (!url || !task || !domain || !personaType) {
        return new Response(
            JSON.stringify({ message: 'URL, Aufgabe, Domain und Persona erforderlich' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const stream = new ReadableStream({
        async start(controller) {
            const structuredLog: LogStep[] = [];
            const logHistory: string[] = [];
            let browser = null;
            const elementSelector = 'a[href], button, input[type="text"], input[type="search"], textarea';

            const sessionState: SessionState = {
                searchText: null,
                searchSubmitted: false,
                onSearchResults: false,
                onProductPage: false,
                currentUrl: '',
                lastAction: '',
                actionHistory: []
            };

            try {
                console.log(`[START] Simulation gestartet für ${url}`);

                sendSSE(controller, { type: 'progress', value: 10, status: 'Generiere Persona...' });

                const personaPrompt = await generatePersonaPrompt(task, domain, personaType);
                console.log(`[PERSONA] Generated`);

                sendSSE(controller, { type: 'progress', value: 20, status: 'Starte Browser...' });

                switch (browserType) {
                    case 'firefox': browser = await firefox.launch({ headless: true }); break;
                    case 'safari': browser = await webkit.launch({ headless: true }); break;
                    default: browser = await chromium.launch({ headless: true });
                }

                const page = await browser.newPage({
                    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                });

                sendSSE(controller, { type: 'progress', value: 30, status: 'Lade Website...' });

                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

                sessionState.currentUrl = page.url();
                console.log(`[LOADED] ${sessionState.currentUrl}`);

                const startStep: LogStep = {
                    step: "Schritt 1 (Start)",
                    logs: [`✓ Navigiere zu: ${url}`],
                    image: (await page.screenshot({ type: 'png' })).toString('base64'),
                    timestamp: Date.now()
                };
                structuredLog.push(startStep);
                sendSSE(controller, { type: 'step', step: startStep, progress: 35 });

                const personaLines = personaPrompt.split('\n').filter(l => l.trim());
                const personaStep: LogStep = {
                    step: "Schritt 1.2 (Persona-Briefing)",
                    logs: [
                        "✓ KI-Agent instruiert:",
                        "─".repeat(50),
                        ...personaLines,
                        "─".repeat(50)
                    ],
                    timestamp: Date.now()
                };
                structuredLog.push(personaStep);
                sendSSE(controller, { type: 'step', step: personaStep, progress: 40 });

                await preFlightCookieClick(page, logHistory, structuredLog, controller);

                const totalSteps = clickDepth;
                for (let i = 0; i < totalSteps; i++) {
                    const progressPercent = 40 + Math.round((i / totalSteps) * 50);
                    const currentStepName = `Schritt ${i + 2}/${totalSteps + 2}`;
                    const currentStepLogs: string[] = [];

                    console.log(`\n[STEP ${i + 1}/${totalSteps}] Starting...`);

                    sendSSE(controller, { type: 'progress', value: progressPercent, status: currentStepName });

                    await page.waitForTimeout(200);

                    const screenshotBuffer = await page.screenshot({ type: 'png' });
                    const interactableElements = await getInteractableElements(page, elementSelector);

                    currentStepLogs.push(`📊 Gefunden: ${interactableElements.length} Elemente`);
                    console.log(`[STEP ${i + 1}] Found ${interactableElements.length} elements`);

                    if (interactableElements.length === 0) {
                        currentStepLogs.push("⚠️ Keine Elemente. Scrolle...");
                        console.log(`[STEP ${i + 1}] No elements, scrolling...`);

                        await page.mouse.wheel(0, 500);
                        sessionState.lastAction = 'scroll';
                        sessionState.actionHistory.push('scroll');

                        const scrollStep: LogStep = {
                            step: currentStepName,
                            logs: currentStepLogs,
                            image: screenshotBuffer.toString('base64'),
                            timestamp: Date.now()
                        };
                        structuredLog.push(scrollStep);
                        sendSSE(controller, { type: 'step', step: scrollStep });

                        await page.waitForTimeout(500);
                        const elementsAfterScroll = await getInteractableElements(page, elementSelector);
                        console.log(`[STEP ${i + 1}] After scroll: ${elementsAfterScroll.length} elements`);

                        if (elementsAfterScroll.length === 0) {
                            currentStepLogs.push("❌ Immer noch keine Elemente. Abbruch.");
                            console.error(`[STEP ${i + 1}] Still no elements. Breaking.`);

                            const errorStep: LogStep = {
                                step: currentStepName + " (Fehler)",
                                logs: [...currentStepLogs, "Keine interaktiven Elemente gefunden."],
                                image: screenshotBuffer.toString('base64'),
                                timestamp: Date.now()
                            };
                            structuredLog.push(errorStep);
                            sendSSE(controller, { type: 'step', step: errorStep });
                            break;
                        }

                        continue;
                    }

                    console.log(`[STEP ${i + 1}] Processing ${interactableElements.length} elements...`);

                    currentStepLogs.push(`📊 Annotiere ${interactableElements.length} Elemente`);
                    const annotatedScreenshotBase64 = await annotateImage(screenshotBuffer, interactableElements);

                    currentStepLogs.push(`👁️ Llava analysiert...`);
                    console.log(`[STEP ${i + 1}] Calling Llava...`);

                    let visualIntention;
                    try {
                        visualIntention = await getVisualIntention(task, annotatedScreenshotBase64, personaPrompt, sessionState);
                        console.log(`[STEP ${i + 1}] Llava: "${visualIntention}"`);
                    } catch (error) {
                        currentStepLogs.push(`❌ Llava Fehler: ${error instanceof Error ? error.message : 'Unknown'}`);
                        console.error(`[STEP ${i + 1}] Llava error:`, error);

                        const errorStep: LogStep = {
                            step: currentStepName + " (Llava Fehler)",
                            logs: currentStepLogs,
                            image: annotatedScreenshotBase64,
                            timestamp: Date.now()
                        };
                        structuredLog.push(errorStep);
                        sendSSE(controller, { type: 'step', step: errorStep });
                        break;
                    }

                    currentStepLogs.push(`💭 "${visualIntention}"`);
                    currentStepLogs.push(``);

                    currentStepLogs.push(`🧠 Mistral entscheidet...`);
                    console.log(`[STEP ${i + 1}] Calling Mistral...`);

                    let aiAction;
                    try {
                        aiAction = await getLogicalAction(visualIntention, interactableElements, task, sessionState);
                        console.log(`[STEP ${i + 1}] Mistral action:`, aiAction);
                    } catch (error) {
                        currentStepLogs.push(`❌ Mistral Fehler: ${error instanceof Error ? error.message : 'Unknown'}`);
                        console.error(`[STEP ${i + 1}] Mistral error:`, error);

                        const errorStep: LogStep = {
                            step: currentStepName + " (Mistral Fehler)",
                            logs: currentStepLogs,
                            image: annotatedScreenshotBase64,
                            timestamp: Date.now()
                        };
                        structuredLog.push(errorStep);
                        sendSSE(controller, { type: 'step', step: errorStep });
                        break;
                    }

                    const currentStep: LogStep = {
                        step: currentStepName,
                        logs: currentStepLogs,
                        image: annotatedScreenshotBase64,
                        timestamp: Date.now()
                    };

                    const chosenId = parseInt(String(aiAction.idToInteract), 10);
                    const elementToInteract = interactableElements.find(el => el.id === chosenId);

                    if ((aiAction.action === 'click' || aiAction.action === 'type') &&
                        (!elementToInteract || isNaN(chosenId))) {
                        currentStepLogs.push(``);
                        currentStepLogs.push(`❌ FEHLER: ID ${chosenId} existiert nicht`);
                        console.error(`[STEP ${i + 1}] Invalid ID ${chosenId}`);
                        structuredLog.push(currentStep);
                        sendSSE(controller, { type: 'step', step: currentStep });
                        break;
                    }

                    try {
                        const { role, text, realIndex } = elementToInteract || {};
                        const locator = elementToInteract ? page.locator(elementSelector).nth(realIndex!) : null;

                        currentStepLogs.push(`📋 Action: ${aiAction.action}`);
                        if (aiAction.idToInteract !== undefined) {
                            currentStepLogs.push(`   Target: ID ${chosenId} (${role}: "${text}")`);
                        }
                        if (aiAction.textToType) {
                            currentStepLogs.push(`   Text: "${aiAction.textToType}"`);
                        }
                        currentStepLogs.push(`   Rationale: "${aiAction.rationale || ''}"`);
                        currentStepLogs.push(``);

                        if (aiAction.action === 'click' && locator && (role === 'link' || role === 'button')) {
                            currentStepLogs.push(`🖱️ Klicke auf "${text}" [ID ${chosenId}]`);
                            console.log(`[STEP ${i + 1}] Clicking ID ${chosenId}`);

                            const startUrl = page.url();
                            await locator.click({ timeout: 8000 });
                            await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
                            const endUrl = page.url();

                            sessionState.currentUrl = endUrl;
                            sessionState.lastAction = 'click';
                            sessionState.actionHistory.push(`click:${text}`);

                            if (endUrl.includes('/suche/') || endUrl.includes('/search/') || endUrl.includes('?q=')) {
                                sessionState.onSearchResults = true;
                                sessionState.searchSubmitted = true;
                                currentStepLogs.push(`   ✅ Auf Suchergebnissen!`);
                            }

                            if (startUrl !== endUrl) {
                                currentStepLogs.push(`   ✓ Navigation: ${endUrl}`);
                            } else {
                                currentStepLogs.push(`   ✓ Geklickt`);
                            }

                            logHistory.push(`Klick: ${text}`);

                        } else if (aiAction.action === 'type' && locator && role === 'textbox' && aiAction.textToType) {
                            currentStepLogs.push(`⌨️ Tippe "${aiAction.textToType}" [ID ${chosenId}]`);
                            console.log(`[STEP ${i + 1}] Typing "${aiAction.textToType}"`);

                            await locator.fill(aiAction.textToType, { timeout: 8000 });

                            try {
                                await locator.press('Enter', { timeout: 2000 });
                                await page.waitForLoadState('domcontentloaded', { timeout: 8000 });

                                sessionState.searchText = aiAction.textToType;
                                sessionState.searchSubmitted = true;
                                sessionState.currentUrl = page.url();

                                if (page.url().includes('/suche/') || page.url().includes('/search/')) {
                                    sessionState.onSearchResults = true;
                                }

                                currentStepLogs.push(`   ✓ Getippt + Enter`);
                                logHistory.push(`Tippe: ${aiAction.textToType} + Enter`);
                            } catch {
                                sessionState.searchText = aiAction.textToType;
                                sessionState.searchSubmitted = false;
                                currentStepLogs.push(`   ✓ Getippt (Enter fehlgeschlagen)`);
                                logHistory.push(`Tippe: ${aiAction.textToType}`);
                            }

                            sessionState.lastAction = 'type';
                            sessionState.actionHistory.push(`type:${aiAction.textToType}`);

                        } else if (aiAction.action === 'scroll') {
                            const pixels = aiAction.pixels || 500;
                            currentStepLogs.push(`📜 Scrolle ${pixels}px`);
                            console.log(`[STEP ${i + 1}] Scrolling ${pixels}px`);
                            await page.mouse.wheel(0, pixels);
                            currentStepLogs.push(`   ✓ Gescrollt`);
                            sessionState.lastAction = 'scroll';
                            sessionState.actionHistory.push('scroll');

                        } else if (aiAction.action === 'finish') {
                            currentStepLogs.push(`✅ Aufgabe abgeschlossen!`);
                            currentStepLogs.push(`   ${aiAction.rationale}`);
                            console.log(`[STEP ${i + 1}] Finished!`);
                            structuredLog.push(currentStep);
                            sendSSE(controller, { type: 'step', step: currentStep });
                            break;

                        } else {
                            currentStepLogs.push(`❌ Ungültige Aktion: ${aiAction.action} auf ${role}`);
                            console.error(`[STEP ${i + 1}] Invalid action ${aiAction.action} on ${role}`);
                            structuredLog.push(currentStep);
                            sendSSE(controller, { type: 'step', step: currentStep });
                            break;
                        }

                        structuredLog.push(currentStep);
                        sendSSE(controller, { type: 'step', step: currentStep });

                    } catch (interactionError: any) {
                        const errorMsg = stripAnsiCodes(interactionError.message);
                        currentStepLogs.push(``);
                        currentStepLogs.push(`❌ Fehler: ${errorMsg}`);
                        console.error(`[STEP ${i + 1}] Interaction error:`, interactionError);
                        structuredLog.push(currentStep);
                        sendSSE(controller, { type: 'step', step: currentStep });
                        throw interactionError;
                    }
                }

                console.log(`[COMPLETE] Simulation finished with ${structuredLog.length} steps`);
                sendSSE(controller, { type: 'progress', value: 100, status: 'Abgeschlossen!' });
                sendSSE(controller, { type: 'complete', log: structuredLog });

            } catch (error: any) {
                const errorMessage = stripAnsiCodes((error instanceof Error) ? error.message : "Unbekannter Fehler");
                console.error("[ERROR] Simulation Error:", errorMessage);
                sendSSE(controller, {
                    type: 'error',
                    message: errorMessage,
                    log: structuredLog
                });
            } finally {
                if (browser) await browser.close();
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
