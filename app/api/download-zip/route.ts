import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { LogStep } from '@/app/_lib/simulation/types';

export async function POST(request: NextRequest) {
    try {
        // Empfange Log-Array (Achtung: Format beachten)
        // Wir erwarten { logs: LogStep[] } oder direkt LogStep[]
        const body = await request.json();
        const logData: LogStep[] = Array.isArray(body) ? body : body.logs;

        if (!logData || !Array.isArray(logData)) {
            throw new Error("Ungültiges Log-Format");
        }

        const zip = new JSZip();

        // 1. HTML Report generieren
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>UX Simulation Report</title>
            <style>
                body { font-family: sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
                .step { background: white; padding: 20px; margin-bottom: 30px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; }
                .header h2 { margin: 0; color: #333; }
                .timestamp { color: #888; font-size: 0.9em; }
                .content { display: flex; gap: 20px; flex-direction: column; }
                .logs { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; border: 1px solid #e9ecef; }
                .screenshot { width: 100%; border: 1px solid #ddd; border-radius: 4px; }
                .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
                .badge-error { background: #ffebee; color: #c62828; }
                .badge-success { background: #e8f5e9; color: #2e7d32; }
            </style>
        </head>
        <body>
            <h1>UX Simulation Report</h1>
            <p>Generiert am: ${new Date().toLocaleString()}</p>
        `;

        logData.forEach((step, index) => {
            const isError = step.step.includes('FEHLER') || step.logs.some(l => l.includes('❌'));
            const isSuccess = step.step.includes('abgeschlossen');

            const badge = isError ? '<span class="badge badge-error">FEHLER</span>' :
                isSuccess ? '<span class="badge badge-success">ERFOLG</span>' : '';

            // Screenshot einbetten (Data URI)
            const imageHtml = step.image
                ? `<img class="screenshot" src="data:image/png;base64,${step.image}" alt="Screenshot Schritt ${index + 1}" />`
                : '';

            htmlContent += `
            <div class="step">
                <div class="header">
                    <h2>${index + 1}. ${step.step} ${badge}</h2>
                    <span class="timestamp">${step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : ''}</span>
                </div>
                <div class="content">
                    <div class="logs">${step.logs.join('\n')}</div>
                    ${imageHtml}
                </div>
            </div>
            `;
        });

        htmlContent += `</body></html>`;

        // HTML zum ZIP hinzufügen
        zip.file("report.html", htmlContent);

        // Optional: Rohdaten als JSON
        zip.file("data.json", JSON.stringify(logData, null, 2));

        const zipBuffer = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
        });

        return new Response(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="simulation_report.zip"'
            }
        });

    } catch (error: any) {
        console.error("Zip Error:", error);
        return NextResponse.json({ message: "Zip Fehler: " + error.message }, { status: 500 });
    }
}