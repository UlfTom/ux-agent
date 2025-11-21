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
            {/* Timeline View */}
            {log.length > 0 ? (
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex -mx-16 px-16 backdrop-blur-xl bg-linear-to-t from-white from-15% to-white/0 justify-between items-center pt-16 pb-8 -mt-8 mb-8 border-b-2 sticky top-4 z-9">
                        <div className='flex gap-4 items-center'>
                            <p className="text-xs font-medium text-muted-foreground font-headline">
                                EXECUTION TIMELINE
                            </p>
                        </div>

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
                    </div>
                    {/* Items */}
                    <div className="space-y-0 mb-20">
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
                                <Card className="border-2 pb-8 shadow-lg overflow-hidden">
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
                                            <div className="p-4 rounded-lg bg-muted/50 border">
                                                <div className="text-2xl font-bold font-mono text-purple-600">
                                                    {totalSteps}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    Schritte gesamt
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-lg bg-muted/50 border">
                                                <div className="text-2xl font-bold font-mono text-green-600">
                                                    {successfulSteps}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    Erfolgreich
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-lg bg-muted/50 border">
                                                <div className="text-2xl font-bold font-mono text-red-600">
                                                    {errorCount}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    Fehler
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-lg bg-muted/50 border">
                                                <div className="text-2xl font-bold font-mono text-blue-600">
                                                    {totalTime !== null
                                                        ? totalTime < 60
                                                            ? `${totalTime}s`
                                                            : `${Math.floor(totalTime / 60)}m ${totalTime % 60}s`
                                                        : 'N/A'
                                                    }
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    Gesamtdauer
                                                </div>
                                            </div>
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
                                                <h4 className="font-display font-semibold text-sm flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                                    Aufgetretene Probleme
                                                </h4>
                                                <ul className="text-sm text-muted-foreground space-y-1 bg-red-500/5 p-3 rounded-lg border border-red-500/20">
                                                    {errorSteps.slice(0, 3).map((step, i) => (
                                                        <li key={i} className="flex gap-2">
                                                            <span className="text-red-500">•</span>
                                                            <span>{step.step}</span>
                                                        </li>
                                                    ))}
                                                    {errorSteps.length > 3 && (
                                                        <li className="text-xs italic">
                                                            ... und {errorSteps.length - 3} weitere
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                        {/* Success Message */}
                                        {hasSuccess && (
                                            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                                            Aufgabe erfolgreich abgeschlossen
                                                        </p>
                                                        <p className="text-xs text-green-700 dark:text-green-300">
                                                            Der Agent konnte die gestellte Aufgabe erfolgreich lösen.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                    <Birdhouse className="h-8 w-8 text-black" />
                    <p>{task} auf {url.split("www.")[1]}.</p>
                </div>
            )}
        </>
    );
}