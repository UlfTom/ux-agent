// app/simulation/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import {
    Copy, Check, Loader2, Download, Play,
    ChevronDown, ChevronUp, Clock
} from "lucide-react";
import { gradients } from "@/app/_lib/design-tokens";
import { motion } from 'framer-motion';

// Timer Component
function ElapsedTimer({ loading }: { loading: boolean }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!loading) {
            setElapsed(0);
            return;
        }

        const startTime = Date.now();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [loading]);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    return (
        <span className="text-xs font-mono opacity-90 flex-shrink-0">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
    );
}

type LogStep = {
    step: string;
    logs: string[];
    image?: string;
    timestamp?: number; // Unix timestamp in ms
};
const personaTypeOptions = [
    { id: 'pragmatic', name: 'Pragmatisch' },
    { id: 'inspirational', name: 'Inspirativ' },
];

const domainOptions = [
    { id: 'ecommerce', name: 'E-Commerce' },
    { id: 'travel', name: 'Reisebuchung' },
    { id: 'finance', name: 'Finanzdienstleistung' },
];

export default function SimulationPage() {
    const [url, setUrl] = useState('https://www.otto.de');
    const [task, setTask] = useState('Finde eine Winter-Jeans für Damen');
    const [loading, setLoading] = useState(false);
    const [log, setLog] = useState<LogStep[]>([]);
    const [progress, setProgress] = useState(0);
    const [currentStatus, setCurrentStatus] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [browserType, setBrowserType] = useState('chrome');
    const [clickDepth, setClickDepth] = useState(7);
    const [domain, setDomain] = useState('ecommerce');
    const [personaType, setPersonaType] = useState('pragmatic');
    const [activeTab, setActiveTab] = useState('all');

    const handleStartSimulation = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setCopied(false);
        setProgress(0);
        setCurrentStatus('Initialisiere...');
        setLog([]);

        try {
            const res = await fetch('/api/run-simulation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, task, browserType, clickDepth, domain, personaType }),
            });

            if (!res.ok || !res.body) {
                throw new Error('Streaming nicht unterstützt');
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'progress') {
                                setProgress(data.value);
                                setCurrentStatus(data.status || '');
                            }

                            if (data.type === 'step') {
                                setLog(prevLog => [...prevLog, data.step]);
                                if (data.progress) setProgress(data.progress);
                            }

                            if (data.type === 'complete') {
                                setLog(data.log);
                                setProgress(100);
                                setCurrentStatus('Abgeschlossen');

                                if ('Notification' in window && Notification.permission === 'granted') {
                                    new Notification('Simulation abgeschlossen! 🎉', {
                                        body: `${data.log.length} Schritte durchgeführt`,
                                    });
                                }
                            }

                            if (data.type === 'error') {
                                setLog(data.log || [{ step: "FEHLER", logs: [data.message] }]);
                                setProgress(0);
                                setCurrentStatus('Fehler');
                            }

                        } catch (parseError) {
                            console.error('Parse Error:', parseError);
                        }
                    }
                }
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unbekannter Fehler";
            setLog([{ step: "CLIENT-FEHLER", logs: [errorMsg] }]);
            setProgress(0);
            setCurrentStatus('Fehler');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLog = () => {
        if (log.length === 0) return;
        const logText = log.map(step => `${step.step}\n${step.logs.join('\n')}`).join('\n\n');
        navigator.clipboard.writeText(logText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleDownloadZip = async () => {
        if (log.length === 0) return;
        try {
            const res = await fetch('/api/download-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(log)
            });
            if (!res.ok) throw new Error('Zip-Download fehlgeschlagen');
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'simulation_debug.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Unbekannter Fehler");
        }
    };

    const stepsWithImages = log.filter(step => step.image);
    const errorSteps = log.filter(step =>
        step.step.includes('FEHLER') || step.logs.some(l => l.includes('❌'))
    );

    return (
        <div className="min-h-screen bg-background pt-20 mt-20">

            <div className="container mx-auto max-w-[1400px] px-6 py-8">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT: Configuration (5 cols) */}
                    <div className="lg:col-span-5">
                        <div className="sticky top-32">  {/* ← NEU: Sticky wrapper */}
                            <Card className="shadow-sm">

                                <CardContent className="p-6">
                                    <h2 className="text-base font-semibold font-body mb-6">Configuration</h2>

                                    <form onSubmit={handleStartSimulation} className="space-y-6">

                                        {/* URL */}
                                        <div className="space-y-2">
                                            <Label htmlFor="url" className="text-sm font-body font-medium">
                                                Target URL
                                            </Label>
                                            <Input
                                                id="url"
                                                type="url"
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                className="font-body h-10"
                                                placeholder="https://example.com"
                                                required
                                            />
                                        </div>

                                        {/* Task */}
                                        <div className="space-y-2">
                                            <Label htmlFor="task" className="text-sm font-body font-medium">
                                                Task Description
                                            </Label>
                                            <Input
                                                id="task"
                                                type="text"
                                                value={task}
                                                onChange={(e) => setTask(e.target.value)}
                                                className="font-body h-10"
                                                placeholder="Find a product..."
                                                required
                                            />
                                        </div>

                                        {/* Browser */}
                                        <div className="space-y-2">
                                            <Label htmlFor="browser" className="text-sm font-body font-medium">
                                                Browser
                                            </Label>
                                            <Select value={browserType} onValueChange={setBrowserType}>
                                                <SelectTrigger className="font-body h-10 bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-background">
                                                    <SelectItem value="chrome">Chrome</SelectItem>
                                                    <SelectItem value="firefox">Firefox</SelectItem>
                                                    <SelectItem value="safari">Safari</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Max Actions - NUMBER INPUT */}
                                        <div className="space-y-2">
                                            <Label htmlFor="clickDepth" className="text-sm font-body font-medium">
                                                Max Actions
                                            </Label>
                                            <Input
                                                id="clickDepth"
                                                type="number"
                                                min="1"
                                                max="20"
                                                value={clickDepth}
                                                onChange={(e) => setClickDepth(parseInt(e.target.value, 10) || 1)}
                                                className="font-body h-10"
                                            />
                                        </div>

                                        {/* Domain */}
                                        <div className="space-y-2">
                                            <Label htmlFor="domain" className="text-sm font-body font-medium">
                                                Domain
                                            </Label>
                                            <Select value={domain} onValueChange={setDomain} disabled>
                                                <SelectTrigger className="font-body h-10 bg-muted/50">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-background">
                                                    {domainOptions.map(opt => (
                                                        <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground font-body">Currently locked</p>
                                        </div>

                                        {/* Persona Type */}
                                        <div className="space-y-2">
                                            <Label htmlFor="personaType" className="text-sm font-body font-medium">
                                                Persona Type
                                            </Label>
                                            <Select value={personaType} onValueChange={setPersonaType} disabled>
                                                <SelectTrigger className="font-body h-10 bg-muted/50">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-background">
                                                    {personaTypeOptions.map(opt => (
                                                        <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground font-body">Currently locked</p>
                                        </div>

                                        {/* Submit Button with Progress & Timer */}
                                        <div className="relative">
                                            <Button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full h-11 relative overflow-hidden border-0 text-white font-body font-medium shadow-sm bg-transparent"
                                            >
                                                {/* Base Gradient */}
                                                <div
                                                    className="absolute inset-0 transition-opacity duration-300"
                                                    style={{
                                                        background: `linear-gradient(to right, #6366f1, #a855f7, #ec4899)`,
                                                        opacity: loading ? 0.5 : 1
                                                    }}
                                                />

                                                {/* Progress Fill */}
                                                {loading && (
                                                    <motion.div
                                                        className="absolute inset-y-0 left-0"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.3 }}
                                                        style={{
                                                            background: `linear-gradient(to right, #6366f1, #a855f7, #ec4899)`,
                                                            filter: 'brightness(1.3)'
                                                        }}
                                                    />
                                                )}

                                                {/* Content */}
                                                <span className="relative z-10 flex items-center justify-center gap-3 px-4">
                                                    {loading ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />

                                                            {/* Timer - Left side */}
                                                            <ElapsedTimer loading={loading} />

                                                            {/* Status - Center */}
                                                            <span className="flex-1 text-center min-w-0 truncate">
                                                                {currentStatus || 'Running...'}
                                                            </span>

                                                            {/* Progress - Right side */}
                                                            <span className="text-xs opacity-90 flex-shrink-0 font-mono">
                                                                {progress}%
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="h-4 w-4" />
                                                            Start Simulation
                                                        </>
                                                    )}
                                                </span>
                                            </Button>
                                        </div>


                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>


                    {/* RIGHT: Results (7 cols) */}
                    <div className="lg:col-span-7">

                        {/* Header */}

                        {/* Page Title */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold font-headline tracking-tight mb-2">Simulation</h1>
                            <p className="text-sm text-muted-foreground font-body">
                                Test your website with AI-powered user agents
                            </p>
                        </div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-base font-semibold font-body">Execution Log</h2>
                                <p className="text-sm text-muted-foreground font-body mt-1">
                                    {log.length > 0 ? `${log.length} steps recorded` : 'No data yet'}
                                </p>
                            </div>

                            {log.length > 0 && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyLog}
                                        className="font-body h-9"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4 mr-2" />
                                                Copy
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadZip}
                                        className="font-body h-9"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Timeline View - Replace entire Tabs section */}
                        {log.length > 0 ? (
                            <div className="space-y-3">
                                {/* Timeline Header */}
                                <div className="flex items-center gap-3 pb-3 border-b">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    <p className="text-xs font-medium text-muted-foreground font-mono">
                                        EXECUTION TIMELINE
                                    </p>
                                </div>

                                {/* Timeline Items */}
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
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <p className="text-sm font-medium font-body mb-2">No simulation data</p>
                                    <p className="text-xs text-muted-foreground font-body">
                                        Start a simulation to see results
                                    </p>
                                </CardContent>
                            </Card>
                        )}


                    </div>

                </div>
            </div>
        </div>
    );
}

