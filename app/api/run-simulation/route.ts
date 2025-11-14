// app/api/run-simulation/route.ts
// ⭐️ KORRIGIERTE FINALE VERSION (SAUBER) ⭐️

import { NextRequest } from 'next/server';
import { launchBrowser, updateSessionState, checkAndDismissCookie } from '@/app/_lib/simulation/browser';
import { getInteractableElements } from '@/app/_lib/simulation/elements';
import { annotateImage } from '@/app/_lib/simulation/vision';
import { pragmaticPersonaDE } from '@/app/_lib/simulation/persona-cache';
import { getPlan } from '@/app/_lib/simulation/react-agent/plan';
import { observeCurrentState } from '@/app/_lib/simulation/react-agent/observe';
import { verifyPlanMatch } from '@/app/_lib/simulation/react-agent/verify';
import { executeAction } from '@/app/_lib/simulation/react-agent/execute';
import { reflectOnProgress } from '@/app/_lib/simulation/react-agent/reflect';
import { sendSSE, stripAnsiCodes } from '@/app/_lib/simulation/utils';
import { LogStep, SessionState, Language, PersonaType, InteractableElement } from '@/app/_lib/simulation/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const { url, task, browserType, clickDepth, domain, personaType, language, debugMode = true } = await request.json() as {
        url: string;
        task: string;
        browserType: 'chrome' | 'firefox' | 'safari';
        clickDepth: number;
        domain: string;
        personaType: PersonaType;
        language?: Language;
        debugMode?: boolean;
    };

    const lang: Language = language || 'de';
    const maxSteps = clickDepth || 8;

    if (!url || !task || !domain || !personaType) {
        return new Response(JSON.stringify({ message: 'URL, Aufgabe, Domain und Persona erforderlich' }), { status: 400 });
    }

    const stream = new ReadableStream({
        async start(controller) {
            const structuredLog: LogStep[] = [];
            let browser: any = null;

            const sessionState: SessionState = {
                searchText: null, searchSubmitted: false, onSearchResults: false, onProductPage: false,
                currentUrl: '', lastAction: '', actionHistory: [], seenSearchField: false,
                searchFieldPosition: 'unknown', scrollCount: 0, consecutiveScrolls: 0
            };

            let plan: string = "";
            let observation: string = "";
            let verification: any = {};
            let result: string = "";
            let reflection: string = "";
            let elements: InteractableElement[] = [];
            let screenshotBuffer: Buffer;
            let annotated: string | null = null;

            try {
                console.log(`[START] Simulation for ${url} (Debug: ${debugMode})`);
                sendSSE(controller, { type: 'progress', value: 10, status: lang === 'de' ? 'Lade Persona...' : 'Loading persona...' });

                const personaPrompt = pragmaticPersonaDE;
                console.log(`[PERSONA] Loaded from cache`);

                const personaLines = personaPrompt.split('\n').filter(l => l.trim());
                const personaStep: LogStep = {
                    step: "Schritt 1.2 (Persona-Briefing)",
                    logs: ["✓ KI-Agent instruiert:", "─".repeat(50), ...personaLines, "─".repeat(50)],
                    timestamp: Date.now()
                };
                structuredLog.push(personaStep);
                sendSSE(controller, { type: 'step', step: personaStep, progress: 15 });

                sendSSE(controller, { type: 'progress', value: 20, status: lang === 'de' ? 'Starte Browser...' : 'Starting browser...' });
                browser = await launchBrowser(browserType);
                const page = await browser.newPage({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    viewport: { width: 1920, height: 1080 }
                });

                sendSSE(controller, { type: 'progress', value: 30, status: lang === 'de' ? 'Lade Website...' : 'Loading website...' });
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                updateSessionState(page, sessionState);
                console.log(`[LOADED] ${sessionState.currentUrl}`);

                if (debugMode) {
                    const startStep: LogStep = {
                        step: "Schritt 1 (Start)",
                        logs: [`✓ Navigiere zu: ${url}`],
                        image: (await page.screenshot({ type: 'png' })).toString('base64'),
                        timestamp: Date.now()
                    };
                    structuredLog.push(startStep);
                    sendSSE(controller, { type: 'step', step: startStep, progress: 35 });
                }

                const cookieLogs: string[] = [];
                const dismissed = await checkAndDismissCookie(page, cookieLogs);
                if (dismissed && debugMode) {
                    await page.waitForTimeout(1000);
                    const cookieStep: LogStep = {
                        step: "Schritt 1.5 (Cookie-Banner)",
                        logs: cookieLogs,
                        image: (await page.screenshot({ type: 'png' })).toString('base64'),
                        timestamp: Date.now()
                    };
                    structuredLog.push(cookieStep);
                    sendSSE(controller, { type: 'step', step: cookieStep, progress: 38 });
                }

                // MAIN REACT LOOP
                for (let i = 0; i < maxSteps; i++) {
                    const progress = 40 + Math.round((i / maxSteps) * 50);
                    const stepName = `Schritt ${i + 2}/${maxSteps + 2}`;
                    const stepLogs: string[] = [];
                    const step_timings_ms: Record<string, number> = {};
                    let stepStart = Date.now();

                    console.log(`\n[STEP ${i + 1}/${maxSteps}] ReAct Loop Starting...`);
                    sendSSE(controller, { type: 'progress', value: progress, status: stepName });

                    await checkAndDismissCookie(page, stepLogs);
                    await page.waitForTimeout(500);

                    // 1️⃣ PLAN
                    stepStart = Date.now();
                    try {
                        plan = await getPlan(task, personaPrompt, personaType, sessionState, page.url(), lang);
                        step_timings_ms.plan = Date.now() - stepStart;
                        console.log(`[STEP ${i + 1}] Plan: "${plan}" (${step_timings_ms.plan}ms)`);
                        stepLogs.push(` 💭 Plan: "${plan}"`);
                        stepLogs.push(` ⏱️ Plan: ${step_timings_ms.plan}ms`);
                    } catch (error: any) {
                        stepLogs.push(` ❌ Plan Error: ${error.message}`);
                        console.error(`[STEP ${i + 1}] Plan error:`, error);
                        break;
                    }

                    // 2️⃣ OBSERVE
                    stepStart = Date.now();
                    annotated = null;
                    try {
                        screenshotBuffer = await page.screenshot({ type: 'png' });

                        // ⭐️ KORREKTUR: 'onSearchResults' wird übergeben
                        elements = await getInteractableElements(page, sessionState.onSearchResults);
                        console.log(`[STEP ${i + 1}] Found ${elements.length} elements (OnSearchResults: ${sessionState.onSearchResults})`);

                        if (debugMode) {
                            annotated = await annotateImage(screenshotBuffer, elements);
                        }

                        observation = await observeCurrentState(page, plan, elements, annotated || screenshotBuffer.toString('base64'), lang);

                        step_timings_ms.observe = Date.now() - stepStart;
                        stepLogs.push(` 📊 Gefunden: ${elements.length} Elemente`);
                        stepLogs.push(` 🎯 Top 5: ${elements.slice(0, 5).map(e => `[${e.id}:${e.role}:${e.text?.substring(0, 20) || 'no-text'}] (Prio: ${e.priorityScore})`).join(', ')}`);
                        stepLogs.push(` 👀 Observation: "${observation.substring(0, 100)}..."`);
                        stepLogs.push(` ⏱️ Observe (inkl. Screenshot/Elements): ${step_timings_ms.observe}ms`);
                    } catch (error: any) {
                        stepLogs.push(` ❌ Observation Error: ${error.message}`);
                        console.error(`[STEP ${i + 1}] Observation error:`, error);
                        break;
                    }

                    // 3️⃣ VERIFY
                    stepStart = Date.now();
                    try {
                        verification = await verifyPlanMatch(plan, observation, elements, sessionState, task, personaType, lang);
                        step_timings_ms.verify = Date.now() - stepStart;
                        console.log(`[STEP ${i + 1}] Verify: ${verification.action} (${step_timings_ms.verify}ms)`);
                        stepLogs.push(` 🎬 Action: ${verification.action}${verification.elementId !== undefined ? ` [ID ${verification.elementId}]` : ''}`);
                        stepLogs.push(` 📝 Rationale: "${verification.rationale}"`);
                        stepLogs.push(` ⏱️ Verify: ${step_timings_ms.verify}ms`);
                    } catch (error: any) {
                        stepLogs.push(` ❌ Verification Error: ${error.message}`);
                        console.error(`[STEP ${i + 1}] Verification error:`, error);
                        break;
                    }

                    // 4️⃣ EXECUTE
                    stepStart = Date.now();
                    try {
                        result = await executeAction(verification, page, elements, task, personaType);
                        step_timings_ms.execute = Date.now() - stepStart;
                        console.log(`[STEP ${i + 1}] Execute: "${result}" (${step_timings_ms.execute}ms)`);
                        stepLogs.push(` ✅ ${result}`);
                        stepLogs.push(` ⏱️ Execute: ${step_timings_ms.execute}ms`);
                    } catch (error: any) {
                        result = `Fehler: ${error.message}`;
                        stepLogs.push(` ❌ ${result}`);
                        console.error(`[STEP ${i + 1}] Execution error:`, error);
                    }

                    // ⭐️ "Gedächtnis"-Logik ist jetzt in verify.ts, hier nicht mehr nötig

                    if (verification.action === 'scroll') {
                        sessionState.scrollCount = (sessionState.scrollCount || 0) + 1;
                        sessionState.consecutiveScrolls = (sessionState.consecutiveScrolls || 0) + 1;
                        stepLogs.push(` 📊 Scroll count: ${sessionState.scrollCount}`);
                    } else {
                        sessionState.consecutiveScrolls = 0;
                    }
                    await page.waitForTimeout(800);
                    updateSessionState(page, sessionState); // WICHTIG: Kontext für nächsten Loop aktualisieren

                    // 5️⃣ REFLECT
                    stepStart = Date.now();
                    try {
                        reflection = await reflectOnProgress(plan, observation, result, sessionState, task, i + 1, lang);
                        step_timings_ms.reflect = Date.now() - stepStart;
                        console.log(`[STEP ${i + 1}] Reflect: "${reflection}" (${step_timings_ms.reflect}ms)`);
                        stepLogs.push(` 💡 Reflection: "${reflection}"`);
                        stepLogs.push(` ⏱️ Reflect: ${step_timings_ms.reflect}ms`);
                    } catch (error: any) {
                        reflection = "Weiter";
                        stepLogs.push(` ⚠️ Reflection Error, continuing...`);
                    }

                    // Log-Schritt speichern und senden
                    sessionState.actionHistory.push({ plan, action: verification.action, result, reflection });
                    const currentStep: LogStep = {
                        step: stepName,
                        logs: stepLogs,
                        image: annotated, // Sendet 'null' wenn debugMode=false
                        timestamp: Date.now(),
                        plan,
                        observation,
                        verification,
                        reflection,
                        timings_ms: step_timings_ms
                    };
                    structuredLog.push(currentStep);
                    sendSSE(controller, { type: 'step', step: currentStep });

                    // Abbruchbedingungen
                    if (reflection.toLowerCase().includes('stop') || reflection.toLowerCase().includes('stopp')) {
                        stepLogs.push(`🛑 Agent meldet: Stopp!`);
                        console.log(`[STEP ${i + 1}] Agent finished task via STOP`);
                        break;
                    }
                    if (sessionState.scrollCount && sessionState.scrollCount >= 5) {
                        stepLogs.push(`🛑 STOP: Zu viele Scrolls (${sessionState.scrollCount}), ending simulation`);
                        console.log(`[STEP ${i + 1}] Stopped due to excessive scrolling`);
                        break;
                    }
                } // Ende der for-Schleife

                console.log(`[COMPLETE] ${structuredLog.length} steps`);
                sendSSE(controller, { type: 'progress', value: 100, status: lang === 'de' ? 'Abgeschlossen!' : 'Completed!' });
                sendSSE(controller, { type: 'complete', log: structuredLog });

            } catch (error: any) {
                const errorMessage = stripAnsiCodes((error instanceof Error) ? error.message : "Unbekannter Fehler");
                console.error("[ERROR]", errorMessage);
                sendSSE(controller, { type: 'error', message: errorMessage, log: structuredLog });
            } finally {
                if (browser) await browser.close();
                controller.close();
                console.log("[API] Stream closed, browser closed.");
            }
        }
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
}