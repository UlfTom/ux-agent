// app/simulation/_components/simulation/ExecutionTimeline.tsx
"use client";

import React from 'react';
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Copy, Check, Download, Play, CheckCircle2, XCircle, AlertCircle, Birdhouse } from "lucide-react";
import { motion } from 'framer-motion';
import { LogStep } from '@/app/_lib/simulation/types';
import { TimelineStepCard } from './TimelineStepCard';

const Line = () => (
    <hr className='w-full'
        style={{
            color: "black",
            backgroundColor: "black",
            height: 2
        }}
    />
);
// Props-Typen für alle States und Handler
type ExecutionTimelineProps = {
    log: LogStep[];
    loading: boolean;
    isSimulationComplete: boolean;
    totalSteps: number;
    successfulSteps: number;
    errorCount: number;
    hasSuccess: boolean;
    totalTime: number | null;
    task: string;
    url: string;
    errorSteps: LogStep[];

    copied: boolean;
    handleCopyLog: () => void;
    handleDownloadZip: () => void;
};

export function ExecutionTimeline({
    log,
    loading,
    isSimulationComplete,
    totalSteps,
    successfulSteps,
    errorCount,
    hasSuccess,
    totalTime,
    task,
    url,
    errorSteps,
    copied,
    handleCopyLog,
    handleDownloadZip
}: ExecutionTimelineProps) {

    return (
        <>
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-4 relative">
                    <Line></Line>
                    <p className='m-0 p-0 px-2 bg-white h-4 -top-2 absolute inset-auto w-fit'>Execution Timeline</p>
                </div>
                <div className="flex items-center justify-between">

                    <div className="flex flex-row items-center gap-8">
                        <Birdhouse className="h-8 w-8 text-black" />
                        <p className="font-mono">Debug Mode is on</p>
                    </div>
                    {log.length > 0 && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleCopyLog} className="gap-2">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDownloadZip} className="gap-2">
                                <Download className="h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline View */}
            {log.length > 0 ? (
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-3 border-b">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <p className="text-xs font-medium text-muted-foreground font-mono">
                            EXECUTION TIMELINE
                        </p>
                    </div>
                    {/* Items */}
                    <div className="space-y-0">
                        {log.map((step, index) => (
                            <TimelineStepCard
                                key={index}
                                step={step}
                                index={index}
                                isLast={index === log.length - 1}
                                startTime={log[0].timestamp}
                            />
                        ))}
                    </div>

                    {/* Fazit-Sektion */}
                    {isSimulationComplete && (
                        <div className="flex gap-4">
                            <div className="relative flex-shrink-0">
                                <div className="h-10 w-10 rounded-full flex items-center justify-center font-mono text-xs font-bold">Ende</div>
                            </div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="w-full" // Wichtig für Layout
                            >
                                <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground uppercase tracking-wider my-8">
                                    <div className="h-px flex-1 bg-border" /><span>ENDE</span><div className="h-px flex-1 bg-border" />
                                </div>
                                {/* Summary Card */}
                                <Card className="border-2 shadow-lg overflow-hidden">
                                    <div className="p-6 text-white" style={{ background: `linear-gradient(to right, #6366f1, #a855f7, #ec4899)` }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            {hasSuccess ? <CheckCircle2 className="h-8 w-8" /> : errorCount > 0 ? <XCircle className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
                                            <h3 className="text-2xl font-display font-bold">Test-Zusammenfassung</h3>
                                        </div>
                                        <p className="text-white/90 text-sm">Vollständiger Durchlauf der Simulation abgeschlossen</p>
                                    </div>
                                    <CardContent className="p-6 space-y-6">
                                        {/* Status Badge */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-muted-foreground">Status:</span>
                                            {hasSuccess ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-sm font-medium">
                                                    <CheckCircle2 className="h-4 w-4" /> Erfolgreich abgeschlossen
                                                </span>
                                            ) : errorCount > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-sm font-medium">
                                                    <XCircle className="h-4 w-4" /> Mit Fehlern abgeschlossen
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-sm font-medium">
                                                    <AlertCircle className="h-4 w-4" /> Abgeschlossen
                                                </span>
                                            )}
                                        </div>
                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* ... (Alle 4 Stat-Boxen bleiben gleich) ... */}
                                        </div>
                                        {/* Task Summary */}
                                        <div className="space-y-2">
                                            <h4 className="font-display font-semibold text-sm">Getestete Aufgabe</h4>
                                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border">{task}</p>
                                        </div>
                                        {/* URL */}
                                        <div className="space-y-2">
                                            <h4 className="font-display font-semibold text-sm">Ziel-URL</h4>
                                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border font-mono break-all">{url}</p>
                                        </div>
                                        {/* Key Findings */}
                                        {errorSteps.length > 0 && (
                                            <div className="space-y-2">
                                                {/* ... (Fehler-Anzeige bleibt gleich) ... */}
                                            </div>
                                        )}
                                        {/* Success Message */}
                                        {hasSuccess && (
                                            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                                                {/* ... (Erfolgs-Anzeige bleibt gleich) ... */}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}
                </div>
            ) : (
                <Card className="border-2 p-12 text-center">
                    {/* ... (Platzhalter für "No simulation data" bleibt gleich) ... */}
                </Card>
            )}
        </>
    );
}