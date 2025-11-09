# Projekt-Vision: KI UX-Agent

## 1. Das Leitbild (The "Why")

Unser Ziel ist es, von statischen, manuellen UX-Tests (z.B. mit PDFs oder moderierten Sessions) zu **dynamischen, skalierten und autonomen Usability-Simulationen** überzugehen.

Wir bauen ein System, das nicht nur prüft, *ob* eine Aufgabe lösbar ist, sondern *wie* und *warum* eine Persona eine bestimmte Entscheidung trifft. Wir kombinieren **qualitative Tiefe (n=1)** mit **quantitativer Skalierung (n=100)**, indem wir realistische, datengetriebene Personas "live" auf unserer echten Web-Anwendung testen.

Das Endziel ist ein "digitaler Zwilling" unseres Kundenstamms, der es uns ermöglicht, Design-Entscheidungen, A/B-Tests und Neukunden-Strategien zu validieren, bevor sie live gehen.

## 2. Die Drei Kern-Module (The "What")

Das System besteht aus drei getrennten, aber miteinander verbundenen KI-Modulen:

### Modul 1: "Der Gott-Modus" (Die Persona-Fabrik)

* **Funktion:** Die strategische Erstellung und Verwaltung von Personas.
* **MVP-Ziel (Phase 1):** Eine "Live"-Generierung einer `n=1` Persona. Das System erhält einfachen Input (z.B. Domain: "E-Commerce", Typ: "Pragmatisch", Aufgabe: "Jeans finden") und generiert daraus einen detaillierten System-Prompt für den Piloten.
* **Zukunftsvision (Phase 2):** Ein täglicher (oder nächtlicher) Batch-Prozess. "Gott" erstellt `n=100` digitale Personas, die den Status Quo der echten Kund:innen abbilden.
* **Datenanbindung (Phase 2):** Dieses Modul wird mit echten Daten trainiert/gefüttert:
    * **Quantitativ:** Adobe Analytics (Klickpfade, Demografie, Abbruchraten).
    * **Qualitativ:** Echte UX-Befragungen, Support-Tickets, Kunden-Feedback.
* **Strategisches Ziel (Phase 3):** Die Erstellung von "Was-wäre-wenn"-Personas (z.B. "Nicht-Kund:innen", "Wettbewerber-Kund:innen"), um Hypothesen für die Neukund:innen-Akquise zu testen.

### Modul 2: "Der UX Researcher" (Der Moderator)

* **Funktion:** Das "taktische Gehirn" einer *einzelnen* Simulations-Session. Er plant, moderiert und wertet den Testlauf aus.
* **Prozess (Chain of Thought):**
    1.  **Setup:** Erhält eine Persona von "Gott" (z.B. "Du bist Sabine, 42, pragmatisch...").
    2.  **Testdesign:** Verfeinert die `raw_task_input` ("Finde Jeans") in eine klare, neutrale Test-Aufgabe. Erstellt einen internen Fragenkatalog.
    3.  **Moderation (Interaktiv):** Leitet den "Piloten" (Modul 3) an. Wenn der Pilot in einer Schleife festhängt oder eine unerwartete Aktion durchführt, kann der "Researcher" eingreifen und eine qualitative Frage stellen (z.B. "Warum hast du auf 'Weihnachten' geklickt?").
    4.  **Auswertung:** Analysiert das finale Logbuch (Klickpfad, Screenshots, rationale Gedanken, Antworten auf Fragen) und erstellt einen finalen Management-Summary für diesen einen Test.

### Modul 3: "Der Pilot" (Der Autonome Agent)

* **Funktion:** Die "Hände und Augen" (operativ). Er führt die Simulation als die ihm zugewiesene Persona durch.
* **Technologie:** `Playwright` (Hände) & `Ollama (llava)` (Augen/Gehirn).
* **Kern-Schleife (Der "Loop"):**
    1.  **SEHEN:** Erfasst den aktuellen Zustand (Screenshot + DOM-Elemente).
    2.  **DENKEN:** Übergibt (Screenshot, DOM-Liste, Aufgabe, Persona-Prompt, Gedächtnis) an das LLM (`getNextAction`).
    3.  **HANDELN:** Führt die zurückgegebene Aktion (z.B. `click`, `type`, `hover`) robust mit Playwright aus.
* **Output:** Produziert das "Debug-Zip" (visuelles Logbuch mit Screenshots und Text-Logs), das als Rohmaterial für den "Researcher" dient.

## 3. Die MVP-Roadmap (The "How")

### Phase 1: Stabiler MVP (Fokus: Technik)
* **Ziel:** Die Kern-Schleife (`SEHEN` -> `DENKEN` -> `HANDELN`) zu 100% stabilisieren.
* **Aufgaben:**
    * Cookie-Banner zuverlässig erkennen und schließen.
    * "Drunk AI" (Schleifen, Halluzinationen) durch robuste Selektoren und "Gedächtnis" im Prompt verhindern.
    * "Index-Mismatch"-Fehler (DOM vs. Playwright) eliminieren.
    * Visuelles Logbuch und Zip-Download für das Debugging perfektionieren.

### Phase 2: "Researcher"-Modul (Fokus: Intelligenz)
* **Ziel:** Die Trennung von "Researcher" und "Pilot" implementieren.
* **Aufgaben:**
    * `generatePersonaPrompt`-Funktion (Modul 2) implementieren, wie vom User gewünscht (Input: "E-Commerce", "Pragmatisch").
    * Das Frontend um die (gesperrten) Eingabefelder für "Domain" und "Persona-Typ" erweitern.
    * Das Logbuch um den "Persona-Briefing"-Schritt erweitern.

### Phase 3: "Gott-Modus" (Fokus: Skalierung & Daten)
* **Ziel:** Von `n=1` zu `n=100` übergehen und echte Daten integrieren.
* **Aufgaben:**
    * Migration auf einen **VPS (Managed Server)**, der Batch-Jobs (z.B. 100 Playwright-Instanzen gleichzeitig) ausführen kann.
    * Aufbau einer **Vektor-Datenbank** (z.B. mit dem Wissen von Baymard, NN Group, Adobe Analytics-Exporten).
    * Das "Gott"-Modul (Modul 1) baut Personas nicht mehr "live", sondern holt sie aus dem Pool der datenbasierten, digital-Zwillings-Personas.

## 4. Design- & Technologie-Prinzipien

* **Design-Philosophie:** "Editorial Look". Hochwertig, minimalistisch, professionell (Inspiration: DeepL, Dropbox Brand Page). Der Fokus liegt auf "Sexappeal" durch Typografie, Whitespace und subtile Animationen.
* **Technologie (MVP):** `Next.js` (Frontend), `Playwright` (Browser-Automatisierung), `Ollama` (kostengünstige, lokale KI-Entwicklung).
* **Kern-Prinzip:** Visuelle Transparenz. Das visuelle Logbuch (Screenshots + Rationale) ist der wertvollste Output des gesamten Systems.