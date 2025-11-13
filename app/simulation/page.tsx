// app/simulation/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { LogStep } from '@/app/_lib/simulation/types'; // ⭐️ WICHTIG: Importiert den globalen Typ
import { ConfigurationPanel } from '@/app/_components/simulation/ConfigurationPanel'; // ⭐️ KORRIGIERTER IMPORT-PFAD
import { ExecutionTimeline } from '@/app/_components/simulation/ExecutionTimeline'; // ⭐️ KORRIGIERTER IMPORT-PFAD
import { domainOptions, personaTypeOptions } from '@/app/_lib/simulation/constants'; // Importiert aus der neuen Datei

// Timer Component (bleibt in der Haupt-Page, da von ConfigurationPanel importiert)
export function ElapsedTimer({ loading }: { loading: boolean }) {
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

export default function SimulationPage() {
  // ===== STATE MANAGEMENT (Bleibt alles in der Haupt-Page) =====
  const [url, setUrl] = useState('https://www.otto.de');
  const [task, setTask] = useState('Finde eine Winter-Jeans für Damen');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<LogStep[]>([]); // ⭐️ Verwendet globalen LogStep-Typ
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [browserType, setBrowserType] = useState('chrome');
  const [clickDepth, setClickDepth] = useState(8); // Standard auf 8
  const [domain, setDomain] = useState('E-Commerce');
  const [personaType, setPersonaType] = useState<string>('Pragmatisch & Zielorientiert');
  const [debugMode, setDebugMode] = useState(true);

  // ===== API HANDLER (Bleiben alle in der Haupt-Page) =====
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
        body: JSON.stringify({
          url,
          task,
          browserType,
          clickDepth,
          domain,
          personaType,
          language: 'de', // Hardcoded für jetzt
          debugMode
        }),
        cache: 'no-store',
      });

      if (!res.ok || !res.body) throw new Error('Streaming nicht unterstützt');

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
              }
              if (data.type === 'error') {
                setLog(data.log || [{ step: "FEHLER", logs: [data.message], timestamp: Date.now() }]);
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
      setLog([{ step: "CLIENT-FEHLER", logs: [errorMsg], timestamp: Date.now() }]);
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

  // ===== BERECHNETE WERTE (Bleiben in der Haupt-Page) =====
  const errorSteps = log.filter(step =>
    step.step.includes('FEHLER') || step.logs.some(l => l.includes('❌') || l.includes('Fehler:'))
  );
  const isSimulationComplete = !loading && log.length > 0;
  const totalSteps = log.length;
  const successfulSteps = log.filter(step => !errorSteps.includes(step)).length;
  const errorCount = errorSteps.length;
  // ⭐️ BESSERE ERFOLGSERKENNUNG
  const hasSuccess = log.some(step => step.logs.some(l => l.includes('STOPP') || l.includes('Stopp!')) && errorCount === 0);
  const totalTime = log.length > 0 && log[0].timestamp && log[log.length - 1].timestamp
    ? Math.round((log[log.length - 1].timestamp! - log[0].timestamp!) / 1000)
    : null;


  // ===== RENDER (Jetzt sauber & aufgeräumt) =====
  return (
    <div className="bg-background pt-32">
      <div className="container mx-auto max-w-[760px] px-6">
        <div className="flex flex-col gap-8">
          <ConfigurationPanel
            url={url} setUrl={setUrl}
            task={task} setTask={setTask}
            browserType={browserType} setBrowserType={setBrowserType}
            clickDepth={clickDepth} setClickDepth={setClickDepth}
            domain={domain} setDomain={setDomain}
            personaType={personaType} setPersonaType={setPersonaType}
            debugMode={debugMode} setDebugMode={setDebugMode}
            handleStartSimulation={handleStartSimulation}
            loading={loading}
            progress={progress}
            currentStatus={currentStatus}
          />
          <ExecutionTimeline
            log={log}
            loading={loading}
            isSimulationComplete={isSimulationComplete}
            totalSteps={totalSteps}
            successfulSteps={successfulSteps}
            errorCount={errorCount}
            hasSuccess={hasSuccess}
            totalTime={totalTime}
            task={task}
            url={url}
            errorSteps={errorSteps}
            copied={copied}
            handleCopyLog={handleCopyLog}
            handleDownloadZip={handleDownloadZip}
          />

        </div>
      </div>
    </div>
  );
}