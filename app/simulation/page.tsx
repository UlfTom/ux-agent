"use client";

import { useEffect, useState, useRef } from 'react';
import JSZip from 'jszip';
import { LogStep } from '@/app/_lib/simulation/types';
import { ConfigurationPanel } from '@/app/_components/simulation/ConfigurationPanel';
import { ExecutionTimeline } from '@/app/_components/simulation/ExecutionTimeline';
import { ControlBar } from '@/app/_components/simulation/ControlBar';
import { domainOptions, personaTypeOptions } from '@/app/_lib/simulation/constants';

export default function SimulationPage() {
  // ===== CONFIG STATE =====
  const [url, setUrl] = useState("https://www.otto.de");
  const [additionalDomains, setAdditionalDomains] = useState("https://zalando.de");
  const [batchIterations, setBatchIterations] = useState(2);

  const [task, setTask] = useState("Finde eine Jacke für dich und lege sie in den Warenkorb");
  const [browserType, setBrowserType] = useState("chrome");
  const [clickDepth, setClickDepth] = useState(7);
  const [domain, setDomain] = useState(domainOptions[0].id);
  const [personaType, setPersonaType] = useState(personaTypeOptions[0].id);
  const [debugMode, setDebugMode] = useState(true);
  const [simulationMode, setSimulationMode] = useState('default');

  // ===== JOB STATE =====
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'error'>('idle');

  // ===== UI STATE =====
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("Bereit");
  const [log, setLog] = useState<LogStep[]>([]);
  const [hasSuccess, setHasSuccess] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const stopSignalRef = useRef(false);
  const hasDownloadedRef = useRef(false);

  // ===== RECONNECT LOGIC =====
  useEffect(() => {
    const savedJobId = localStorage.getItem('ux_agent_active_job');
    if (savedJobId) {
      console.log("🔄 Stelle Verbindung zu laufendem Job wieder her:", savedJobId);
      connectToJobStream(savedJobId);
    }
  }, []);

  // ===== AUTO DOWNLOAD TRIGGER =====
  useEffect(() => {
    if (jobStatus === 'completed' && log.length > 0 && !hasDownloadedRef.current) {
      console.log("✅ Simulation fertig, starte Auto-Download...");
      handleDownloadZip();
      hasDownloadedRef.current = true;
    }
    if (jobStatus === 'running') {
      hasDownloadedRef.current = false;
    }
  }, [jobStatus, log.length]);

  // ===== STREAMING =====
  const connectToJobStream = (jobId: string) => {
    setActiveJobId(jobId);
    setLoading(true);
    setJobStatus('running');

    const eventSource = new EventSource(`/api/run-simulation?id=${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'history') {
          setLog(data.logs);
          setJobStatus(data.status === 'stopped' ? 'error' : data.status);
          if (['completed', 'stopped', 'error'].includes(data.status)) {
            finishJob(jobId);
            eventSource.close();
          }
        }

        if (data.type === 'step') {
          setLog((prev) => [...prev, { ...data.step, timestamp: Date.now() }]);
          setCurrentStatus(data.step.step);
        }
        if (data.type === 'progress') {
          setProgress(data.value);
          if (data.status) setCurrentStatus(data.status);
        }
        if (data.type === 'status') {
          setJobStatus(data.status);
        }
        if (data.type === 'complete') {
          setLog(data.log);
          setHasSuccess(true);
          setProgress(100);
          finishJob(jobId);
          eventSource.close();
        }
        if (data.type === 'error') {
          setErrorCount(prev => prev + 1);
          setLog(prev => [...prev, { step: "Fehler", logs: [data.message], timestamp: Date.now() }]);
          finishJob(jobId);
          eventSource.close();
        }
      } catch (e) {
        console.error("SSE Parse Error", e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return eventSource;
  };

  const finishJob = (jobId: string) => {
    localStorage.removeItem('ux_agent_active_job');
    setActiveJobId(null);
    setLoading(false);
    if (jobStatus !== 'error') setJobStatus('completed');
  };

  // ===== CONTROL ACTIONS =====
  const handleControl = async (command: string) => {
    if (!activeJobId) return;
    if (command === 'stop') { stopSignalRef.current = true; setJobStatus('error'); }
    if (command === 'pause') setJobStatus('paused');
    if (command === 'resume') setJobStatus('running');

    await fetch('/api/run-simulation', {
      method: 'POST',
      body: JSON.stringify({ action: 'control', command, jobId: activeJobId })
    });
    if (command === 'stop') finishJob(activeJobId);
  };

  // ===== BATCH RUNNER =====
  const runBatch = async () => {
    stopSignalRef.current = false;
    hasDownloadedRef.current = false;
    const urls = [url, ...additionalDomains.split('\n').map(u => u.trim()).filter(u => u.length > 0)];
    const uniqueUrls = Array.from(new Set(urls));

    setLog([]); setHasSuccess(false); setErrorCount(0);

    let count = 0;
    const total = uniqueUrls.length * batchIterations;

    for (const curUrl of uniqueUrls) {
      for (let i = 0; i < batchIterations; i++) {
        if (stopSignalRef.current) return;
        count++;
        setCurrentStatus(`[${count}/${total}] Starte ${new URL(curUrl).hostname}...`);

        try {
          const res = await fetch('/api/run-simulation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'start',
              url: curUrl,
              task, browserType, clickDepth, domain, personaType, debugMode, simulationMode
            })
          });

          if (!res.ok) throw new Error("Start failed");
          const { jobId } = await res.json();
          localStorage.setItem('ux_agent_active_job', jobId);

          // Warten bis Job fertig ist
          await new Promise<void>((resolve) => {
            const es = connectToJobStream(jobId);
            const originalOnMessage = es!.onmessage;
            es!.onmessage = (e) => {
              originalOnMessage?.call(es, e); // Original Logik

              // ⭐️ FIX: Hier fehlte der Parser!
              try {
                const d = JSON.parse(e.data);
                if (d.type === 'complete' || d.type === 'error') {
                  resolve(); // Promise auflösen -> Nächster Loop
                }
              } catch (err) { }
            };

            const checkStop = setInterval(() => {
              if (stopSignalRef.current) {
                es?.close();
                clearInterval(checkStop);
                resolve();
              }
            }, 500);
          });

        } catch (e) {
          setLog(p => [...p, { step: `Batch Error (${curUrl})`, logs: ["Start fehlgeschlagen"], timestamp: Date.now() }]);
        }

        if (count < total) await new Promise(r => setTimeout(r, 1000));
      }
    }
    setJobStatus('completed');
  };

  // ===== HTML EXPORT (Clean & Single File) =====
  const handleDownloadZip = async () => {
    if (log.length === 0) return;
    try {
      const zip = new JSZip();
      const date = new Date().toISOString().split('T')[0];

      // Config Block im HTML
      const configHtml = `
        <div class="meta">
            <h1>UX Report (${date})</h1>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
                <p><strong>Target URL:</strong> <a href="${url}">${url}</a></p>
                <p><strong>Additional Domains:</strong> ${additionalDomains}</p>
                <p><strong>Task:</strong> ${task}</p>
                <p><strong>Persona:</strong> ${personaType}</p>
                <p><strong>Mode:</strong> ${simulationMode}</p>
                <p><strong>Browser:</strong> ${browserType}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Click Depth:</strong> ${clickDepth}</p>
                <p><strong>Debug Mode:</strong> ${debugMode ? 'Enabled' : 'Disabled'}</p>
                <p><strong>Batch Iterations:</strong> ${batchIterations}</p>
            </div>
        </div>`;

      let htmlContent = `
        <!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>UX Report</title>
        <style>
            body{font-family:system-ui,sans-serif;padding:40px;background:#f4f4f5;max-width:900px;margin:0 auto;color:#333} 
            .meta{background:white;padding:20px;border-radius:12px;margin-bottom:30px;box-shadow:0 2px 10px rgba(0,0,0,0.05)}
            .step{background:white;padding:20px;margin-bottom:30px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.05)} 
            .title{font-weight:bold;font-size:1.1em;display:block;margin-bottom:10px;color:#111}
            .logs{font-family:monospace;background:#1f2937;color:#4ade80;padding:15px;border-radius:8px;white-space:pre-wrap;font-size:0.9em}
            img{max-width:100%;border:1px solid #e5e7eb;border-radius:8px;margin-top:15px}
        </style>
        </head><body>
        ${configHtml}`;

      log.forEach((step, i) => {
        const isError = step.step.includes('FEHLER') || step.logs.some(l => l.includes('❌'));
        const badge = isError
          ? `<span class="badge badge-error">Error</span>`
          : `<span class="badge badge-success">Step ${i + 1}</span>`;

        const imgHtml = step.image
          ? `<img src="${step.image.startsWith('data:') ? step.image : 'data:image/png;base64,' + step.image}" loading="lazy" />`
          : '';

        htmlContent += `
                <div class="step">
                    <div class="header">
                        <span class="title">${badge} &nbsp; ${step.step}</span>
                        <span style="color:#9ca3af;font-size:0.9em">${new Date(step.timestamp || 0).toLocaleTimeString()}</span>
                    </div>
                    <div class="logs">${step.logs.join('\n')}</div>
                    ${imgHtml}
                </div>`;
      });

      htmlContent += `</body></html>`;
      zip.file(`report_${date}.html`, htmlContent);

      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `ux_report_${date}.zip`;
      link.click();
    } catch (e: any) { console.error("Export Error", e); }
  };

  const handleCopyLog = () => {
    navigator.clipboard.writeText(log.map(l => `[${l.step}] ${l.logs.join(' ')}`).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = jobStatus === 'running' || jobStatus === 'paused';

  return (
    <div className="bg-background pt-32">
      <div className="container mx-auto max-w-[760px] px-6">
        <div className="flex flex-col gap-8">
          <ConfigurationPanel
            url={url} setUrl={setUrl}
            additionalDomains={additionalDomains} setAdditionalDomains={setAdditionalDomains}
            batchIterations={batchIterations} setBatchIterations={setBatchIterations}
            simulationMode={simulationMode} setSimulationMode={setSimulationMode}
            task={task} setTask={setTask}
            browserType={browserType} setBrowserType={setBrowserType}
            clickDepth={clickDepth} setClickDepth={setClickDepth}
            domain={domain} setDomain={setDomain}
            personaType={personaType} setPersonaType={setPersonaType}
            debugMode={debugMode} setDebugMode={setDebugMode}
            isSimulationRunning={isRunning}
            handleStartSimulation={(e) => { e.preventDefault(); runBatch(); }}
            loading={loading}
            progress={progress}
            currentStatus={currentStatus}
          />
          {isRunning && (
            <ControlBar
              status={jobStatus} progress={progress} currentStatusText={currentStatus}
              onStart={() => { }} onPause={() => handleControl('pause')}
              onResume={() => handleControl('resume')} onStop={() => handleControl('stop')}
            />
          )}

          <ExecutionTimeline
            log={log} loading={loading} isSimulationComplete={progress === 100}
            totalSteps={log.length} successfulSteps={log.length - errorCount} errorCount={errorCount}
            hasSuccess={hasSuccess} totalTime={null} task={task} url={url} errorSteps={[]}
            copied={copied} handleCopyLog={handleCopyLog} handleDownloadZip={handleDownloadZip}
          />
        </div>
      </div>
    </div>
  );
}