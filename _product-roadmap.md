# UX Agent - Product Roadmap & Technical Strategy

**Datum**: 11. November 2025  
**Status**: MVP Development  
**Ziel**: 100% zuverlässige Basic-Simulation auf otto.de

---

## 🎯 Die Vision (Endgame)

### User Flow (Finale Version)

```
1. User Input
   ├─ URL: https://www.otto.de
   └─ Task: "Finde eine Winter-Jacke für junge Frauen"

2. UX RESEARCHER (Modul 2)
   ├─ Erstellt professionelle UX-Aufgabe aus Raw Input
   ├─ IF MODERIERT: Erstellt Fragenkatalog
   │  └─ "Wie fühlt sich das an?"
   │  └─ "Wie mühelos war dieser Schritt?"
   │  └─ "Was würdest du dahinter erwarten?"
   └─ Output: Strukturierte Test-Instruktion

3. GOTT (Modul 1) - Persona Factory
   ├─ Analysiert Task-Keywords ("Winter-Jacke", "junge Frauen")
   ├─ Generiert n=1 (später n=100) passende Personas
   │  └─ NICHT: "Emily, 38, Buchhalterin"
   │  └─ SONDERN: "Lisa, 24, Studentin, Fashion-bewusst"
   └─ Output: System-Prompt für Piloten

4. PILOT (Modul 3) - Ausführung
   ├─ Sieht Aufgabe: "Du suchst eine Winter-Jacke"
   ├─ Führt Test durch (MENSCHLICH simuliert)
   │  ├─ Character-by-Character Typing: "w-i-n-t-e-r-j-a-c-k-e"
   │  ├─ Enter-Key Detection (nicht nur Icon-Click)
   │  ├─ Hover-Delays (100-300ms)
   │  └─ Screenshot-Dokumentation JEDER Aktion
   └─ IF MODERIERT: Beantwortet Researcher-Fragen

5. RESEARCHER (Modul 2) - Auswertung
   ├─ IF BASIC: Nur Tabellen-Output (Steps, Actions, Time)
   ├─ IF PLUS: Detaillierte Zusammenfassung
   │  └─ "Es zeigte sich, dass 8 von 10 Personas..."
   │  └─ "Hauptproblem: Cookie-Banner blockiert Suche"
   │  └─ "Empfehlung: Banner verzögert laden"
   └─ Output: PDF Report + Visualisierung
```

---

## 🔴 Aktuelle Probleme (Technical Debt)

### Problem 1: Schlechte Persona-Generierung

**Was passiert:**
```
Task: "Finde eine Winter-Jeans für Damen"
Persona: "Emily, 38, Buchhalterin, mag Fitness"
```

**Warum falsch:**
- Kein Bezug zur Aufgabe
- Generic Template-Text
- Mistral halluziniert Details

**Lösung:**
- Task-Keyword-Extraction: "Winter-Jeans" + "Damen" → "Junge Frau, 25-35, Fashion-interessiert"
- Persona-Prompt muss Demographics + Motivation kombinieren
- Few-Shot Examples für Mistral

---

### Problem 2: Mistral bricht sofort ab

**Was passiert:**
```
Schritt 2/9: Llava sagt "Ich möchte Winter-Jeans finden"
Mistral antwortet: { "action": "finish" }
```

**Warum falsch:**
- Mistral versteht nicht, dass "Absicht" ≠ "Schon erledigt"
- Keine klare Anweisung: "finish NUR wenn Produkt-Detail-Seite erreicht"

**Lösung:**
- Explizite Success-Criteria im Prompt
- Beispiel: "finish NUR wenn du ein PRODUKT siehst (mit Preis + In den Warenkorb)"
- Schleifenerkennung: 3x gleiche ID → Researcher interveniert

---

### Problem 3: Keine Human-like Interaction

**Was passiert:**
```typescript
await locator.fill(aiAction.textToType); // Instant
```

