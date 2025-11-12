// app/api/run-simulation/route.ts
// KORRIGIERTE STREAMING-VERSION

import { NextRequest } from 'next/server';
import { launchBrowser, updateSessionState, checkAndDismissCookie } from '@/app/_lib/simulation/browser';
import { getInteractableElements } from '@/app/_lib/simulation/elements';
import { annotateImage } from '@/app/_lib/simulation/vision';
import { generatePersona } from '@/app/_lib/simulation/persona';
import { getPlan } from '@/app/_lib/simulation/react-agent/plan';
import { observeCurrentState } from '@/app/_lib/simulation/react-agent/observe';
import { verifyPlanMatch } from '@/app/_lib/simulation/react-agent/verify';
import { executeAction } from '@/app/_lib/simulation/react-agent/execute';
import { reflectOnProgress } from '@/app/_lib/simulation/react-agent/reflect';
import { sendSSE, stripAnsiCodes } from '@/app/_lib/simulation/utils';
import { LogStep, SessionState, Language, PersonaType } from '@/app/_lib/simulation/types';

// WICHTIG: Stellt sicher, dass Next.js diese Route nicht statisch baut
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const { url, task, browserType, clickDepth, domain, personaType, language } = await request.json() as {
        url: string;
        task: string;
        browserType: 'chrome' | 'firefox' | 'safari';
        clickDepth: number;
        domain: string;
        personaType: PersonaType;
        language?: Language;
    };

    const lang: Language = language || 'de';
    const maxSteps = clickDepth || 8; // Fallback auf 8 Schritte

    if (!url || !task || !domain || !personaType) {
        return new Response(
            JSON.stringify({ message: 'URL, Aufgabe, Domain und Persona erforderlich' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const stream = new ReadableStream({
        async start(controller) {
            const structuredLog: LogStep[] = [];
            let browser: any = null; // 'any' statt 'Browser' für flexibleres Handling

            // SessionState mit allen Feldern aus types.ts initialisieren
            const sessionState: SessionState = {
                searchText: null,
                searchSubmitted: false,
                onSearchResults: false,
                onProductPage: false,
                currentUrl: '',
                lastAction: '',
                actionHistory: [],
                seenSearchField: false,
                searchFieldPosition: 'unknown',
                scrollCount: 0,
                consecutiveScrolls: 0
            };

            try {
                console.log(`[START] Simulation for ${url}`);
                sendSSE(controller, { type: 'progress', value: 10, status: lang === 'de' ? 'Generiere Persona...' : 'Generating persona...' });

                const personaPrompt = await generatePersona(task, domain, personaType, lang);
                console.log(`[PERSONA] Generated`);
                sendSSE(controller, { type: 'progress', value: 20, status: lang === 'de' ? 'Starte Browser...' : 'Starting browser...' });

                browser = await launchBrowser(browserType);
                const page = await browser.newPage({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
                });

                sendSSE(controller, { type: 'progress', value: 30, status: lang === 'de' ? 'Lade Website...' : 'Loading website...' });
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                updateSessionState(page, sessionState);
                console.log(`[LOADED] ${sessionState.currentUrl}`);

                // Step 1: Start
                const startStep: LogStep = {
                    step: "Schritt 1 (Start)",
                    logs: [`✓ Navigiere zu: ${url}`],
                    image: (await page.screenshot({ type: 'png' })).toString('base64'),
                    timestamp: Date.now()
                };
                structuredLog.push(startStep);
                sendSSE(controller, { type: 'step', step: startStep, progress: 35 });

                // Step 1.5: Cookie
                const cookieLogs: string[] = [];
                const dismissed = await checkAndDismissCookie(page, cookieLogs);
                if (dismissed) {
                    await page.waitForTimeout(1000); // Warten bis Banner weg ist
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

                    console.log(`\n[STEP ${i + 1}/${maxSteps}] ReAct Loop Starting...`);
                    sendSSE(controller, { type: 'progress', value: progress, status: stepName });

                    // Erneut nach Cookies suchen, falls einer nachgeladen wurde
                    await checkAndDismissCookie(page, stepLogs);
                    await page.waitForTimeout(500); // Kurze Pause

                    // LOOP DETECTION (aus deiner Streaming-Datei)
                    const recentPlans = sessionState.actionHistory.slice(-4).map(h => h.plan);
                    const allSamePlan = recentPlans.length >= 4 && recentPlans.every(p => p === recentPlans[0]);

                    if (allSamePlan) {
                        // ... (Dein Loop-Detection-Code von Zeile 92-125 ist gut)
                    }

                    // 1️⃣ PLAN
                    stepLogs.push(`🎯 Phase 1: Planning...`);
                    console.log(`[STEP ${i + 1}] Getting plan...`);
                    let plan: string;
                    try {
                        plan = await getPlan(task, personaPrompt, personaType, sessionState, page.url(), lang);
                        console.log(`[STEP ${i + 1}] Plan: "${plan}"`);
                        stepLogs.push(` 💭 Plan: "${plan}"`);
                    } catch (error) {
                        stepLogs.push(` ❌ Plan Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                        console.error(`[STEP ${i + 1}] Plan error:`, error);
                        break;
                    }

                    // 2️⃣ OBSERVE
                    stepLogs.push(`👁️ Phase 2: Observing...`);
                    console.log(`[STEP ${i + 1}] Getting observation...`);

                    await page.waitForTimeout(1200); // Warten auf Lazy Loading

                    const screenshotBuffer = await page.screenshot({ type: 'png' });

                    // WICHTIG: getInteractableElements MUSS Elemente mit 'id' zurückgeben!
                    // Deine `elements.ts` macht das korrekt via `r.index = i`.
                    const elements = await getInteractableElements(page);
                    console.log(`[STEP ${i + 1}] Found ${elements.length} elements`);

                    // Blinder Agent?
                    if (elements.length < 5 && i > 0) { // < 5 (nach dem Start) ist verdächtig
                        stepLogs.push(` ⚠️ WARNUNG: Nur ${elements.length} Elemente gefunden. Möglicher Cookie-Banner blockiert die Sicht.`);
                        console.warn(`[STEP ${i + 1}] Nur ${elements.length} Elemente. Blockiert?`);
                    }

                    const annotated = await annotateImage(screenshotBuffer, elements);
                    stepLogs.push(` 📊 Gefunden: ${elements.length} Elemente`);
                    stepLogs.push(` 🎯 Top 5: ${elements.slice(0, 5).map(e => `[${e.id}:${e.role}:${e.text?.substring(0, 20) || 'no-text'}]`).join(', ')}`);

                    let observation: string;
                    try {
                        observation = await observeCurrentState(page, plan, elements, annotated, lang);
                        console.log(`[STEP ${i + 1}] Observation: "${observation.substring(0, 100)}..."`);
                        stepLogs.push(` 👀 Observation: "${observation}"`);
                    } catch (error) {
                        stepLogs.push(` ❌ Observation Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                        console.error(`[STEP ${i + 1}] Observation error:`, error);
                        break;
                    }

                    // 3️⃣ VERIFY
                    stepLogs.push(`✅ Phase 3: Verifying...`);
                    console.log(`[STEP ${i + 1}] Verifying match...`);
                    let verification: any;
                    try {
                        verification = await verifyPlanMatch(plan, observation, elements, sessionState, task, lang);
                        console.log(`[STEP ${i + 1}] Verification:`, verification);
                        stepLogs.push(` 🔍 Match: ${verification.match} (${Math.round(verification.confidence * 100)}%)`);
                        stepLogs.push(` 🎬 Action: ${verification.action}${verification.elementId !== undefined ? ` [ID ${verification.elementId}]` : ''}`);
                        stepLogs.push(` 📝 Rationale: "${verification.rationale}"`);
                    } catch (error) {
                        stepLogs.push(` ❌ Verification Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                        console.error(`[STEP ${i + 1}] Verification error:`, error);
                        break;
                    }

                    // 4️⃣ EXECUTE
                    stepLogs.push(`🎬 Phase 4: Executing...`);
                    console.log(`[STEP ${i + 1}] Executing action: ${verification.action}`);
                    let result = '';
                    try {
                        // ⭐️ KORREKTUR HIER: `personaType` hinzugefügt ⭐️
                        result = await executeAction(verification, page, elements, task, personaType);
                        stepLogs.push(` ✅ ${result}`);
                    } catch (error) {
                        result = `Fehler: ${error instanceof Error ? error.message : 'Unknown'}`;
                        stepLogs.push(` ❌ ${result}`);
                        console.error(`[STEP ${i + 1}] Execution error:`, error);
                        // Nicht abbrechen, sondern reflektieren lassen
                    }

                    // Scroll-Zählung
                    if (verification.action === 'scroll') {
                        sessionState.scrollCount = (sessionState.scrollCount || 0) + 1;
                        sessionState.consecutiveScrolls = (sessionState.consecutiveScrolls || 0) + 1;
                        stepLogs.push(` 📊 Scroll count: ${sessionState.scrollCount}`);
                    } else {
                        sessionState.consecutiveScrolls = 0;
                    }

                    await page.waitForTimeout(800); // Warten auf Seitenreaktion
                    updateSessionState(page, sessionState);

                    // 5️⃣ REFLECT
                    stepLogs.push(`🔄 Phase 5: Reflecting...`);
                    console.log(`[STEP ${i + 1}] Reflecting...`);
                    let reflection: string;
                    try {
                        reflection = await reflectOnProgress(plan, observation, result, sessionState, task, i + 1, lang);
                        console.log(`[STEP ${i + 1}] Reflection: "${reflection}"`);
                        stepLogs.push(` 💡 Reflection: "${reflection}"`);
                    } catch (error) {
                        reflection = "Weiter";
                        stepLogs.push(` ⚠️ Reflection Error, continuing...`);
                    }

                    // Log-Schritt speichern und senden
                    sessionState.actionHistory.push({ plan, action: verification.action, result, reflection });
                    const currentStep: LogStep = {
                        step: stepName,
                        logs: stepLogs,
                        image: annotated, // Sendet annotiertes Bild an FE
                        timestamp: Date.now(),
                        plan,
                        observation,
                        verification,
                        reflection
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
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache', // redundant mit cache: 'no-store' im FE, aber sicher ist sicher
            'Connection': 'keep-alive',
        },
    });
}