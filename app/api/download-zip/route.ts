// app/api/download-zip/route.ts

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

type LogStep = {
    step: string;
    logs: string[];
    image?: string; // base64 Screenshot
};

export async function POST(request: NextRequest) {
    try {
        const logData = (await request.json()) as LogStep[];
        const zip = new JSZip();

        let logFileText = "";

        logData.forEach((step, index) => {
            const stepTitle = `\n\n====================\n${step.step}\n====================\n`;
            logFileText += stepTitle;
            logFileText += step.logs.join('\n');

            if (step.image) {
                // KORREKTUR: Playwright gibt reines base64 zurück, OHNE 'data:image/png;base64,'
                // Das .split(',')[1] aus der alten Version war der Bug.
                const base64Data = step.image;

                const cleanStepName = step.step.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
                const fileName = `schritt_${index + 1}_${cleanStepName}.png`;

                zip.file(fileName, base64Data, { base64: true });
            }
        });

        zip.file("simulation_log.txt", logFileText);

        const zipBuffer = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
        });

        const headers = new Headers();
        headers.set('Content-Type', 'application/zip');
        headers.set('Content-Disposition', 'attachment; filename="debug_simulation.zip"');

        return new Response(zipBuffer, { headers: headers });

    } catch (error: any) {
        console.error("Fehler beim Erstellen der Zip-Datei:", error);
        return NextResponse.json({ message: "Zip-Erstellung fehlgeschlagen" }, { status: 500 });
    }
}