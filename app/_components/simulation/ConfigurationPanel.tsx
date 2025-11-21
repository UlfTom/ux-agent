"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { Card, CardContent, CardHeader } from "@/app/_components/ui/card";
import { Loader2, Play } from "lucide-react";
import { ElapsedTimer } from './ElapsedTimer';
import { domainOptions, personaTypeOptions, simulationModeOptions, Option } from '@/app/_lib/simulation/constants';

type ConfigurationPanelProps = {
    url: string;
    setUrl: (url: string) => void;
    additionalDomains: string;
    setAdditionalDomains: (d: string) => void;
    batchIterations: number;
    setBatchIterations: (n: number) => void;
    task: string;
    setTask: (task: string) => void;
    browserType: string;
    setBrowserType: (type: string) => void;
    clickDepth: number;
    setClickDepth: (depth: number) => void;
    domain: string;
    setDomain: (domain: string) => void;
    personaType: string;
    setPersonaType: (type: string) => void;
    debugMode: boolean;
    setDebugMode: (debug: boolean) => void;
    simulationMode: string;
    setSimulationMode: (mode: string) => void;

    handleStartSimulation: (e: React.FormEvent) => void;
    loading: boolean;
    progress: number;
    currentStatus: string;

    // ⭐️ NEU: Damit blenden wir den Button aus
    isSimulationRunning: boolean;
};

