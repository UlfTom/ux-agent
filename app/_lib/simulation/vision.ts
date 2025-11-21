// app/_lib/simulation/vision.ts

import sharp from 'sharp';
import { InteractableElement, SimulationMode } from './types';

export async function annotateImage(
    screenshotBuffer: Buffer,
    elements: InteractableElement[],
    mode: SimulationMode = 'default' // Default Wert wichtig!
): Promise<string> {

    let pipeline = sharp(screenshotBuffer);

    // 1. Visuelle Einschränkungen simulieren
    if (mode === 'visual_blur') {
        // Simuliert Grauer Star / starke Kurzsichtigkeit ohne Brille
        pipeline = pipeline.blur(5);
    }

    if (mode === 'visual_protanopia') {
        // Simuliert Rot-Grün-Schwäche (Graustufen + niedriger Kontrast)
        pipeline = pipeline.grayscale().linear(0.8, 0.1);
    }

    if (mode === 'elderly_user') {
        // Kombination: Etwas unscharf + weniger Kontrast
        pipeline = pipeline.blur(2).linear(0.9, 0.1);
    }

    const { width, height } = await pipeline.metadata();

    // Begrenze auf 50 Elemente für Performance
    const elementsToAnnotate = elements.slice(0, 50);

    // Bei Sehschwäche machen wir die Boxen dicker, damit DU sie im Debug noch siehst,
    // auch wenn das Bild verschwommen ist.
    const strokeWidth = mode === 'visual_blur' || mode === 'elderly_user' ? 4 : 2;
    const color = mode === 'visual_protanopia' ? 'blue' : 'red'; // Rot ist schlecht bei Rot-Grün-Schwäche ;)

    const svgOverlays = elementsToAnnotate.map(el => `
    <rect x="${el.box.x}" y="${el.box.y}" width="${el.box.width}" height="${el.box.height}" 
          fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>
    <text x="${el.box.x + 5}" y="${el.box.y + 20}" 
          fill="${color}" font-size="20" font-weight="bold" font-family="Arial" style="text-shadow: 1px 1px 2px white;">${el.id}</text>
  `).join('');

    const svg = `<svg width="${width}" height="${height}">${svgOverlays}</svg>`;

    const annotatedBuffer = await pipeline
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .png()
        .toBuffer();

    return annotatedBuffer.toString('base64');
}