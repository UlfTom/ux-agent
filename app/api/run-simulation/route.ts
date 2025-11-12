// app/api/run-simulation/route.ts
// FIXED: Scroll tracking + Always draw bounding boxes

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

    if (!url || !task || !domain || !personaType) {
        return new Response(
            JSON.stringify({ message: 'URL, Aufgabe, Domain und Persona erforderlich' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const stream = new ReadableStream({
        async start(controller) {
            const structuredLog: LogStep[] = [];
            let browser = null;

            // CRITICAL FIX: Initialize with scroll tracking
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

                sendSSE(controller, {
                    type: 'progress',
                    value: 10,
                    status: lang === 'de' ? 'Generiere Persona...' : 'Generating persona...'
                });

                const personaPrompt = await generatePersona(task, domain, personaType, lang);
                console.log(`[PERSONA] Generated`);

                sendSSE(controller, {
                    type: 'progress',
                    value: 20,
                    status: lang === 'de' ? 'Starte Browser...' : 'Starting browser...'
                });

                browser = await launchBrowser(browserType);
                const page = await browser.newPage({
                    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                });

                sendSSE(controller, {
                    type: 'progress',
                    value: 30,
                    status: lang === 'de' ? 'Lade Website...' : 'Loading website...'
                });

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

                // Step 1.2: Persona
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

                // Step 1.5: Cookie
                const cookieLogs: string[] = [];
                const dismissed = await checkAndDismissCookie(page, cookieLogs);
                if (dismissed) {
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
                const totalSteps = clickDepth;
                for (let i = 0; i < totalSteps; i++) {
                    const progress = 40 + Math.round((i / totalSteps) * 50);
                    const stepName = `Schritt ${i + 2}/${totalSteps + 2}`;
                    const stepLogs: string[] = [];

                    console.log(`\n[STEP ${i + 1}/${totalSteps}] ReAct Loop Starting...`);
                    sendSSE(controller, { type: 'progress', value: progress, status: stepName });

                    await checkAndDismissCookie(page, stepLogs);
                    await page.waitForTimeout(300);

                    // LOOP DETECTION
                    const recentPlans = sessionState.actionHistory.slice(-4).map(h => h.plan);
                    const allSamePlan = recentPlans.length >= 4 && recentPlans.every(p => p === recentPlans[0]);

                    if (allSamePlan) {
                        stepLogs.push(`⚠️ LOOP: "${recentPlans[0]}" 4x wiederholt`);
                        stepLogs.push(`🔄 Force: Scroll + Auto-Click`);
                        console.log(`[STEP ${i + 1}] Loop detected`);

                        await page.mouse.wheel(0, 1000);
                        await page.waitForTimeout(800);

                        try {
                            const productLinks = page.locator('a[href*="/p/"], a[href*="/product/"]').first();
                            const visible = await productLinks.isVisible({ timeout: 2000 });
                            if (visible) {
                                stepLogs.push(`🎯 Auto-Click: Produkt`);
                                await productLinks.click({ timeout: 3000 });
                                await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
                            }
                        } catch {
                            stepLogs.push(`⚠️ Kein Produkt gefunden`);
                        }

                        updateSessionState(page, sessionState);
                        const loopStep: LogStep = {
                            step: stepName + " (Loop Break)",
                            logs: stepLogs,
                            image: (await page.screenshot({ type: 'png' })).toString('base64'),
                            timestamp: Date.now()
                        };
                        structuredLog.push(loopStep);
                        sendSSE(controller, { type: 'step', step: loopStep });
                        continue;
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

                    // 2️⃣ OBSERVE - FIXED: Better timing + Always annotate
                    stepLogs.push(`👁️ Phase 2: Observing...`);
                    console.log(`[STEP ${i + 1}] Getting observation...`);

                    // CRITICAL FIX: Wait longer for page to settle
                    await page.waitForTimeout(1200);

                    // CRITICAL FIX: Wait for network to be idle
                    try {
                        await page.waitForLoadState('networkidle', { timeout: 3000 });
                        console.log('[OBSERVE] Network idle');
                    } catch {
                        console.warn('[OBSERVE] Network not idle, continuing anyway');
                    }

                    // Get screenshot
                    const screenshotBuffer = await page.screenshot({ type: 'png' });

                    // Get elements
                    const elements = await getInteractableElements(page);
                    console.log(`[STEP ${i + 1}] Found ${elements.length} elements`);

                    // CRITICAL FIX: ALWAYS create annotation, even with 0 elements!
                    const annotated = await annotateImage(screenshotBuffer, elements);

                    // Handle no elements case
                    if (elements.length === 0) {
                        stepLogs.push(` ⚠️ Keine Elemente gefunden!`);

                        // DEBUG: Check raw HTML
                        const htmlCheck = await page.evaluate(() => {
                            const buttons = document.querySelectorAll('button').length;
                            const links = document.querySelectorAll('a').length;
                            const inputs = document.querySelectorAll('input').length;
                            return { buttons, links, inputs };
                        });

                        console.log(`[STEP ${i + 1}] HTML check:`, htmlCheck);
                        stepLogs.push(` 🔍 HTML: ${htmlCheck.buttons} buttons, ${htmlCheck.links} links, ${htmlCheck.inputs} inputs`);

                        // Scroll and try again
                        await page.mouse.wheel(0, 500);
                        await page.waitForTimeout(800);

                        const scrollStep: LogStep = {
                            step: stepName + " (No Elements)",
                            logs: stepLogs,
                            image: annotated, // ← IMPORTANT: Save screenshot with annotation!
                            timestamp: Date.now()
                        };
                        structuredLog.push(scrollStep);
                        sendSSE(controller, { type: 'step', step: scrollStep });
                        continue;
                    }

                    // Log elements found
                    stepLogs.push(` 📊 Gefunden: ${elements.length} Elemente`);
                    stepLogs.push(` 🎯 Top 5: ${elements.slice(0, 5).map(e => `[${e.id}:${e.role}:${e.text?.substring(0, 20) || 'no-text'}]`).join(', ')}`);

                    // Continue with observe
                    let observation: string;
                    try {
                        const screenshotBase64 = annotated; // Already base64
                        observation = await observeCurrentState(page, plan, elements, screenshotBase64, lang);
                        console.log(`[STEP ${i + 1}] Observation: "${observation}"`);
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

                        if (verification.scrollDirection) {
                            stepLogs.push(` ↕️ Direction: ${verification.scrollDirection}`);
                        }
                        if (verification.textToType) {
                            stepLogs.push(` 📝 Text: "${verification.textToType}"`);
                        }
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
                        result = await executeAction(verification, page, elements, task);
                        stepLogs.push(` ✅ ${result}`);
                    } catch (error) {
                        result = `Fehler: ${error instanceof Error ? error.message : 'Unknown'}`;
                        stepLogs.push(` ❌ ${result}`);
                        console.error(`[STEP ${i + 1}] Execution error:`, error);
                    }

                    // CRITICAL FIX: Track scroll count
                    if (verification.action === 'scroll') {
                        sessionState.scrollCount = (sessionState.scrollCount || 0) + 1;
                        sessionState.consecutiveScrolls = (sessionState.consecutiveScrolls || 0) + 1;
                        console.log(`[ROUTE] Scroll count: ${sessionState.scrollCount}`);
                        stepLogs.push(` 📊 Scroll count: ${sessionState.scrollCount}`);
                    } else {
                        // Reset consecutive scrolls on non-scroll action
                        sessionState.consecutiveScrolls = 0;
                    }

                    // CRITICAL FIX: Wait after execution for page to settle
                    await page.waitForTimeout(800);

                    // CRITICAL FIX: Update session state after action
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

                    // Save to history
                    sessionState.actionHistory.push({
                        plan,
                        action: verification.action,
                        result,
                        reflection
                    });

                    // Create step log with annotated image
                    const currentStep: LogStep = {
                        step: stepName,
                        logs: stepLogs,
                        image: annotated, // ← CRITICAL: Use annotated image with bounding boxes!
                        timestamp: Date.now(),
                        plan,
                        observation,
                        verification,
                        reflection
                    };
                    structuredLog.push(currentStep);
                    sendSSE(controller, { type: 'step', step: currentStep });

                    // Check if finished
                    if (reflection.toLowerCase().includes('aufgabe') && reflection.toLowerCase().includes('abgeschlossen')) {
                        stepLogs.push(`✅ Agent meldet: Aufgabe abgeschlossen!`);
                        console.log(`[STEP ${i + 1}] Agent finished task`);
                        break;
                    }

                    if (reflection.toLowerCase().includes('task') && reflection.toLowerCase().includes('completed')) {
                        stepLogs.push(`✅ Agent reports: Task completed!`);
                        console.log(`[STEP ${i + 1}] Agent finished task`);
                        break;
                    }

                    // Check if too many scrolls (stop condition)
                    if (sessionState.scrollCount && sessionState.scrollCount >= 5) {
                        stepLogs.push(`🛑 STOP: Too many scrolls (${sessionState.scrollCount}), ending simulation`);
                        console.log(`[STEP ${i + 1}] Stopped due to excessive scrolling`);
                        break;
                    }
                }

                console.log(`[COMPLETE] ${structuredLog.length} steps`);
                sendSSE(controller, {
                    type: 'progress',
                    value: 100,
                    status: lang === 'de' ? 'Abgeschlossen!' : 'Completed!'
                });
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