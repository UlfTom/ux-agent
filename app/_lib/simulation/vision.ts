// app/_lib/simulation/vision.ts

import sharp from 'sharp';
import { InteractableElement } from './types';

export async function annotateImage(
    screenshotBuffer: Buffer,
    elements: InteractableElement[]
): Promise<string> {
    const { width, height } = await sharp(screenshotBuffer).metadata();

    const elementsToAnnotate = elements.slice(0, 50);

    const svgOverlays = elementsToAnnotate.map(el => `
    <rect x="${el.box.x}" y="${el.box.y}" width="${el.box.width}" height="${el.box.height}" 
          fill="none" stroke="red" stroke-width="2"/>
    <text x="${el.box.x + 5}" y="${el.box.y + 20}" 
          fill="red" font-size="16" font-weight="bold" font-family="Arial">${el.id}</text>
  `).join('');

    const svg = `<svg width="${width}" height="${height}">${svgOverlays}</svg>`;

    const annotatedBuffer = await sharp(screenshotBuffer)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .png()
        .toBuffer();

    return annotatedBuffer.toString('base64');
}
