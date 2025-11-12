// app/api/run-simulation/route.ts
// COMPLETE & CORRECT - Based on your actual files

import { NextRequest, NextResponse } from 'next/server';
import { launchBrowser, checkAndDismissCookie, updateSessionState } from '@/app/_lib/simulation/browser';
import { getInteractableElements } from '@/app/_lib/simulation/elements';
import { generatePersona } from '@/app/_lib/simulation/persona';
import { getPlan } from '@/app/_lib/simulation/react-agent/plan';
import { observeCurrentState } from '@/app/_lib/simulation/react-agent/observe';
import { verifyPlanMatch } from '@/app/_lib/simulation/react-agent/verify';
import { executeAction } from '@/app/_lib/simulation/react-agent/execute';
import { reflectOnProgress } from '@/app/_lib/simulation/react-agent/reflect';
import type { PersonaType, Language, SessionState } from '@/app/_lib/simulation/types';
import path from 'path';
import fs from 'fs/promises';

const MAX_STEPS = 9;
const SCROLL_LIMIT = 3;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let browser: any = null;
    let page: any = null;

    try {
        const body = await request.json();
        const {
            task = 'Finde eine Winter-Jeans für Damen',
            personaType = 'Pragmatisch & Zielorientiert' as PersonaType,
            url = 'https://www.otto.de',
            language = 'de' as Language
        } = body;

        console.log(`[API] Starting simulation: ${task}`);
        console.log(`[API] Persona: ${personaType}, Language: ${language}`);

        // Launch browser with default chrome
        browser = await launchBrowser('chrome');
        page = await browser.newPage();

        // Create output directory
        const outputDir = path.join(process.cwd(), 'public', 'simulations', `sim_${startTime}`);
        await fs.mkdir(outputDir, { recursive: true });

        // Generate persona
        const personaPrompt = await generatePersona(task, url, personaType, language);
        console.log('[API] Persona generated');

        // Initialize session state (with ALL required fields!)
        const sessionState: SessionState = {
            searchText: null,
            searchSubmitted: false,
            onSearchResults: false,
            onProductPage: false,
            currentUrl: url,
            lastAction: '',
            actionHistory: [],
            seenSearchField: false,
            searchFieldPosition: 'unknown',
            scrollCount: 0,
            consecutiveScrolls: 0
        };

        const steps: any[] = [];

        // Step 1: Navigate
        console.log(`[STEP 1] Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(2000);

        // Check cookie banner
        const logs: string[] = [];
        await checkAndDismissCookie(page, logs);

        const startScreenshot = await page.screenshot({ fullPage: true });
        await fs.writeFile(path.join(outputDir, `schritt_1_Start.jpg`), startScreenshot);

        steps.push({
            step: 1,
            phase: 'Start',
            action: `Navigate to ${url}`,
            logs,
            screenshot: `/simulations/sim_${startTime}/schritt_1_Start.jpg`,
            timestamp: Date.now() - startTime
        });

        // Main loop
        for (let step = 2; step <= MAX_STEPS; step++) {
            console.log(`\n[STEP ${step}] Starting...`);

            // Update session state
            updateSessionState(page, sessionState);

            // Reset scroll count if URL changed
            if (sessionState.currentUrl !== page.url()) {
                sessionState.scrollCount = 0;
                sessionState.consecutiveScrolls = 0;
            }

            // Get interactable elements
            let elements = await getInteractableElements(page);

            // 🔥 CRITICAL FIX: Add IDs to elements!
            elements = elements.map((el, index) => ({
                ...el,
                id: index
            }));

            console.log(`[STEP ${step}] Elements found: ${elements.length}`);
            console.log(`[STEP ${step}] Top 5:`, elements.slice(0, 5).map(e => ({
                id: e.id,
                role: e.role,
                text: e.text?.substring(0, 30),
                priority: e.priorityScore
            })));

            // Take screenshot
            const screenshot = await page.screenshot({ fullPage: true });
            const screenshotPath = path.join(outputDir, `schritt_${step}.jpg`);
            await fs.writeFile(screenshotPath, screenshot);
            const screenshotBase64 = screenshot.toString('base64');

            // PLAN
            console.log(`[STEP ${step}] Planning...`);
            const plan = await getPlan(task, personaPrompt, personaType, sessionState, sessionState.currentUrl, language);
            console.log(`[STEP ${step}] Plan: "${plan}"`);

            // OBSERVE
            console.log(`[STEP ${step}] Observing...`);
            const observation = await observeCurrentState(page, plan, elements, screenshotBase64, language);
            console.log(`[STEP ${step}] Observation: "${observation.substring(0, 150)}..."`);

            // VERIFY
            console.log(`[STEP ${step}] Verifying...`);
            const verification = await verifyPlanMatch(plan, observation, elements, sessionState, task, language);
            console.log(`[STEP ${step}] Verification:`, {
                action: verification.action,
                elementId: verification.elementId,
                confidence: verification.confidence
            });

            // SCROLL LIMIT CHECK
            if (verification.action === 'scroll') {
                sessionState.scrollCount = (sessionState.scrollCount || 0) + 1;
                sessionState.consecutiveScrolls = (sessionState.consecutiveScrolls || 0) + 1;
                console.log(`[STEP ${step}] Scroll count: ${sessionState.scrollCount}/${SCROLL_LIMIT}`);

                if (sessionState.scrollCount >= SCROLL_LIMIT) {
                    console.warn(`[STEP ${step}] Scroll limit reached! Breaking loop.`);
                    steps.push({
                        step,
                        phase: 'Loop Break',
                        plan,
                        observation: observation.substring(0, 200),
                        action: `Loop terminated: Too many scrolls (${sessionState.scrollCount})`,
                        screenshot: `/simulations/sim_${startTime}/schritt_${step}.jpg`,
                        timestamp: Date.now() - startTime
                    });
                    break;
                }
            } else {
                sessionState.consecutiveScrolls = 0;
            }

            // EXECUTE
            console.log(`[STEP ${step}] Executing: ${verification.action}`);
            const actionResult = await executeAction(verification, page, elements, task, personaType);
            console.log(`[STEP ${step}] Result: "${actionResult}"`);

            // Update state
            sessionState.lastAction = actionResult;
            sessionState.actionHistory.push({
                plan,
                action: verification.action,
                result: actionResult,
                reflection: ''
            });

            await page.waitForTimeout(2000);

            // Log step
            steps.push({
                step,
                phase: `Schritt ${step - 1}/${MAX_STEPS}`,
                plan,
                observation: observation.substring(0, 300),
                verification: verification.rationale,
                action: actionResult,
                screenshot: `/simulations/sim_${startTime}/schritt_${step}.jpg`,
                timestamp: Date.now() - startTime
            });

            // REFLECT
            console.log(`[STEP ${step}] Reflecting...`);
            const reflection = await reflectOnProgress(
                plan,
                observation,
                actionResult,
                sessionState,
                task,
                step,
                language
            );
            console.log(`[STEP ${step}] Reflection: "${reflection}"`);

            // Update last reflection
            if (sessionState.actionHistory.length > 0) {
                sessionState.actionHistory[sessionState.actionHistory.length - 1].reflection = reflection;
            }

            // Check if should stop (reflection contains STOPP/STOP)
            if (reflection.includes('STOPP') || reflection.includes('STOP')) {
                console.warn(`[STEP ${step}] 🛑 Stopping based on reflection`);
                steps.push({
                    step: step + 1,
                    phase: 'Stopped',
                    reflection,
                    screenshot: `/simulations/sim_${startTime}/schritt_${step}.jpg`,
                    timestamp: Date.now() - startTime
                });
                break;
            }

            // Check if on product page (task likely complete)
            if (sessionState.onProductPage) {
                console.log(`[STEP ${step}] ✅ On product page - task likely complete`);
                steps.push({
                    step: step + 1,
                    phase: 'Complete',
                    reflection: 'Auf Produktseite angekommen',
                    screenshot: `/simulations/sim_${startTime}/schritt_${step}.jpg`,
                    timestamp: Date.now() - startTime
                });
                break;
            }
        }

        // Close browser
        await browser.close();

        console.log(`[API] Simulation completed in ${Date.now() - startTime}ms`);

        return NextResponse.json({
            success: true,
            steps,
            outputDir: `/simulations/sim_${startTime}`,
            duration: Date.now() - startTime
        });

    } catch (error) {
        console.error('[API] Error:', error);

        // Cleanup
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                console.error('[API] Error closing browser:', e);
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}