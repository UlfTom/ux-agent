// app/api/run-simulation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { launchBrowser, updateSessionState, checkAndDismissCookie } from '@/app/_lib/simulation/browser';
import { getInteractableElements } from '@/app/_lib/simulation/elements';
import { annotateImage } from '@/app/_lib/simulation/vision';
import { pragmaticPersonaDE } from '@/app/_lib/simulation/persona-cache';
import { getPlan } from '@/app/_lib/simulation/react-agent/plan';
import { observeCurrentState } from '@/app/_lib/simulation/react-agent/observe';
import { verifyPlanMatch } from '@/app/_lib/simulation/react-agent/verify';
import { executeAction } from '@/app/_lib/simulation/react-agent/execute';
import { reflectOnProgress, analyzeSimulationResult } from '@/app/_lib/simulation/react-agent/reflect';
import { LogStep, SessionState } from '@/app/_lib/simulation/types';
import { createJob, getJob, addLogToJob, updateJobStatus, broadcast } from '@/app/_lib/simulation/job-store';

export const dynamic = 'force-dynamic';

async function runBackgroundSimulation(jobId: string, params: any) {
    const { url, task, browserType, clickDepth, personaType, language = 'de', debugMode = true, simulationMode = 'default' } = params;
    
    // WICHTIG: Browser holen (wird wiederverwendet), aber NEUEN Context (Tab) erstellen
    const browser = await launchBrowser(browserType);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    try {
        const job = getJob(jobId);
        if (!job) return;

        // Config im Log speichern für den Export
        addLogToJob(jobId, { 
            step: "Start & Config", 
            logs: [
                `🚀 Starte Simulation für: ${url}`,
                `👤 Persona: ${personaType}`,
                `🤖 Task: "${task}"`,
                `🛠️ Modus: ${simulationMode}`,
                `🌍 Sprache: ${language}`
            ], 
            timestamp: Date.now() 
        });
        
        // Timeout erhöht & 'networkidle' entfernt (zu strikt für SPAs)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        updateSessionState(page, job.sessionState);
        await checkAndDismissCookie(page, [], personaType);

        const maxSteps = clickDepth || 15;

        for (let i = 0; i < maxSteps; i++) {
            // Stop/Pause Checks wie gehabt...
            if (getJob(jobId)?.shouldStop) break;
            
            // ... (Rest der Loop-Logik bleibt identisch, siehe vorherigen Code) ...
            // Kurzform:
            const stepLogs: string[] = [];
            await checkAndDismissCookie(page, stepLogs, personaType);
            
            const plan = await getPlan(task, pragmaticPersonaDE, personaType, job.sessionState, page.url(), language, simulationMode);
            const screenshot = await page.screenshot({ type: 'png' });
            const elements = await getInteractableElements(page, job.sessionState.onSearchResults);
            const annotated = debugMode ? await annotateImage(screenshot, elements, simulationMode) : null;
            const observation = await observeCurrentState(page, plan, elements, annotated || screenshot.toString('base64'), pragmaticPersonaDE, language);
            const verification = await verifyPlanMatch(plan, observation, elements, job.sessionState, task, personaType, language);
            const result = await executeAction(verification, page, elements, task, personaType);
            const reflection = await reflectOnProgress(plan, observation, result, job.sessionState, task, i+1, language);

            addLogToJob(jobId, {
                step: `Schritt ${i+1}: ${plan}`,
                logs: [...stepLogs, `👁️ ${observation.substring(0,100)}...`, `🎬 ${verification.action}`, `✅ ${result}`],
                image: annotated,
                timestamp: Date.now()
            });

            await page.waitForTimeout(1000);
            updateSessionState(page, job.sessionState);
        }

        updateJobStatus(jobId, 'completed');
        // ... Analyze ...

    } catch (error: any) {
        console.error("Worker Error:", error);
        updateJobStatus(jobId, 'error');
        broadcast(jobId, { type: 'error', message: error.message });
    } finally {
        // WICHTIG: Nur Page schließen, NICHT den Browser!
        await page.close();
        await context.close(); 
        // NICHT: await browser.close(); 
    }
}

// API Handler (bleibt gleich wie vorher)
export async function POST(request: NextRequest) {
    const body = await request.json();

    if (body.action === 'control') {
        const job = getJob(body.jobId);
        if (job) {
            if (body.command === 'stop') { job.shouldStop = true; updateJobStatus(body.jobId, 'stopped'); }
            if (body.command === 'pause') updateJobStatus(body.jobId, 'paused');
            if (body.command === 'resume') updateJobStatus(body.jobId, 'running');
            return NextResponse.json({ status: job.status });
        }
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobId = Math.random().toString(36).substring(7);
    const initialState: SessionState = {
        searchText: null, searchSubmitted: false, onSearchResults: false, onProductPage: false,
        currentUrl: '', lastAction: '', actionHistory: [], seenSearchField: false,
        searchFieldPosition: 'unknown', scrollCount: 0, consecutiveScrolls: 0
    };

    createJob(jobId, initialState);
    runBackgroundSimulation(jobId, body).catch(e => console.error("Worker crash:", e));

    return NextResponse.json({ jobId, status: 'started' });
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    const job = getJob(jobId || '');

    if (!job) return new Response("Job not found", { status: 404 });

    const stream = new ReadableStream({
        start(controller) {
            job.controller = controller;
            const historyMsg = { type: 'history', logs: job.logs, status: job.status };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(historyMsg)}\n\n`));
        },
        cancel() { job.controller = null; }
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
}