**Warum falsch:**
- Echte Menschen tippen Buchstabe für Buchstabe
- Autocomplete-Dropdowns brauchen Zeit zum Erscheinen
- Keine Pausen zwischen Actions

**Lösung:**
```typescript
async function typeHumanLike(locator, text) {
  await locator.click(); // Focus first
  for (const char of text) {
    await locator.type(char, { delay: 50 + Math.random() * 100 }); // 50-150ms
  }
  await page.waitForTimeout(200); // Wait for autocomplete
}
```

---

### Problem 4: Enter-Key Support fehlt

**Was passiert:**
- Pilot kann nur auf Search-Icon klicken
- Echte User würden Enter drücken

**Lösung:**
```typescript
if (aiAction.action === 'type' && aiAction.submitWithEnter) {
  await locator.fill(aiAction.textToType);
  await locator.press('Enter');
}
```

- Llava muss wissen: "Nach Tippen kannst du Enter drücken ODER auf Icon [X] klicken"

---

### Problem 5: Schlechtes Logging

**Was passiert:**
```
📊 Annotiere 433 Elemente
👁️ Llava analysiert...
💭 Absicht: "Ich möchte Winter-Jeans finden"
🧠 Mistral entscheidet...
✅ Aufgabe abgeschlossen
```

**Was fehlt:**
- Welche ID wurde gewählt?
- Welcher Text stand auf dem Element?
- Warum "finish"? (Rationale fehlt!)

**Lösung:**
```
Step 2/9 - Search Interaction
────────────────────────────────
👁️ Llava's Intention:
   "Ich sehe die Suchleiste [ID 1] und tippe 'Winter-Jeans'"

🧠 Mistral's Decision:
   Action: type
   Target: ID 1 (role: textbox, text: "Wonach suchst du?")
   Text: "Winter-Jeans"
   Rationale: "Pragmatic persona uses search immediately"

⌨️ Execution:
   ✓ Typed: w-i-n-t-e-r---j-e-a-n-s (1.2s)
   ✓ Autocomplete appeared
   ✓ Pressed Enter
   ✓ Page navigated to /suche?q=winter-jeans

📸 Screenshot: [attached]
```

---

## 🎯 MVP Roadmap - Phase 1 (Nächste 2 Wochen)

### Week 1: Core Fixes

**Day 1-2: Better Persona Generation**
- [ ] Task-Keyword-Extraction implementieren
- [ ] Demographics aus Keywords ableiten
- [ ] Few-Shot Examples für Mistral
- [ ] Test: "Winter-Jacke für junge Frauen" → Lisa, 24

**Day 3-4: Human-like Typing**
- [ ] `typeHumanLike()` Funktion
- [ ] Character-by-character mit Random Delays
- [ ] Autocomplete Detection (waitForSelector)
- [ ] Enter-Key Support

**Day 5-7: Better Logging**
- [ ] Detailliertes Action-Log Format
- [ ] Rationale von Mistral anzeigen
- [ ] Execution-Details (Timing, Navigation)
- [ ] Error-Highlighting verbessern

---

### Week 2: Success Criteria & Stability

**Day 8-10: Finish-Logic Fix**
- [ ] Success Criteria explizit definieren
- [ ] "finish NUR wenn Produkt-Detail-Seite"
- [ ] Visual Cues für Mistral: "Siehst du Preis + Warenkorb?"
- [ ] Loop Detection (3x same ID → Intervention)

**Day 11-12: Icon Understanding**
- [ ] Search Icon = Search (auch ohne Text)
- [ ] Burger Menu = Menu
- [ ] Common Icon Library für Llava
- [ ] Test: Kann Pilot Lupen-Icon erkennen?

**Day 13-14: End-to-End Test**
- [ ] 10x Test auf otto.de durchführen
- [ ] Success Rate: 8+/10 = MVP Ready
- [ ] Failure-Analysis bei < 8/10
- [ ] Bug Fixes basierend auf Logs

