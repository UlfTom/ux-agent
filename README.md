This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Lokale Voraussetzungen (Development)

Damit die KI-Simulation lokal ausgeführt werden kann, müssen zwei Kernkomponenten eingerichtet sein: **Ollama** (für die LLMs) und **Playwright** (für die Browser-Steuerung).

### 1. Ollama (Das "Gehirn")

Ollama wird benötigt, um die KI-Modelle lokal auszuführen.

1.  **Ollama installieren:**
    Laden und installieren Sie Ollama von [ollama.com](https://ollama.com).

2.  **KI-Modelle herunterladen:**
    Die Simulation benötigt drei spezifische Modelle. Führen Sie die folgenden Befehle in Ihrem Terminal aus:

    ```bash
    ollama pull llava:latest
    ollama pull mistral:latest
    ollama pull llama3.2:latest
    ```

3.  **Ollama-Server starten:**
    Stellen Sie sicher, dass die Ollama-Anwendung läuft (normalerweise startet sie automatisch nach der Installation). Der Server muss unter `http://localhost:11434` erreichbar sein.

### 2. Playwright (Die "Hände")

Playwright wird über `npm` installiert, aber die eigentlichen Browser-Binärdateien müssen separat heruntergeladen werden.

1.  **Abhängigkeiten installieren (falls noch nicht geschehen):**
    ```bash
    npm install
    ```

2.  **Playwright-Browser installieren:**
    Dieser Befehl lädt die notwendigen Browser (Chromium, Firefox, WebKit), die Playwright zur Steuerung benötigt:

    ```bash
    npx playwright install
    ```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev

Open http://localhost:3000 with your browser to see the result.

You can start editing the page by modifying app/page.tsx. The page auto-updates as you edit the file.

This project uses next/font to automatically optimize and load Geist, a new font family for Vercel.

Learn More
To learn more about Next.js, take a look at the following resources:

Next.js Documentation - learn about Next.js features and API.

Learn Next.js - an interactive Next.js tutorial.

You can check out the Next.js GitHub repository - your feedback and contributions are welcome!

Deploy on Vercel
The easiest way to deploy your Next.js app is to use the Vercel Platform from the creators of Next.js.

Check out our Next.js deployment documentation for more details.