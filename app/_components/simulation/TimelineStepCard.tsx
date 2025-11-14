// app/simulation/_components/simulation/TimelineStepCard.tsx
"use client";

import React, { useState } from 'react';
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader } from "@/app/_components/ui/card";
import { Clock, CheckCircle2, XCircle, AlertCircle, ImageUp, ImageDown } from "lucide-react";
import { motion } from 'framer-motion';
import { LogStep } from '@/app/_lib/simulation/types'; // ⭐️ WICHTIG: Importiert den globalen Typ

export function TimelineStepCard({
    step,
    index,
    isLast,
    startTime
}: {
    step: LogStep;
    index: number;
    isLast: boolean;
    startTime?: number;
}) {

    // ⭐️ Prüft auf echte Fehler-Logs
    const isError = step.step.includes('FEHLER') || step.logs.some(l => l.includes('❌') || l.includes('Fehler:'));
    const isSuccess = step.step.includes('abgeschlossen') || step.logs.some(l => l.includes('✅ Aufgabe'));

    // Zeit-Berechnungen (bleiben gleich)
    const elapsed = step.timestamp && startTime
        ? Math.round((step.timestamp - startTime) / 1000)
        : null;

    const elapsedFormatted = elapsed !== null
        ? elapsed < 60
            ? `${elapsed}s`
            : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
        : null;

    const timeFormatted = step.timestamp
        ? new Date(step.timestamp).toLocaleTimeString('de-DE', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        })
        : '--:--:--';

    return (
        <div className="relative">
            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute left-[19px] top-[40px] bottom-[-12px] w-[2px] bg-border" />
            )}

            <div className="flex flex-col gap-4">
                {/* Timeline Dot */}
                <div className="relative flex-shrink-0">
                    <div className={`
            h-10 w-10 rounded-full flex items-center justify-center font-mono text-xs font-bold
            ${isError
                            ? 'bg-destructive/20 text-destructive border-2 border-destructive'
                            : isSuccess
                                ? 'bg-green-500/20 text-green-600 border-2 border-green-500'
                                : 'bg-primary/10 text-primary border-2 border-primary/30'
                        }
          `}>
                        {String(index + 1).padStart(2, '0')}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                    <Card className={`p-0 ${isError ? 'border-destructive/50 bg-destructive/5' : ''} shadow-sm overflow-hidden`}>
                        <CardHeader className="border-b-2 p-0 m-0">
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden p-0 m-0"
                            >
                                <img
                                    src={`data:image/png;base64,${step.image}`}
                                    alt={step.step}
                                    className="w-full h-full object-cover"
                                />
                            </motion.div>
                        </CardHeader>
                        <CardContent className="px-6 pt-4 pb-8">

                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold font-body mb-1">{step.step}</p>
                                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                                        <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /><span>{timeFormatted}</span></div>
                                        {elapsedFormatted && (<div className="flex items-center gap-1.5"><span>+{elapsedFormatted}</span></div>)}
                                        {isError && (<div className="flex items-center gap-1.5 text-destructive font-semibold"><span>ERROR</span></div>)}
                                        {isSuccess && (<div className="flex items-center gap-1.5 text-green-600 font-semibold"><span>SUCCESS</span></div>)}
                                    </div>
                                </div>
                            </div>

                            {/* Logs */}
                            <div>
                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                                    {step.logs.join('\n')}
                                </pre>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}