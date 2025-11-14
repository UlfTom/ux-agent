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