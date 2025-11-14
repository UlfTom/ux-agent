# Product Backlog - UX Simulation Plattform

## Epic 1: Kern Simulation Engine
**Status:** In Bearbeitung (v0.2)

### High Priority Stories
- [x] 1.1 ReAct Pattern Implementierung (ERLEDIGT)
  - 5-Phasen Loop: Planen → Beobachten → Verifizieren → Handeln → Reflektieren
  - Self-Correction durch Reflexion
  - Confidence-basierte Fallbacks
  
- [ ] 1.2 Persona-getriebenes Verhalten
  - Pragmatisch: Direkte Suchnutzung, effizienzfokussiert
  - Explorativ: Browse-First Ansatz, Scroll-Toleranz
  - Vorsichtig: Verifikationsschritte, Zögern modellieren
  - Erinnerung an UI-Elemente (z.B. "Suche ist oben")
  
- [x] 1.3 Element-Erkennung Verbesserungen (IN ARBEIT)
  - Priorisierung von Suchfeldern und primären CTAs
  - Erhöhung des Erkennungslimits (80 → 120 Elemente)
  - Bessere Rollen-Erkennung für Inputs
  - Kontext-bewusstes Element-Scoring (SRP vs. Homepage)
  
- [ ] 1.4 Sprach-Konsistenz
  - Backend Language-Parameter Integration
  - Einheitliche Prompts in gewählter Sprache
  - Konsistente Persona-Generierung

---

## Epic 2: Erweiterte Analyse
**Status:** Geplant (v0.4)

### High Priority Stories
- [ ] 2.1 Domain-spezifische Insights
  - E-Commerce: Checkout-Flow Reibungspunkte
  - SaaS: Onboarding-Completion
  - Media: Content-Discoverability
  
- [ ] 2.2 A/B Vergleichs-Modus
  - Side-by-Side Test-Ausführung
  - Diff-Visualisierung
  - Performance-Metriken Vergleich
  
- [ ] 2.3 Heatmap-Generierung
  - Aufmerksamkeitsbereiche (Llava Focus)
  - Klick-Muster
  - Scroll-Tiefe
  - Frustrations-Indikatoren

---

## Epic 3: Accessibility Testing
**Status:** Geplant (v0.5)

### Konzept
Simulation menschlicher Einschränkungen um Barrieren zu finden, bevor echte Nutzer sie erleben.

### High Priority Stories
- [ ] 3.1 Tastatur-Only Navigation
  - **Szenario:** Motorische Einschränkung, Power-User, Assistive Tech
  - Tab-Navigation Simulation
  - Focus-Indikator Sichtbarkeits-Checks
  - Skip-Link Erkennung
  - Keyboard-Trap Erkennung
  - **Report:** Tab-Order Issues, fehlende Focus-States
  
- [ ] 3.2 Visuelle Einschränkungen
  - **Sehschwäche:**
    - Blur-Simulation, Kontrast-Reduktion
    - Test mit 200%/400% Zoom
    - Text-Reflow, Layout-Breaks prüfen
  - **Farbenblindheit:**
    - Deuteranopie (Rot-Grün, 8% der Männer)
    - Protanopie (Rot-Grün)
    - Tritanopie (Blau-Gelb)
    - Informationen nicht nur durch Farbe vermittelt?
  - **Report:** Kontrast-Verhältnisse, farb-abhängige Elemente
  
- [ ] 3.3 Screen Reader Simulation
  - Accessibility-Tree parsen
  - NVDA/JAWS Verhalten simulieren
  - Fehlende Alt-Texte erkennen
  - Semantisches HTML validieren
  - ARIA-Label Checks
  - Überschriften-Hierarchie validieren
  - **Report:** Screen Reader UX Flow
  
- [ ] 3.4 Kognitive Last Assessment
  - Komplexe Navigations-Muster
  - Überwältigende Informations-Dichte
  - Unklare Labels/Instruktionen
  - Inkonsistente UI-Patterns
  - **Report:** Vereinfachungs-Vorschläge

### Medium Priority Stories  
- [ ] 3.5 Motorische Einschränkungen
  - Große Touch-Target Anforderungen (44×44px)
  - Tremor-Simulation (ungenaue Klicks)
  - Einhändige Nutzungs-Muster
  
- [ ] 3.6 WCAG Compliance Validierung
  - Auto-Check gegen WCAG 2.1 AA/AAA
  - Compliance-Report generieren
  - Priorisierte Fix-Empfehlungen

---

## Epic 4: Kollaboration & Reporting
**Status:** Geplant (v0.6)

### High Priority Stories
- [ ] 4.1 Team-Workspace
  - Simulationen teilen
  - Kommentare zu Schritten
  - Issues an Team-Mitglieder zuweisen
  
- [ ] 4.2 Integration Pipeline
  - GitHub Actions Integration
  - Slack-Benachrichtigungen
  - Jira-Ticket Erstellung
  
- [ ] 4.3 Executive Reporting
  - PDF-Export mit Findings
  - Trend-Analyse über Zeit
  - ROI-Metriken (Issues gefunden vs. behoben)

---

## ⭐️ Epic 5: Advanced Agent Swarm & Analytics (NEU)
**Status:** Geplant (v0.8)

### Konzept
Führt die Ideen deines Freundes aus. Skaliert die Simulation von n=1 auf n=X, um statistisch relevante UX-Metriken und "Intuitivität" zu messen.

### High Priority Stories
- [ ] 5.1 Multi-Agent Simulation (Swarm)
  - Parallele Ausführung von 10, 50, 100 Agenten mit derselben Persona und Aufgabe.
  - Aggregation aller Klick-Pfade.
  
- [ ] 5.2 "Golden Path" Analyse
  - Identifiziert den am häufigsten (z.B. >80%) genutzten Pfad als "Golden Path".
  - Definiert "Intuitivität" als %-Anteil der Agenten auf dem Golden Path.
  
- [ ] 5.3 Abweichungs-Analyse (Deviation Analysis)
  - Analysiert Agenten, die vom Golden Path abweichen.
  - Identifiziert "Rage-Clicks", Schleifen oder Verlassen der Seite als UX-Hotspots.
  - Vergleicht Pfade (z.B. "Normaler Agent" vs. "Agent mit Farbenblindheit") wie von deinem Freund vorgeschlagen.
  
- [ ] 5.4 Confidence-Metrik
  - Misst "Confidence" nicht durch LLM-Scores, sondern durch "Fallback-Nutzung".
  - Metrik: (Anzahl der `scroll`-Fallbacks) / (Anzahl der Schritte).
  - Hohe Fallback-Rate = "Agent konnte X nur schwer finden".

---

## Technische Schulden
- [ ] ReAct Loop Performance optimieren (aktuell ~4s pro Schritt)
- [ ] Besseres Error Handling für Vision Model Failures
- [ ] Rate Limiting für Ollama API
- [ ] Caching für wiederholte Simulationen

---

## Bugs
- [x] Sprach-Inkonsistenz (DE ↔ EN) - Behoben in v0.2
- [x] Suchfeld-Erkennung (nur 4-5 Elemente gefunden) - Behoben in v0.3
- [ ] Vision Blind Spots für kleine UI-Elemente
- [x] "Sensorischer Konflikt" (Vision vs. Code) - Behoben in v0.3
- [x] "STOPP"-Halluzination (LLM ignoriert Regeln) - Behoben in v0.3