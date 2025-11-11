# Pitch: KI UX-Agent

Dieses Dokument fasst das Kern-Wertversprechen unseres KI UX-Agenten zusammen.

## Die Kurze Version (Der Elevator Pitch)

Analytics-Tools (wie Adobe) zeigen uns, *was* Nutzer tun. Qualitative UX-Tests (n=5) zeigen uns, *warum* sie es tun. Beide sind voneinander getrennt, langsam und teuer.

Unser KI UX-Agent verbindet beides: Er liefert **qualitative Einblicke (das "Warum") in quantitativer Skalierung (n=100)**.

Wir setzen autonome KI-Agenten auf eine Live-Website, geben ihnen eine Persona (z.B. "pragmatischer Sucher") und eine Aufgabe (z.B. "Finde Jeans"). Statt blind im Code zu agieren, *sehen* unsere Agenten die Seite: Wir annotieren Screenshots in Echtzeit, sodass die KI visuelle Entscheidungen trifft (z.B. "Ich sehe das Such-Icon [Box 3] und klicke es"). Das Ergebnis ist ein detailliertes, visuelles Logbuch, das jeden Klick, jeden Screenshot und jede "Gedanke" der KI zeigt.

Wir finden Usability-Probleme nicht mehr zufällig, sondern systematisch.

## Die Lange Version (Die Produkt-Story)

### 1. Das Problem: Die Lücke zwischen "Was" und "Warum"

Jedes E-Commerce-Unternehmen (wie OTTO) steht vor derselben Herausforderung:
* **Das "Was" (Quantitativ):** Wir haben Unmengen an Analytics-Daten. Wir *wissen*, dass 70% der Nutzer auf der Kategorieseite abspringen.
* **Das "Warum" (Qualitativ):** Wir *wissen nicht*, *warum* sie abspringen. Ist der Filter verwirrend? Ist der "Sale"-Banner zu aggressiv? Ist der "Weiter"-Button nicht sichtbar?

Um das "Warum" zu finden, führen wir manuelle, moderierte Usability-Tests durch. Diese sind extrem teuer, langsam (Wochen für die Rekrutierung und Auswertung) und die Stichprobengröße (n=5) ist winzig und oft nicht repräsentativ.

Wir stecken fest zwischen Daten ohne Einblicke und Einblicken ohne Daten.

### 2. Die Lösung: Der Autonome "Pilot" (Das Herzstück)

Unsere Plattform schließt diese Lücke. Wir schicken einen "KI-Piloten" (einen autonomen Agenten), der die Rolle eines echten Nutzers einnimmt.

Im Gegensatz zu anderen Test-Tools, die an "dummen" Skripten oder fehlerhafter Texterkennung (OCR) scheitern, nutzt unser Pilot einen robusten **"Bounding Box"-Ansatz**:

1.  **Wir sehen:** Wir scannen die Seite und identifizieren *nur* die sichtbaren, interaktiven Elemente (Buttons, Links, Inputs).
2.  **Wir annotieren:** Wir zeichnen rote Boxen und IDs (z.B. `[1]`, `[2]`, `[3]`) in Echtzeit auf den Screenshot.
3.  **Die KI entscheidet (Visuell):** Das KI-Gehirn (`llava`) erhält dieses annotierte Bild. Es muss kein JSON mit 300 Elementen parsen (was zu `Index 1026`-Fehlern führt). Es muss keinen Text lesen (was zu `"Einverständnis gibt"`-Fehlern führt). Es muss nur *sehen*:
    > "Meine Persona ist pragmatisch. Ich will suchen. Die Suchleiste ist in Box `[1]` und das Lupen-Icon in Box `[2]`. Ich wähle `ID: 1`."
4.  **Wir handeln (Robust):** Unser System übersetzt `ID: 1` zurück in den 100% zuverlässigen Playwright-Selektor und führt die Aktion (z.B. "Tippe...") aus.

Dieser Ansatz ist schnell, visuell und löst die Kernprobleme (Halluzinationen und OCR-Fehler), an denen andere Agenten scheitern.

### 3. Die Wertpakete (Das Geschäftsmodell)

Basierend auf dieser stabilen "Pilot"-Technologie bieten wir drei klare Wertstufen an:

**Paket 1: Basic (Unmoderierte Tests)**
* **Was es ist:** Der zuverlässige "Pilot" (Modul 3) + der "Live-Gott" (Modul 1).
* **Angebot:** Skalierbares Smoke-Testing. Führe `n=10` Agenten mit einer "live" generierten Persona aus.
* **Ergebnis:** 10 visuelle Logbücher. *Antwortet auf: "Ist der Checkout-Flow technisch kaputt?"*

**Paket 2: Plus (Moderierte Tests + RAG)**
* **Was es ist:** Wir schalten den "KI Researcher" (Modul 2) hinzu.
* **Angebot:** Der Researcher greift ein, wenn der Pilot feststeckt (Schleifen-Erkennung). Wichtiger noch: Er füttert den Piloten mit externem Wissen (RAG) (z.B. "Hinweis: Laut Baymard-Institut nutzen 90% der pragmatischen Nutzer die Suche").
* **Ergebnis:** Ein qualitativer Bericht mit KI-Zusammenfassung. *Antwortet auf: "Warum ist dieser Flow verwirrend und verstößt er gegen UX-Best-Practices?"*

**Paket 3: Premium (Data-Driven "Gott-Modus")**
* **Was es ist:** Das "Gott-Modul" (Modul 1) wird an *deine* Daten angeschlossen.
* **Angebot:** Wir erstellen "digitale Zwillinge" deiner echten Kundensegmente (basierend auf Adobe Analytics-Daten, echten Befragungen). Teste Hypothesen an "Nicht-Kunden" oder "Warenkorb-Abbrechern".
* **Ergebnis:** Predictive UX Analytics. *Antwortet auf: "Wie werden unsere 35% 'Mobile-Search'-Nutzer auf das neue Feature reagieren?"*

### 4. Nächste Schritte (MVP-Fokus)

Um diese Vision zu erreichen, fokussieren wir uns auf **100% Zuverlässigkeit im Basic-Paket**. Unser nächster Meilenstein ist es, den "Bounding Box"-Agenten (Plan G) so stabil zu machen, dass er einen 5-Schritte-Test auf `otto.de` 10 von 10 Malen erfolgreich abschließt.