export function ConfigurationPanel({
    url, setUrl,
    additionalDomains, setAdditionalDomains,
    batchIterations, setBatchIterations,
    task, setTask,
    browserType, setBrowserType,
    clickDepth, setClickDepth,
    domain, setDomain,
    personaType, setPersonaType,
    debugMode, setDebugMode,
    simulationMode, setSimulationMode,
    handleStartSimulation,
    loading,
    progress,
    currentStatus,
    isSimulationRunning // ⭐️ NEU
}: ConfigurationPanelProps) {
    const [displayurl, setDisplayUrl] = useState('https://www.otto.de');
    const [protcol, setProtocol] = useState('');

    useEffect(() => {
        const match = url.match(/^(https?:\/\/)(www\.)?(.+)$/i);
        if (match) {
            setProtocol(match[1] + (match[2] || ''));
            setDisplayUrl(match[3]);
        } else {
            setProtocol('');
            setDisplayUrl(url);
        }
    }, [url]);

    return (
        <>
            <Card className="rounded-none shadow-none border-2 rounded-xl px-6 pt-4 pb-8">
                {/* ... (Der ganze Inhalt der Card bleibt 1:1 identisch wie vorher) ... */}
                <CardHeader className="p-0 flex flex-col gap-2">
                    <h2 className="font-headline text-base text-black">Configuration</h2>
                </CardHeader>
                <CardContent className="p-0 m-0 flex flex-col gap-8">
                    {/* URL Section */}
                    <div className="flex flex-row gap-8">
                        <div className="grow relative">
                            <Label htmlFor="url" className="font-display">Main URL</Label>
                            <div
                                className="flex items-center h-12 w-full rounded-xl border-2 border-input bg-background px-3 py-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-body"
                                contentEditable
                                id="url"
                                onInput={(e: React.FormEvent<HTMLDivElement>) => setUrl(e.currentTarget.innerText)}
                                suppressContentEditableWarning
                                style={{ outline: 'none', caretColor: 'black' }}
                            >
                                <p><span className="text-gray-400 text-sm">{protcol}</span>{displayurl}</p>
                            </div>
                        </div>
                        <div className="flex-none relative">
                            <Label htmlFor="domain" className="font-display">Domain</Label>
                            <Select value={domain} onValueChange={setDomain} disabled={loading}>
                                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                <SelectContent>{domainOptions.map((opt: Option) => (<SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Multi Domain */}
                    <div className="flex flex-row gap-8 items-start">
                        <p className='flex-none relative mt-3'>batch run:</p>
                        <div className="grow relative">
                            <Label htmlFor="additionalDomains" className="font-display">Additional URLs (One per line)</Label>
                            <Textarea id="additionalDomains" value={additionalDomains} onChange={(e) => setAdditionalDomains(e.target.value)} className="font-body min-h-[60px]" placeholder="https://zalando.de&#10;https://amazon.de" disabled={loading} />
                        </div>
                    </div>

                    <div className="w-full relative">
                        <Label htmlFor="task" className="font-display">Task Description</Label>
                        <Input id="task" value={task} onChange={(e) => setTask(e.target.value)} className="font-body h-12" placeholder="Find a product..." required />
                    </div>

                    {/* Accessibility */}
                    <div className=" space-y-2 relative w-full">
                        <Label htmlFor="simulationMode" className="font-display">Accessible Type</Label>
                        <Select value={simulationMode} onValueChange={setSimulationMode} disabled={loading}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>{simulationModeOptions.map((opt: Option) => (<SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>

                    {/* Persona */}
                    <div className=" space-y-2 relative w-full">
                        <Label htmlFor="personaType" className="font-display">Persona Type</Label>
                        <Select value={personaType} onValueChange={setPersonaType} disabled={loading}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>{personaTypeOptions.map((opt: Option) => (<SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>

                    <hr></hr>

                    {/* Debug */}
                    <div className="flex items-center space-x-2 pt-4">
                        <input type="checkbox" id="debugMode" checked={debugMode} onChange={(e) => setDebugMode(e.target.checked)} className="h-4 w-4" />
                        <label htmlFor="debugMode" className="text-sm font-medium leading-none">Debug-Modus (Screenshots & Bounding Boxes anzeigen)</label>
                    </div>

                    <div className='flex gap-8'>
                        <div className=" space-y-2 relative w-full">
                            <Label htmlFor="iterations" className="font-display">Runs</Label>
                            <Input id="iterations" type="number" min={1} max={10} value={batchIterations} onChange={(e) => setBatchIterations(parseInt(e.target.value, 10) || 1)} className="font-body h-12 text-center" />
                        </div>
                        <div className=" space-y-2 relative w-full">
                            <Label htmlFor="clickDepth" className="font-display">Max Actions</Label>
                            <Input id="clickDepth" type="number" min={1} max={20} value={clickDepth} onChange={(e) => setClickDepth(parseInt(e.target.value, 10) || 1)} className="font-body h-12" />
                        </div>
                        <div className=" space-y-2 relative w-full">
                            <Label htmlFor="browser" className="font-display">Browser</Label>
                            <Select value={browserType} onValueChange={setBrowserType}>
                                <SelectTrigger className=" h-12"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="chrome">Chrome</SelectItem>
                                    <SelectItem value="firefox">Firefox</SelectItem>
                                    <SelectItem value="safari">Safari</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ⭐️ LOGIK: Button nur anzeigen, wenn KEINE Simulation läuft 
                Dadurch verschwindet er und macht Platz für die ControlBar */}
            {!isSimulationRunning && (
                <Button
                    type="submit"
                    onClick={handleStartSimulation}
                    disabled={loading}
                    className="w-100 h-12 fixed bottom-6 inset-x-0 m-auto overflow-hidden font-headline font-bold text-base backdrop-blur-xl z-50 rounded-xl"
                    style={{ background: `linear-gradient(to right, #6366f1, #a855f7, #ec4899)` }}
                >
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to right, #6366f1, #a855f7, #ec4899)` }} />
                    <div className="absolute inset-0 bg-white/20 transition-all duration-300" style={{ width: `${progress}%` }} />

                    <div className="relative text-white z-10 flex items-center justify-between w-full px-4">
                        {loading ? (
                            <>
                                <span className="text-sm"><ElapsedTimer loading={loading} /></span>
                                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{currentStatus || 'Running...'}</span>
                                <span className="text-sm">{progress}%</span>
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
            )}
        </>
    );
}