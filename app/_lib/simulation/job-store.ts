// app/_lib/simulation/job-store.ts
import { LogStep, SessionState } from './types';

// Globale Map, die Hot-Reloads überlebt
const globalForJobs = global as unknown as { jobs: Map<string, SimulationJob> };
export const jobStore = globalForJobs.jobs || new Map<string, SimulationJob>();
if (process.env.NODE_ENV !== 'production') globalForJobs.jobs = jobStore;

export type JobStatus = 'running' | 'paused' | 'stopped' | 'completed' | 'error';

export interface SimulationJob {
    id: string;
    status: JobStatus;
    logs: LogStep[];
    sessionState: SessionState;
    controller: ReadableStreamDefaultController | null; // Die aktive Verbindung zum Browser
    shouldStop: boolean;
    createdAt: number;
}

export function createJob(id: string, initialState: SessionState) {
    const job: SimulationJob = {
        id,
        status: 'running',
        logs: [],
        sessionState: initialState,
        controller: null,
        shouldStop: false,
        createdAt: Date.now()
    };
    jobStore.set(id, job);
    return job;
}

export function getJob(id: string) {
    return jobStore.get(id);
}

export function updateJobStatus(id: string, status: JobStatus) {
    const job = getJob(id);
    if (job) {
        job.status = status;
        broadcast(id, { type: 'status', status });
    }
}

export function addLogToJob(id: string, step: LogStep) {
    const job = getJob(id);
    if (job) {
        job.logs.push(step);
        broadcast(id, { type: 'step', step });
    }
}

// Sendet Daten an den Client, WENN er gerade zuhört
export function broadcast(id: string, data: any) {
    const job = getJob(id);
    if (job && job.controller) {
        try {
            const msg = `data: ${JSON.stringify(data)}\n\n`;
            job.controller.enqueue(new TextEncoder().encode(msg));
        } catch (e) {
            // Client ist weg (Reload), egal. Job läuft weiter.
            job.controller = null;
        }
    }
}