---

## 🚀 MVP Success Criteria

**Definition of Done:**
```
Task: "Finde eine Winter-Jacke für Damen"
URL: https://www.otto.de

Success = 8 von 10 Tests erreichen:
  ✓ Cookie-Banner geklickt
  ✓ Suchleiste gefunden
  ✓ "Winter-Jacke" eingetippt (character-by-character)
  ✓ Enter gedrückt ODER Search-Icon geklickt
  ✓ Suchergebnisse geladen
  ✓ Mindestens 1 Produkt angeklickt
  ✓ Produktdetail-Seite erreicht
  ✓ "finish" mit Rationale: "Ich sehe Preis + Warenkorb"
```

---

## 📦 Modul-Übersicht (Wie sie zusammenspielen)

### Modul 1: GOTT (Persona Factory)
```typescript
// Input
task: "Finde Winter-Jacke für junge Frauen"
domain: "ecommerce"
personaType: "pragmatic"

// Output
persona: {
  demographics: "Lisa, 24, Studentin",
  motivation: "Sucht warme Jacke für Uni-Weg",
  behavior: "Nutzt Suche, filtert nach Preis",
  constraints: "Budget: 50-100€"
}
```

**v1 (Basic)**: Live-Generierung aus Task  
**v2 (Premium)**: Analytics-Daten Integration

---

### Modul 2: RESEARCHER (Moderator & Auswertung)
```typescript
// Loop Detection
if (lastThreeActions.every(a => a.id === currentAction.id)) {
  intervention = "Du klickst 3x auf dasselbe. Scrolle oder probiere etwas anderes."
}

// IF MODERIERT: Fragen stellen
if (step % 2 === 0) {
  question = "Wie mühelos war dieser Schritt? (1-10)"
  pilotAnswer = await askLlava(question, screenshot)
}

// Finale Auswertung (PLUS)
if (allStepsComplete) {
  summary = await generateSummary(allLogs)
  // "8 von 10 Personas fanden die Suche mühelos..."
}
```

**v1 (Plus)**: Loop Detection + RAG (Baymard)  
**v2 (Premium)**: Analytics-Integration + A/B-Prediction

---

### Modul 3: PILOT (Execution)
```typescript
// Core Loop
while (step < maxSteps) {
  // 1. SEHEN
  screenshot = await page.screenshot()
  elements = await getInteractableElements()
  annotatedImage = await annotateWithBoundingBoxes(screenshot, elements)
  
  // 2. DENKEN
  visualIntent = await llava.analyze(annotatedImage, persona, task)
  logicalAction = await mistral.decide(visualIntent, elements, successCriteria)
  
  // 3. HANDELN (Human-like!)
  if (logicalAction.action === 'type') {
    await typeHumanLike(locator, logicalAction.text)
    if (logicalAction.submitWithEnter) {
      await locator.press('Enter')
    }
  }
  
  // 4. DOKUMENTIEREN
  log.push({
    step: step,
    intent: visualIntent,
    decision: logicalAction,
    screenshot: annotatedImage,
    timing: elapsed
  })
}
```

---

## 💡 Nächste Features (Nach MVP)

### Phase 2: Moderierte Tests
- [ ] Researcher-Fragen einbauen
- [ ] "Warum hast du das geklickt?" nach jeder Action
- [ ] Qualitative Antworten von Llava
- [ ] PDF Report mit Quotes

### Phase 3: RAG Integration
- [ ] Baymard Knowledge Base
- [ ] NN Group Articles
- [ ] Context-aware Hints für Pilot
- [ ] "Pragmatic users prefer search" → Pilot kriegt Hint

### Phase 4: Multi-Persona (n=10)
- [ ] Parallele Ausführung
- [ ] Aggregierte Auswertung
- [ ] Heatmap-Generierung
- [ ] Comparative Analysis