// ===== TIMELINE STEP CARD =====
function TimelineStepCard({
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
    const [imageExpanded, setImageExpanded] = useState(false);
    const isError = step.step.includes('FEHLER') || step.logs.some(l => l.includes('❌'));
    const isSuccess = step.step.includes('abgeschlossen') || step.logs.some(l => l.includes('✅ Aufgabe'));

    // Calculate elapsed time
    const elapsed = step.timestamp && startTime
        ? Math.round((step.timestamp - startTime) / 1000) // seconds
        : null;

    const elapsedFormatted = elapsed !== null
        ? elapsed < 60
            ? `${elapsed}s`
            : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
        : null;

    // Format timestamp
    const timeFormatted = step.timestamp
        ? new Date(step.timestamp).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
        : '--:--:--';

    return (
        <div className="relative">
            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute left-[19px] top-[40px] bottom-[-12px] w-[2px] bg-border" />
            )}

            <div className="flex gap-4">
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
                    <Card className={`${isError ? 'border-destructive/50 bg-destructive/5' : ''} shadow-sm`}>
                        <CardContent className="p-4">

                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold font-body mb-1">{step.step}</p>

                                    {/* Meta Info */}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" />
                                            <span>{timeFormatted}</span>
                                        </div>

                                        {elapsedFormatted && (
                                            <div className="flex items-center gap-1.5">
                                                <span>+{elapsedFormatted}</span>
                                            </div>
                                        )}

                                        {isError && (
                                            <div className="flex items-center gap-1.5 text-destructive font-semibold">
                                                <span>ERROR</span>
                                            </div>
                                        )}

                                        {isSuccess && (
                                            <div className="flex items-center gap-1.5 text-green-600 font-semibold">
                                                <span>SUCCESS</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {step.image && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setImageExpanded(!imageExpanded)}
                                        className="h-8 px-2 flex-shrink-0"
                                    >
                                        {imageExpanded ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </div>

                            {/* Logs */}
                            <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                                    {step.logs.join('\n')}
                                </pre>
                            </div>

                            {/* Screenshot */}
                            {step.image && imageExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-3 border rounded-lg overflow-hidden"
                                >
                                    <img
                                        src={`data:image/png;base64,${step.image}`}
                                        alt={step.step}
                                        className="w-full"
                                    />
                                </motion.div>
                            )}

                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

