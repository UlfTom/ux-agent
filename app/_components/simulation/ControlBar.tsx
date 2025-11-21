// app/_components/simulation/ControlBar.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/app/_components/ui/button";
import { Play, Pause, Square, Loader2 } from "lucide-react";
import { ElapsedTimer } from './ElapsedTimer';

type ControlBarProps = {
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    progress: number;
    currentStatusText: string;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
};

export function ControlBar({
    status,
    progress,
    currentStatusText,
    onStart,
    onPause,
    onResume,
    onStop
}: ControlBarProps) {

    // --- Long Press Logic ---
    const [isHolding, setIsHolding] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const startHold = () => {
        if (status === 'idle' || status === 'completed') return;
        setIsHolding(true);
        setHoldProgress(0);

        const startTime = Date.now();
        const duration = 2000; // 2 Sekunden halten

        holdIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const p = Math.min((elapsed / duration) * 100, 100);
            setHoldProgress(p);

            if (p >= 100) {
                clearInterval(holdIntervalRef.current!);
                onStop();
                setIsHolding(false);
                setHoldProgress(0);
            }
        }, 50);
    };

    const endHold = () => {
        setIsHolding(false);
        setHoldProgress(0);
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };

    // --- Render Logic ---
    const isRunning = status === 'running';
    const isPaused = status === 'paused';
    const isActive = isRunning || isPaused;

    return (
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-[760px] z-99 px-6">

            {/* Container: Transformiert sich basierend auf Status */}
            <div className={`
                relative flex items-center justify-between backdrop-blur-lg border-2
                h-16 rounded-xl shadow-2xl transition-all duration-300 overflow-hidden
                ${isActive ? 'bg-slate-900/70 border-slate-900' : 'bg-gradient-to-r from-[#6366f1] via-purple-500 to-pink-500 border-white/20'}
            `}>

                {/* Progress Bar Background (Nur bei Active) */}
                {isActive && (
                    <div
                        className="absolute inset-0 bg-white/10 transition-all duration-500 ease-linear pointer-events-none"
                        style={{ width: `${progress}%` }}
                    />
                )}

                {/* --- IDLE STATE (Start Button) --- */}
                {!isActive && (
                    <Button
                        onClick={onStart}
                        className="w-full h-full bg-transparent hover:bg-white/10 text-white border-none rounded-none flex items-center justify-center gap-3 text-lg font-bold font-headline"
                    >
                        <Play className="h-6 w-6 fill-current" />
                        <span>Simulation Starten</span>
                    </Button>
                )}

                {/* --- ACTIVE STATE (Controls) --- */}
                {isActive && (
                    <>
                        {/* Left: Status Info */}
                        <div className="flex flex-col justify-center pl-6 pr-4 flex-grow z-10">
                            <div className="flex items-center gap-2 text-white font-mono text-sm">
                                <span className={isPaused ? "text-yellow-400 animate-pulse" : "text-green-400"}>
                                    {isPaused ? 'PAUSIERT' : 'LÄUFT'}
                                </span>
                                <span className="text-slate-500">|</span>
                                <ElapsedTimer loading={true} />
                            </div>
                            <div className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-[300px]">
                                {currentStatusText}
                            </div>
                        </div>

                        {/* Middle: Pause/Resume */}
                        <div className="flex items-center gap-2 pr-2 z-10">
                            <Button
                                onClick={isPaused ? onResume : onPause}
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10"
                            >
                                {isPaused ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5 fill-current" />}
                            </Button>
                        </div>

                        {/* Right: Long Press Stop */}
                        <div className="pr-4 z-10 relative">
                            <button
                                onMouseDown={startHold}
                                onMouseUp={endHold}
                                onMouseLeave={endHold}
                                onTouchStart={startHold}
                                onTouchEnd={endHold}
                                className="group relative h-10 w-10 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 flex items-center justify-center transition-all overflow-hidden"
                            >
                                {/* Hold Progress Circle/Fill */}
                                <div
                                    className="absolute inset-0 bg-red-600 transition-all duration-50 ease-linear origin-bottom"
                                    style={{ height: `${holdProgress}%` }}
                                />

                                <Square className="h-4 w-4 text-red-200 fill-current relative z-10" />
                            </button>
                            {/* Hint Text */}
                            <span className={`absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-red-400 whitespace-nowrap transition-opacity ${isHolding ? 'opacity-100' : 'opacity-0'}`}>
                                Halten zum Stoppen
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}