### Phase 5: Premium Features
- [ ] Adobe Analytics Integration
- [ ] Data-Driven Personas
- [ ] A/B-Test Vorhersagen
- [ ] Segment-Based Testing

---

## 📊 Metrics & KPIs

### MVP Success Metrics
- **Success Rate**: 8+/10 Tests erreichen Ziel
- **Avg. Steps**: < 10 Steps pro Test
- **Avg. Duration**: < 2 Min pro Test
- **Error Rate**: < 20% (ID not found, Timeout, etc.)

### Plus Package Metrics
- **Intervention Rate**: < 30% (Researcher muss eingreifen)
- **Loop Detection**: 100% (Keine Infinite Loops)
- **Report Quality**: Manuell bewertet (1-10)

### Premium Metrics
- **Prediction Accuracy**: A/B-Test Vorhersage vs. Real Results
- **Segment Coverage**: Mindestens 3 Segmente pro Test
- **Business Impact**: Conversion-Rate-Verbesserung messbar

---

## 🔧 Technical Architecture

### Current (MVP Monolith)
```
app/api/run-simulation/route.ts
├─ generatePersonaPrompt()    // Modul 1 (Lite)
├─ getVisualIntention()        // Modul 3 (Llava)
├─ getLogicalAction()          // Modul 3 (Mistral)
├─ preFlightCookieClick()      // Helper
└─ Main POST Handler           // Orchestration
```

### Future (Modular Services)
```
lib/
├─ persona-factory/
│  ├─ generatePersona.ts       // Modul 1
│  └─ analyzeTask.ts
├─ researcher/
│  ├─ detectLoops.ts           // Modul 2
│  ├─ askQuestions.ts
│  └─ generateReport.ts
├─ pilot/
│  ├─ visualAgent.ts           // Modul 3
│  ├─ humanLikeTyping.ts
│  └─ iconRecognition.ts
└─ orchestrator/
   ├─ runSimulation.ts         // Main Entry
   └─ streamProgress.ts        // SSE
```

---

## 📝 Open Questions & Decisions Needed

### Q1: Typing Speed
- **Option A**: Fixed 50-150ms per character
- **Option B**: Persona-dependent (Pragmatic = faster, Inspirational = slower)
- **Decision**: ?

### Q2: Enter vs. Icon Click
- **Option A**: Always prefer Enter (faster)
- **Option B**: 50/50 Random (more realistic)
- **Decision**: ?

### Q3: Screenshot Frequency
- **Option A**: After EVERY action (storage heavy)
- **Option B**: Only on significant events (Search, Click Product)
- **Decision**: ?

### Q4: Success Criteria Definition
- **Option A**: User defines (Advanced Mode)
- **Option B**: Auto-detect (MVP: "Produkt-Detail-Seite erreicht")
- **Decision**: ?

---

## 🎓 Learnings & Best Practices

### Was funktioniert:
✅ Bounding Box Approach (keine OCR!)  
✅ Dual-LLM (Llava sieht, Mistral entscheidet)  
✅ SSE für Live-Progress  
✅ Visual Debug Logs (Screenshots)  

### Was nicht funktioniert:
❌ Generic Personas ohne Task-Bezug  
❌ Instant `fill()` (nicht menschlich)  
❌ "finish" ohne klare Criteria  
❌ Logs ohne Rationale  

### Nächste Experimente:
🧪 Icon-Recognition via Vision Model  
🧪 Autocomplete-Prediction  
🧪 Multi-Modal Input (Text + Voice)  
🧪 Real-Time Collaboration (Mehrere Researcher schauen zu)  

---

## 📚 References

- **Vision**: `vision.md`
- **Pitch**: `pitch.md`
- **Backlog**: `backlog.md`
- **Current Route**: `app/api/run-simulation/route.ts`
- **Frontend**: `app/simulation/page.tsx`

---

**Last Updated**: 11. November 2025  
**Next Review**: Nach MVP Week 2