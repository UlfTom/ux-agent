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

        try {
            const isVisible = await locator.isVisible({ timeout: 50 });
            if (!isVisible) continue;
        } catch (e) {
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

        if (!text || text.length === 0) continue;

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
    sessionState: SessionState,
    currentUrl: string
): Promise<string> {
    const isPragmatic = personaPrompt.toLowerCase().includes('pragmatisch');
    const typeCount = sessionState.actionHistory.filter(a => a.includes('type')).length;
    const isOnSearchResults = currentUrl.includes('/suche/') ||
        currentUrl.includes('/search/') ||
        currentUrl.includes('winter') ||
        sessionState.onSearchResults;

    const prompt = `
${personaPrompt}

AUFGABE: "${task}"

🔴 CRITICAL STATE:
- Current URL: ${currentUrl}
- Search Text: "${sessionState.searchText || 'none'}"
- Search Submitted: ${sessionState.searchSubmitted}
- On Search Results Page: ${isOnSearchResults}
- Times Typed: ${typeCount}
- Last 3 Actions: ${sessionState.actionHistory.slice(-3).join(' → ')}

${typeCount >= 2 ?
            `🚫🚫🚫 ACHTUNG! Du hast BEREITS ${typeCount}x "${sessionState.searchText}" getippt! 
  NICHT NOCHMAL TIPPEN! Die Suche läuft! Du musst jetzt PRODUKTE ANSCHAUEN!` : ''}

${isOnSearchResults ?
            `✅✅✅ DU BIST AUF DER SUCHERGEBNISSEITE! 
  Die URL enthält "/suche/" oder Produktliste ist sichtbar!
  Siehst du Produkt-Bilder oder Jeans-Fotos? KLICKE AUF EIN PRODUKT!
  NICHT NOCHMAL IN DIE SUCHE TIPPEN! KLICKE EIN PRODUKT AN!` : ''}

Schau das Bild an. Rote Boxen mit IDs sind interaktiv.

GENERIC RULES (SEHR WICHTIG):
1. Cookie-Banner sichtbar? → Klicke "OK" [ID]
2. Noch keine Suche getippt? → Tippe EINMAL in Suchfeld
3. ${typeCount >= 1 ? '⚠️ Suche läuft bereits! NICHT NOCHMAL TIPPEN! Klicke Produkt!' : ''}
4. Siehst du Produktbilder/Fotos von Jeans/Kleidung? → KLICKE AUF EIN PRODUKT [ID]!
5. Wenig Produkte sichtbar? → Scrolle nach unten
6. ${isPragmatic ? 'Du bist PRAGMATISCH: Nutze Suche!' : 'Du bist EXPLORATIVER: Stöbere!'}

Was machst du JETZT? Antworte in EINEM kurzen Satz mit ID [X].

Beispiele:
- "Ich klicke auf Cookie OK [5]"
- "Ich tippe 'Winter-Jeans' in Suchfeld [0]"
- "Ich klicke auf das erste Jeans-Produkt [12]"
- "Ich scrolle nach unten für mehr Produkte"

Antworte JETZT in einem kurzen Satz:
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
- On results: ${sessionState.onSearchResults}
- Last 3: ${sessionState.actionHistory.slice(-3).join(', ')}

${suggestedId !== null ? `⚠️ Pilot erwähnte ID ${suggestedId}! VERWENDE SIE wenn möglich!` : ''}

Elemente (Top 30):
${JSON.stringify(interactableElements.slice(0, 30), null, 2)}

RULES:
1. Pilot ID ${suggestedId} → VERWENDE SIE wenn valid!
2. "tippen" → NUR role: "textbox"
3. "klicken" → NUR role: "link" oder "button"
4. ${sessionState.actionHistory.filter(a => a.includes('type')).length >= 2 ? '⚠️ BEREITS 2x getippt! Nicht nochmal "type"!' : ''}

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

        if (actionJson.action === 'type') {
            if (!elementToInteract || elementToInteract.role !== 'textbox') {
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

async function checkAndDismissCookie(page: Page, logs: string[]): Promise<boolean> {
    try {
        const cookieRegex = /^(OK|Alle akzeptieren|Akzeptieren|Accept|Verstanden|Einwilligung|Zustimmen)$/i;
        const cookieButton = page.getByRole('button', { name: cookieRegex }).first();

        const isVisible = await cookieButton.isVisible({ timeout: 1000 });
        if (isVisible) {
            logs.push('🍪 Cookie-Banner! Klicke OK...');
            await cookieButton.click({ timeout: 3000 });
            await page.waitForTimeout(500);
            logs.push('✓ Cookie dismissed');
            return true;
        }
    } catch {
        // No cookie
    }
    return false;
}

async function preFlightCookieClick(
    page: Page,
    logHistory: string[],
    structuredLog: LogStep[],
    controller?: ReadableStreamDefaultController
) {
    const currentStepLogs: string[] = [];

    const dismissed = await checkAndDismissCookie(page, currentStepLogs);

    if (dismissed) {
        logHistory.push(`Cookie akzeptiert`);

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
    } else {
        currentStepLogs.push("ℹ️ Kein Cookie-Banner");
    }
}

function updateSessionState(page: Page, sessionState: SessionState) {
    const currentUrl = page.url();
    sessionState.currentUrl = currentUrl;

    if (currentUrl.includes('/suche/') ||
        currentUrl.includes('/search/') ||
        currentUrl.includes('?q=') ||
        currentUrl.includes('/results')) {
        sessionState.onSearchResults = true;
        sessionState.searchSubmitted = true;
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
                console.log(`[START] Simulation für ${url}`);

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

                updateSessionState(page, sessionState);
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

                    await checkAndDismissCookie(page, currentStepLogs);

                    await page.waitForTimeout(200);

                    // ENHANCED LOOP DETECTION
                    const recentActions = sessionState.actionHistory.slice(-3);
                    const allSame = recentActions.length >= 3 && recentActions.every(a => a === recentActions[0]);

                    if (allSame) {
                        currentStepLogs.push(`⚠️ LOOP DETECTED: "${recentActions[0]}" 3x wiederholt`);
                        currentStepLogs.push(`🔄 Force: Scroll + Try Click Product`);
                        console.log(`[STEP ${i + 1}] Loop detected, forcing action`);

                        await page.mouse.wheel(0, 800);
                        await page.waitForTimeout(500);

                        sessionState.lastAction = 'force_scroll';
                        sessionState.actionHistory.push('force_scroll');

                        // Try auto-click product
                        try {
                            const productLinks = page.locator('a[href*="/p/"]').first();
                            const visible = await productLinks.isVisible({ timeout: 2000 });
                            if (visible) {
                                currentStepLogs.push(`🎯 Auto-Click: Erstes Produkt`);
                                await productLinks.click({ timeout: 3000 });
                                await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
                                sessionState.actionHistory.push('auto_click_product');
                            }
                        } catch {
                            currentStepLogs.push(`⚠️ Kein Produkt für Auto-Click gefunden`);
                        }

                        updateSessionState(page, sessionState);

                        const scrollStep: LogStep = {
                            step: currentStepName + " (Loop Break)",
                            logs: currentStepLogs,
                            image: (await page.screenshot({ type: 'png' })).toString('base64'),
                            timestamp: Date.now()
                        };
                        structuredLog.push(scrollStep);
                        sendSSE(controller, { type: 'step', step: scrollStep });
                        continue;
                    }

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

                        updateSessionState(page, sessionState);

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

                    console.log(`[STEP ${i + 1}] Processing...`);

                    currentStepLogs.push(`📊 Annotiere ${interactableElements.length} Elemente`);
                    const annotatedScreenshotBase64 = await annotateImage(screenshotBuffer, interactableElements);

                    currentStepLogs.push(`👁️ Llava analysiert...`);
                    console.log(`[STEP ${i + 1}] Calling Llava...`);

                    let visualIntention;
                    try {
                        visualIntention = await getVisualIntention(task, annotatedScreenshotBase64, personaPrompt, sessionState, page.url());
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
                            currentStepLogs.push(`🖱️ Klicke auf "${text || 'Element'}" [ID ${chosenId}]`);
                            console.log(`[STEP ${i + 1}] Clicking ID ${chosenId}`);

                            const startUrl = page.url();
                            await locator.click({ timeout: 8000 });
                            await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
                            const endUrl = page.url();

                            updateSessionState(page, sessionState);
                            sessionState.lastAction = 'click';
                            sessionState.actionHistory.push(`click:${text?.substring(0, 20) || 'element'}`);

                            if (startUrl !== endUrl) {
                                currentStepLogs.push(`   ✓ Navigation: ${endUrl}`);
                            } else {
                                currentStepLogs.push(`   ✓ Geklickt`);
                            }

                            logHistory.push(`Klick: ${text || 'Element'}`);

                        } else if (aiAction.action === 'type' && locator && role === 'textbox' && aiAction.textToType) {
                            currentStepLogs.push(`⌨️ Tippe "${aiAction.textToType}" [ID ${chosenId}]`);
                            console.log(`[STEP ${i + 1}] Typing "${aiAction.textToType}"`);

                            await locator.fill(aiAction.textToType, { timeout: 8000 });

                            // Auto-submit with URL detection
                            try {
                                await locator.press('Enter', { timeout: 2000 });
                                await page.waitForLoadState('domcontentloaded', { timeout: 8000 });

                                // CRITICAL FIX: Wait for URL to update
                                await page.waitForTimeout(1000);

                                sessionState.searchText = aiAction.textToType;
                                sessionState.searchSubmitted = true;

                                updateSessionState(page, sessionState);

                                const newUrl = page.url();
                                currentStepLogs.push(`   ✓ Getippt + Enter`);
                                currentStepLogs.push(`   URL: ${newUrl}`);

                                if (newUrl.includes('/suche/') || newUrl.includes('/search/')) {
                                    currentStepLogs.push(`   ✅ Auf Suchergebnissen erkannt!`);
                                }

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
                            console.error(`[STEP ${i + 1}] Invalid action`);
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

                console.log(`[COMPLETE] ${structuredLog.length} steps`);
                sendSSE(controller, { type: 'progress', value: 100, status: 'Abgeschlossen!' });
                sendSSE(controller, { type: 'complete', log: structuredLog });

            } catch (error: any) {
                const errorMessage = stripAnsiCodes((error instanceof Error) ? error.message : "Unbekannter Fehler");
                console.error("[ERROR]", errorMessage);
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
