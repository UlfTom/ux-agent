// app/simulation/page.tsx
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Rabbit, Copy, Check, Loader2, Info, Eye, Download, Settings } from "lucide-react";

type LogStep = { step: string; logs: string[]; image?: string; };
const personaTypeOptions = [{ id: 'pragmatic', name: 'Pragmatisch' }, { id: 'inspirational', name: 'Inspirativ (Stöbernd)' },];
const domainOptions = [{ id: 'ecommerce', name: 'E-Commerce' }, { id: 'travel', name: 'Reisebuchung' }, { id: 'finance', name: 'Finanzdienstleistung' },];

export default function SimulationPage() {
    const [url, setUrl] = useState('https://www.otto.de');
    const [task, setTask] = useState('Finde eine Winter-Jeans für Damen');
    const [loading, setLoading] = useState(false);
    const [log, setLog] = useState<LogStep[]>([]);
    const [progress, setProgress] = useState(0);
    const [copied, setCopied] = useState(false);
    const [browserType, setBrowserType] = useState('chrome');
    const [clickDepth, setClickDepth] = useState(7);
    const [personasCount, setPersonasCount] = useState(1);
    const [domain, setDomain] = useState('ecommerce');
    const [personaType, setPersonaType] = useState('pragmatic');

    const handleStartSimulation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setCopied(false);
        setProgress(30);

        // --- HIER IST DER UI-SYNC-FIX ---
        // Setze eine initiale Lade-Nachricht im Logbuch, *bevor* der Fetch startet
        setLog([
            {
                step: "Simulation wird initialisiert...",
                logs: ["Generiere Persona (mit Mistral)...", "Starte Playwright-Browser..."]
            }
        ]);
        // --- ENDE DES FIXES ---

        try {
            const res = await fetch('/api/run-simulation', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, task, browserType, clickDepth, domain, personaType }),
            });
            setProgress(70);
            const data = await res.json();
            if (!res.ok) {
                // Überschreibe das Log mit den Fehler-Logs vom Server
                setLog(data.log || [{ step: "FEHLER", logs: [data.message || 'Unbekannter Serverfehler'] }]);
                throw new Error(data.message || 'Simulation fehlgeschlagen');
            }
            setLog(data.log); // Überschreibe das Lade-Log mit dem echten Log
            setProgress(100);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unbekannter Fehler";
            // Füge den Fehler zum bestehenden (Lade-)Log hinzu, falls es noch leer ist
            if (log.length <= 1) {
                setLog(prevLog => [...prevLog, { step: "CLIENT-FEHLER", logs: [errorMsg] }]);
            }
            setProgress(0);
        } finally {
            setLoading(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleCopyLog = () => {
        if (log.length === 0) return;
        const logText = log.map(step => `${step.step}\n${step.logs.join('\n')}`).join('\n\n');
        if (navigator.clipboard) {
            navigator.clipboard.writeText(logText).then(() => {
                setCopied(true); setTimeout(() => setCopied(false), 2000);
            }).catch(err => console.warn('Fehler beim Kopieren:', err));
        } else {
            const textArea = document.createElement("textarea"); textArea.value = logText;
            document.body.appendChild(textArea); textArea.focus(); textArea.select();
            try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); }
            catch (err) { console.error('Fallback-Kopieren fehlgeschlagen:', err); }
            document.body.removeChild(textArea);
        }
    };

    const handleDownloadZip = async () => {
        if (log.length === 0) return;
        try {
            const res = await fetch('/api/download-zip', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(log)
            });
            if (!res.ok) throw new Error('Zip-Download fehlgeschlagen');
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = downloadUrl; a.download = 'simulation_debug.zip';
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            alert(error instanceof Error ? error.message : "UnbekNannter Fehler");
        }
    };

    return (
        <main className="container mx-auto max-w-5xl px-4 py-32">
            <div className="space-y-12">

                <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
                    <CardHeader className="p-0 mb-6">
                        <CardTitle className="text-2xl font-bold">Simulationseinstellungen</CardTitle>
                        <CardDescription>
                            Definiere die Parameter für deinen nächsten Testlauf.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <form onSubmit={handleStartSimulation} className="space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="domain">Domain (Gesperrt)</Label>
                                    <Select value={domain} onValueChange={setDomain} disabled>
                                        <SelectTrigger id="domain"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {domainOptions.map(opt => (
                                                <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="personaType">Persona-Typ (Gesperrt)</Label>
                                    <Select value={personaType} onValueChange={setPersonaType} disabled>
                                        <SelectTrigger id="personaType"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {personaTypeOptions.map(opt => (
                                                <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="personas">Anzahl (Gesperrt)</Label>
                                    <Input id="personas" type="number" value={personasCount} disabled readOnly className="cursor-not-allowed bg-slate-50" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                                <div className="space-y-2">
                                    <Label htmlFor="browser">Browser</Label>
                                    <Select value={browserType} onValueChange={setBrowserType}>
                                        <SelectTrigger id="browser"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="chrome">Chrome</SelectItem>
                                            <SelectItem value="firefox">Firefox</SelectItem>
                                            <SelectItem value="safari">Safari</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="clicks">Max. Aktionen</Label>
                                    <Input id="clicks" type="number" value={clickDepth} onChange={(e) => setClickDepth(parseInt(e.target.value, 10))} min="1" max="10" />
                                </div>
                            </div>

                            <div className="space-y-6 pt-6 border-t">
                                <div className="space-y-2">
                                    <Label htmlFor="url">Start-URL</Label>
                                    <Input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="task">Aufgabe für die KI</Label>
                                    <Input id="task" type="text" value={task} onChange={(e) => setTask(e.target.value)} required />
                                </div>
                            </div>

                            {loading && <Progress value={progress} className="w-full" />}
                            <Button type="submit" disabled={loading} className="w-full text-lg" size="lg">
                                {loading ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Simulation läuft...</>)
                                    : (<><Rabbit className="mr-2 h-5 w-5" /> Simulation starten</>)}
                            </Button>
                        </form>
                    </CardContent>
                </div>

                <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
                    <CardHeader className="p-0 mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Simulations-Logbuch</CardTitle>
                                <CardDescription>
                                    Visuelle Schritte und Aktionen des Agenten.
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={handleCopyLog} disabled={log.length === 0} title="Log kopieren">
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleDownloadZip} disabled={log.length === 0} title="Debug-Zip herunterladen">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-6 overflow-y-auto h-[600px] p-1 border rounded-md">
                            {log.length > 0 ? (
                                log.map((step, index) => (
                                    <div key={`${step.step}-${index}`} className="border-b last-border-b-0">
                                        <div className="p-3">
                                            <h3 className="font-semibold text-lg">{step.step}</h3>
                                        </div>
                                        {step.image && (
                                            <div className="bg-slate-100 p-2">
                                                <img src={`data:image/png;base64,${step.image}`} alt={`Screenshot für ${step.step}`} className="w-full rounded-md border-2 border-slate-300" />
                                            </div>
                                        )}
                                        <pre className="text-sm bg-white text-slate-600 p-4 overflow-x-auto whitespace-pre-wrap">
                                            {step.logs.join('\n')}
                                        </pre>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-500 py-20">
                                    <Eye className="mx-auto h-12 w-12 text-slate-400" />
                                    <p className="mt-2">Simulation noch nicht gestartet...</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </div>

            </div>
        </main>
    );
}