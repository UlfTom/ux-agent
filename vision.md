# Projekt-Vision: KI UX-Agent

## 1. Das Leitbild (The "Why")

Unser Ziel ist es, von statischen, manuellen UX-Tests (z.B. mit PDFs oder moderierten Sessions) zu **dynamischen, skalierten und autonomen Usability-Simulationen** überzugehen.

Wir bauen ein System, das nicht nur prüft, *ob* eine Aufgabe lösbar ist, sondern *wie* und *warum* eine Persona eine bestimmte Entscheidung trifft. Wir kombinieren **qualitative Tiefe (n=1)** mit **quantitativer Skalierung (n=100)**, indem wir realistische, datengetriebene Personas "live" auf unserer echten Web-Anwendung testen.

Das Endziel ist ein "digitaler Zwilling" unseres Kundenstamms, der es uns ermöglicht, Design-Entscheidungen, A/B-Tests und Neukunden-Strategien zu validieren, bevor sie live gehen.

## 2. Die Produkt-Pakete (Das Geschäftsmodell)

Unser System wird in drei Stufen entwickelt und angeboten, die aufeinander aufbauen:

### Paket 1: "Basic" (Unmoderierte Simulation)

* **Das Produkt:** Ein schneller, "dummer" Agent, der eine Aufgabe ausführt.
* **Module:** `Pilot` (Modul 3)
* **Funktion:** Der Benutzer gibt eine URL und eine Aufgabe ein. Der Pilot (Agent) versucht, diese Aufgabe so effizient wie möglich zu erledigen (basierend auf einem generischen Standard-Prompt).
* **Wert:** **Quantitatives "Smoke Testing".**
    * *Antwortet auf:* "Ist der Checkout-Flow technisch kaputt?"
    * *Antwortet auf:* "Führt dieser Link zu einer 404-Seite?"
* **KI-Kosten:** Niedrig (1 LLM-Aufruf pro Aktion).
* **Ergebnis:** Ein visuelles Logbuch (Klickpfad + Screenshots).

### Paket 2: "Plus" (Moderierte Simulation + Generisches Wissen)

* **Das Produkt:** Ein "intelligenter" Agent, der von einem KI-Researcher überwacht wird und auf generisches UX-Wissen zugreift.
* **Module:** `Pilot` (Modul 3) + `Researcher (MVP)` (Modul 2) + `Gott (MVP)` (Modul 1)
* **Funktion:**
    1.  **"Gott (MVP)":** Erstellt "live" eine `n=1` Persona basierend auf einfachen Inputs (z.B. "pragmatisch" vs. "stöberlaune").
    2.  **"Pilot":** Führt den Test mit dieser Persona aus.
    3.  **"Researcher (MVP)":** Greift ein, wenn der Pilot "betrunken" ist (z.B. in einer Schleife festhängt).
    4.  **RAG (Wissens-Integration):** Der Researcher füttert den Piloten mit "Spickzetteln" aus einer generischen Wissensdatenbank (z.B. Baymard, NN Group), um die Entscheidungen realistischer zu machen (z.B. "Hinweis: Pragmatische Nutzer verwenden die Suche").
* **Wert:** **Qualitative Heuristik-Prüfung.**
    * *Antwortet auf:* "Warum ist dieser Flow verwirrend?"
    * *Antwortet auf:* "Verstößt unser Design gegen gängige UX-Best-Practices?"
* **KI-Kosten:** Hoch (2-3 LLM-Aufrufe pro Aktion: Pilot-Denken + Researcher-Prüfung).
* **Ergebnis:** Ein moderiertes Logbuch mit Rationale und Interventionen.

### Paket 3: "Premium" (Data-Driven "Gott-Modus")

* **Das Produkt:** Eine Simulation, die auf einem "digitalen Zwilling" echter Kundensegmente basiert.
* **Module:** `Pilot` (Modul 3) + `Researcher (Full)` (Modul 2) + `Gott (Full)` (Modul 1)
* **Funktion:**
    1.  **"Gott (Full)":** Dieses Modul ist jetzt an unsere internen Daten angebunden (z.B. **Adobe Analytics**, echte UX-Befragungen). Es erstellt nicht-zufällige Personas, die reale Segmente abbilden (z.B. "Erstellt eine Persona, die das 35%-Segment repräsentiert, das bei uns immer die Suche nutzt").
    2.  **"Researcher (Full)":** Nutzt die Datenanbindung für tiefere Analysen.
    3.  **"Pilot":** Führt den Test aus.
* **Wert:** **Predictive UX Analytics.**
    * *Antwortet auf:* "Wie wird unser 35%-Such-Segment auf das neue Design reagieren?"
    * *Antwortet auf:* "Wie verhält sich ein 'Nicht-Kunde' (Zielgruppe) auf unserer Seite im Vergleich zu einem 'Bestandskunden'?"
* **KI-Kosten:** Sehr hoch.
* **Ergebnis:** Ein datengesteuerter Simulationsbericht, der Hypothesen validiert und Neukunden-Strategien testet.

## 3. Die Technischen Kern-Module (Die "Engine")

Diese Module ermöglichen die oben genannten Pakete:

### Modul 1: "Der Gott-Modus" (Persona-Fabrik)
* **Funktion:** Erstellt die System-Prompts, die das "Wesen" eines Agenten definieren.
* **`v1 (Paket 2)`:** Generiert Personas "on-the-fly" basierend auf UI-Inputs (z.B. "pragmatisch").
* **`v2 (Paket 3)`:** Generiert Personas basierend auf echten, angebundenen Analytics-Daten.

### Modul 2: "Der UX Researcher" (Moderator & RAG)
* **Funktion:** Das taktische Gehirn. Plant, moderiert und wertet aus.
* **`v1 (Paket 2)`:** Implementiert Schleifenerkennung und RAG (Retrieval-Augmented Generation) mit *generischem* Wissen (Baymard, NN Group).
* **`v2 (Paket 3)`:** Führt RAG mit *internem* Wissen durch (A/B-Test-Ergebnisse, Analytics-Fakten).

### Modul 3: "Der Pilot" (Autonomer Agent)
* **Funktion:** Die "Hände und Augen". Führt die Simulation aus.
* **Technologie:** `Playwright` (für Web) / `Appium` (für Mobile-Apps).
* **Kern-Schleife:** `SEHEN` (Screenshot) -> `DENKEN` (Ollama/KI-Aufruf) -> `HANDELN` (Click, Type, Hover).
* **Output:** Das visuelle Debug-Zip (Logs + Screenshots).

## 4. Technologie- & Design-Prinzipien

* **Design-Philosophie:** "Editorial Look". Hochwertig, minimalistisch, professionell (Inspiration: DeepL, Dropbox).
* **Technologie (MVP):** `Next.js` (Frontend), `Playwright` (Browser), `Ollama` (kostengünstige lokale KI).
* **Kern-Prinzip:** Visuelle Transparenz. Das visuelle Logbuch ist der wertvollste Output.
* **Architektur:** Entwicklung von einem "MVP-Monolithen" (aktueller Zustand) hin zu einer sauberen Trennung in `lib/`-Services (Persona-Generator, Agent-Pilot, Orchestrator).
