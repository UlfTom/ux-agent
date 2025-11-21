// app/_lib/simulation/utils.ts

import { Language } from './types';

export async function retryAsync<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    delayMs: number = 500
): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }
    }
    throw lastError;
}

// ERWEITERT: Unterstützt jetzt auch Model-Varianten mit :latest
export async function callLLM(
    model: 'mistral:latest' | 'llava:latest' | 'llama3.2:latest',
    prompt: string,
    imageBase64?: string, // GEÄNDERT: Einfacher Parameter
    language: Language = 'de',
    format?: 'json'
): Promise<string> {
    return await retryAsync(async () => {
        // Normalize model name (remove :latest suffix for API)

        const body: any = {
            model: model,
            prompt,
            stream: false,
        };

        // GEÄNDERT: Bild als einzelner string statt array
        if (imageBase64) {
            body.images = [imageBase64];
        }

        if (format) body.format = format;

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error(`Ollama ${model} Fehler: ${response.statusText}`);

        const responseBody = await response.json();
        return responseBody.response.trim().replace(/^\"|\"$/g, '');
    }, 2, 500);
}

export function sendSSE(controller: ReadableStreamDefaultController, data: any) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
}

export function stripAnsiCodes(str: string): string {
    return str.replace(/[\u001b\u009b][[()#;?]?[0-9]{1,4}(?:;[0-9]{0,4})?[0-9A-ORZcf-nqry=><]/g, '');
}