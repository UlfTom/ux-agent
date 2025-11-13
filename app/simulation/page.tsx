// app/simulation/page.tsx

"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { Card, CardContent, CardHeader } from "@/app/_components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import {
  Copy, Check, Loader2, Download, Play,
  ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, AlertCircle,
  ImageUp,
  ImageDown
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
    <span className="font-mono">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

type LogStep = {
  step: string;
  logs: string[];
  image?: string;
  timestamp?: number;
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
  const [currentStatus, setCurrentStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [browserType, setBrowserType] = useState('chrome');
  const [clickDepth, setClickDepth] = useState(7);
  const [domain, setDomain] = useState('ecommerce');
  const [personaType, setPersonaType] = useState('pragmatic');
  const [activeTab, setActiveTab] = useState('all');
  const [debugMode, setDebugMode] = useState(true); // ⭐️ NEU: Debug-State

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
        body: JSON.stringify({ url, task, browserType, clickDepth, domain, personaType, debugMode }),
        cache: 'no-store', // <-- DIESE ZEILE HINZUFÜGEN
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

  // Calculate summary stats
  const isSimulationComplete = !loading && log.length > 0;
  const totalSteps = log.length;
  const successfulSteps = log.filter(step =>
    !step.step.includes('FEHLER') && !step.logs.some(l => l.includes('❌'))
  ).length;
  const errorCount = errorSteps.length;
  const hasSuccess = log.some(step =>
    step.step.includes('abgeschlossen') || step.logs.some(l => l.includes('✅ Aufgabe'))
  );
  const totalTime = log.length > 0 && log[0].timestamp && log[log.length - 1].timestamp
    ? Math.round((log[log.length - 1].timestamp! - log[0].timestamp!) / 1000)
    : null;

  return (
    <div className="bg-background pt-32">

      <div className="container mx-auto max-w-[1400px] px-6">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT: Configuration (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-32">  {/* ← NEU: Sticky wrapper */}
              <Card className="rounded-none shadow-none border-0 border-r-2" style={{ height: 'calc(100vh - 32 * 1.5 * 4px)' }}>
                <CardHeader className="space-y-1 pb-4">
                  <h2 className="font-headline text-md text-black">
                    Configuration
                  </h2>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleStartSimulation} className="space-y-4 flex flex-col gap-8">
                    {/* URL */}
                    <div className=" space-y-2 relative w-full w-full">
                      <Label htmlFor="url" className="font-display">Target URL</Label>
                      <Input
                        id="url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="font-body h-12"
                        placeholder="https://example.com"
                        required
                      />
                    </div>

                    {/* Task */}
                    <div className=" space-y-2 relative w-full">
                      <Label htmlFor="task" className="font-display">Task Description</Label>
                      <Input
                        id="task"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        className="font-body  h-12"
                        placeholder="Find a product..."
                        required
                      />
                    </div>

                    {/* Browser */}
                    <div className=" space-y-2 relative w-full">
                      <Label htmlFor="browser" className="font-display">Browser</Label>
                      <Select value={browserType} onValueChange={setBrowserType}>
                        <SelectTrigger className=" h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chrome">Chrome</SelectItem>
                          <SelectItem value="firefox">Firefox</SelectItem>
                          <SelectItem value="safari">Safari</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Max Actions */}
                    <div className=" space-y-2 relative w-full">
                      <Label htmlFor="clickDepth" className="font-display">Max Actions</Label>
                      <Input
                        id="clickDepth"
                        type="number"
                        min={1}
                        max={20}
                        value={clickDepth}
                        onChange={(e) => setClickDepth(parseInt(e.target.value, 10) || 1)}
                        className="font-body h-12"
                      />
                    </div>

                    {/* Domain */}
                    <div className=" space-y-2 relative w-full">
                      <Label htmlFor="domain" className="font-display">Domain</Label>
                      <Select value={domain} onValueChange={setDomain} disabled>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {domainOptions.map(opt => (
                            <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Currently locked</p>
                    </div>

                    {/* Persona Type */}
                    <div className=" space-y-2 relative w-full">
                      <Label htmlFor="personaType" className="font-display">Persona Type</Label>
                      <Select value={personaType} onValueChange={setPersonaType} disabled>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {personaTypeOptions.map(opt => (
                            <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Currently locked</p>
                    </div>

                    {/* ⭐️ KORRIGIERT: Debug-Modus mit Standard-HTML ⭐️ */}
                    <div className="flex items-center space-x-2 pt-4">
                      <input
                        type="checkbox"
                        id="debugMode"
                        checked={debugMode}
                        onChange={(e) => setDebugMode(e.target.checked)} // ✅ KORREKT
                        className="h-4 w-4"
                      />
                      <label
                        htmlFor="debugMode"
                        className="text-sm font-medium leading-none"
                      >
                        Debug-Modus (Screenshots & Bounding Boxes anzeigen)
                      </label>
                    </div>

                    {/* Submit Button with Progress & Timer */}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 relative overflow-hidden font-display font-bold text-base"
                      style={{
                        background: `linear-gradient(to right, #6366f1, #a855f7, #ec4899)`,
                      }}
                    >
                      {/* Base Gradient */}
                      <div className="absolute inset-0" style={{
                        background: `linear-gradient(to right, #6366f1, #a855f7, #ec4899)`,
                      }} />

                      {/* Progress Fill */}
                      <div
                        className="absolute inset-0 bg-white/20 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />

                      {loading && (
                        <div className="absolute inset-0 bg-black/10">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="relative text-white z-10 flex items-center justify-between w-full px-4">
                        {loading ? (
                          <>
                            {/* Timer - Left side */}
                            <span className="text-sm opacity-90">
                              <ElapsedTimer loading={loading} />
                            </span>

                            {/* Status - Center */}
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {currentStatus || 'Running...'}
                            </span>

                            {/* Progress - Right side */}
                            <span className="text-sm opacity-90">
                              {progress}%
                            </span>
                          </>
                        ) : (
                          <>
                            <Play className="h-5 w-5" />
                            <span>Start Simulation</span>
                            <div className="w-5" />
                          </>
                        )}
                      </div>
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* RIGHT: Results (7 cols) */}
          <div className="col-span-12 lg:col-span-7">
            {/* Header */}
            <div className="mb-6">
              {/* Page Title */}
              <div className="mb-8">
                <h2 className="font-headline text-md text-black">
                  Simulation
                </h2>
                <p className="text-muted-foreground">
                  Test your website with AI-powered user agents
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display font-bold">Execution Log</h2>
                  <p className="text-sm text-muted-foreground">
                    {log.length > 0 ? `${log.length} steps recorded` : 'No data yet'}
                  </p>
                </div>

                {log.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLog}
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadZip}
                      className="gap-2"
                    >
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

                {/* ===== NEUE FAZIT-SEKTION ===== */}
                {isSimulationComplete && (

                  <div className="flex gap-4">
                    {/* Timeline Dot */}
                    <div className="relative flex-shrink-0">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center font-mono text-xs font-bold">
                        Ende
                      </div>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      {/* End Marker */}
                      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground uppercase tracking-wider my-8">
                        <div className="h-px flex-1 bg-border" />
                        <span>ENDE</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>

                      {/* Summary Card */}
                      <Card className="border-2 shadow-lg overflow-hidden">
                        {/* Header with gradient */}
                        <div
                          className="p-6 text-white"
                          style={{
                            background: `linear-gradient(to right, #6366f1, #a855f7, #ec4899)`,
                          }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            {hasSuccess ? (
                              <CheckCircle2 className="h-8 w-8" />
                            ) : errorCount > 0 ? (
                              <XCircle className="h-8 w-8" />
                            ) : (
                              <AlertCircle className="h-8 w-8" />
                            )}
                            <h3 className="text-2xl font-display font-bold">
                              Test-Zusammenfassung
                            </h3>
                          </div>
                          <p className="text-white/90 text-sm">
                            Vollständiger Durchlauf der Simulation abgeschlossen
                          </p>
                        </div>

                        <CardContent className="p-6 space-y-6">
                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Status:</span>
                            {hasSuccess ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-sm font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Erfolgreich abgeschlossen
                              </span>
                            ) : errorCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-sm font-medium">
                                <XCircle className="h-4 w-4" />
                                Mit Fehlern abgeschlossen
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-sm font-medium">
                                <AlertCircle className="h-4 w-4" />
                                Abgeschlossen
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
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border">
                              {task}
                            </p>
                          </div>

                          {/* URL */}
                          <div className="space-y-2">
                            <h4 className="font-display font-semibold text-sm">Ziel-URL</h4>
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border font-mono break-all">
                              {url}
                            </p>
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
              <Card className="border-2 p-12 text-center">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Play className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg mb-1">No simulation data</h3>
                    <p className="text-sm">Start a simulation to see results</p>
                  </div>
                </div>
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
          <Card className={`p-8 ${isError ? 'border-destructive/50 bg-destructive/5' : ''} shadow-sm`}>
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
                      <ImageUp className="h-4 w-4" />
                    ) : (
                      <ImageDown className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>

              {/* Logs */}
              <div>
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
                  className="mt-3 border-2 rounded-lg overflow-hidden"
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
