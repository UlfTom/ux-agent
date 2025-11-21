// app/_lib/simulation/persona.ts
// UPGRADED VERSION with structured template

import { Language, PersonaType } from './types';
import { callLLM } from './utils';

export async function generatePersona(
   task: string,
   domain: string,
   personaType: PersonaType,
   language: Language = 'de'
): Promise<string> {
   const promptDE = `Du bist ein Senior UX Researcher. Erstelle eine **realistische, strukturierte Persona** für einen Usability-Test.

**Kontext:**
- Domain: "${domain}"
- Persona-Typ: "${personaType}"
- Aufgabe: "${task}"

**WICHTIG: Folge EXAKT diesem Template-Format:**

─────────────────────────────────────────────
👤 PERSONA
─────────────────────────────────────────────

📋 SEKTION 1: Das Wichtigste auf einen Blick
─────────────────────────────────────────────
Name: [Realistischer deutscher Name]
Archetyp: [z.B. "Der Effiziente Pragmatiker", "Die Gründliche Analytikerin", "Der Inspirierte Shopper"]
Zitat:
"[Ein Satz der die Einstellung widerspiegelt, z.B. 'Ich habe keine Zeit zu verschwenden, ich will nur schnell X erledigen' oder 'Ich liebe es, neue Dinge zu entdecken']"

─────────────────────────────────────────────
🧑 SEKTION 2: Wer ist [Name]? (Demografie & Psychografie)
─────────────────────────────────────────────
Alter: [Alter]
Beruf: [Beruf/Tätigkeit]
Lebens- & Familiensituation: [z.B. "Single, lebt in der Stadt" oder "Verheiratet, 2 Kinder, Haus im Vorort"]
Persönlichkeit & Profil:
- [Was definiert diese Person? 2-3 prägnante Eigenschaften]
- [Was ist ihr wichtig? z.B. "Sicherheitsbewusst", "Nachhaltig orientiert", "Immer gestresst"]
Technologie-Affinität:
- [Wie digital ist die Person? z.B. "Digital Native" oder "Nutzt nur das Nötigste"]
Bevorzugte Kanäle & Marken:
- [Wo informiert sie sich? z.B. "Vertraut Stiftung Warentest", "Nur auf Instagram", "Amazon Prime-Kunde"]

─────────────────────────────────────────────
💻 SEKTION 3: Online-Verhaltensprofil (Die 5 Dimensionen)
─────────────────────────────────────────────

1️⃣ Zielorientierung: [NIEDRIG | MITTEL | HOCH]
   └─ Beschreibung: [Wie fokussiert ist die Person auf eine spezifische Aufgabe?]

2️⃣ Entdeckergeist: [NIEDRIG | MITTEL | HOCH]
   └─ Beschreibung: [Wie offen für Ablenkung, Inspiration und neue Vorschläge?]

3️⃣ Informations-Tiefe: [NIEDRIG | MITTEL | HOCH]
   └─ Beschreibung: [Wie viele Details, Vergleiche und Bewertungen vor einer Entscheidung?]

4️⃣ Entscheidungs-Grundlage: [SOZIAL | HYBRID | AUTONOM]
   └─ Beschreibung: [Verlässt sich auf andere (Bewertungen) oder eigene Kriterien (Fakten)?]

5️⃣ Sensibilität (Preis & Aufwand): [NIEDRIG | MITTEL | HOCH]
   └─ Beschreibung: [Wie stark reagiert auf Preis, Rabatte und Komplexität?]

─────────────────────────────────────────────
🎯 SEKTION 4: Kontext & Beziehung zu ${domain}
─────────────────────────────────────────────

Typische Ziele / Jobs-to-be-Done:
1. [Primäres Ziel für diese Website, max. 1 Satz]
2. [Sekundäres Ziel, falls relevant]

Typische Frustrationspunkte:
• [Was hasst diese Person online? z.B. "Aufdringliche Pop-ups"]
• [Weiterer Pain Point, z.B. "Lange Ladezeiten auf dem Handy"]

Der typische Nutzungskontext:
• Gerät(e): [z.B. "Primär Smartphone, für Käufe am Desktop"]
• Situation: [z.B. "Gestresst in der U-Bahn" oder "Abends entspannt auf dem Sofa"]

─────────────────────────────────────────────

**WICHTIGE MAPPING-REGELN für Persona-Typen:**

Wenn Persona-Typ "Pragmatisch" enthält:
- Zielorientierung: HOCH
- Entdeckergeist: NIEDRIG
- Informations-Tiefe: NIEDRIG bis MITTEL
- Entscheidungs-Grundlage: AUTONOM oder HYBRID
- Archetyp sollte "Effizient" oder "Pragmatisch" enthalten

Wenn Persona-Typ "Explorativ" enthält:
- Zielorientierung: NIEDRIG bis MITTEL
- Entdeckergeist: HOCH
- Informations-Tiefe: MITTEL bis HOCH
- Entscheidungs-Grundlage: SOZIAL oder HYBRID
- Archetyp sollte "Entdecker" oder "Inspiriert" enthalten

Wenn Persona-Typ "Vorsichtig" enthält:
- Zielorientierung: MITTEL bis HOCH
- Entdeckergeist: NIEDRIG
- Informations-Tiefe: HOCH
- Entscheidungs-Grundlage: SOZIAL (verlässt sich auf Bewertungen)
- Archetyp sollte "Analytisch" oder "Gründlich" enthalten

Antworte NUR mit dem formatierten Persona-Text. Keine zusätzlichen Kommentare.`;

   const promptEN = `You are a Senior UX Researcher. Create a **realistic, structured persona** for a usability test.

**Context:**
- Domain: "${domain}"
- Persona Type: "${personaType}"
- Task: "${task}"

**IMPORTANT: Follow this EXACT template format:**

─────────────────────────────────────────────
👤 PERSONA
─────────────────────────────────────────────

📋 SECTION 1: Key Information at a Glance
─────────────────────────────────────────────
Name: [Realistic English name]
Archetype: [e.g., "The Efficient Pragmatist", "The Thorough Analyst", "The Inspired Shopper"]
Quote:
"[One sentence reflecting their attitude, e.g., 'I have no time to waste, I just want to quickly do X' or 'I love discovering new things']"

─────────────────────────────────────────────
🧑 SECTION 2: Who is [Name]? (Demographics & Psychographics)
─────────────────────────────────────────────
Age: [Age]
Occupation: [Job/Activity]
Life & Family Situation: [e.g., "Single, lives in the city" or "Married, 2 kids, house in suburbs"]
Personality & Profile:
- [What defines this person? 2-3 key traits]
- [What matters to them? e.g., "Security-conscious", "Sustainability-oriented", "Always stressed"]
Technology Affinity:
- [How digital are they? e.g., "Digital Native" or "Uses only what's necessary"]
Preferred Channels & Brands:
- [Where do they get information? e.g., "Trusts Consumer Reports", "Only on Instagram", "Amazon Prime customer"]

─────────────────────────────────────────────
💻 SECTION 3: Online Behavior Profile (The 5 Dimensions)
─────────────────────────────────────────────

1️⃣ Goal-Orientation: [LOW | MEDIUM | HIGH]
   └─ Description: [How focused is the person on a specific task?]

2️⃣ Explorer Spirit: [LOW | MEDIUM | HIGH]
   └─ Description: [How open to distraction, inspiration, and new suggestions?]

3️⃣ Information Depth: [LOW | MEDIUM | HIGH]
   └─ Description: [How many details, comparisons, and reviews before a decision?]

4️⃣ Decision Basis: [SOCIAL | HYBRID | AUTONOMOUS]
   └─ Description: [Relies on others (reviews) or own criteria (facts)?]

5️⃣ Sensitivity (Price & Effort): [LOW | MEDIUM | HIGH]
   └─ Description: [How strongly reacts to price, discounts, and complexity?]

─────────────────────────────────────────────
🎯 SECTION 4: Context & Relationship to ${domain}
─────────────────────────────────────────────

Typical Goals / Jobs-to-be-Done:
1. [Primary goal for this website, max 1 sentence]
2. [Secondary goal, if relevant]

Typical Frustration Points:
• [What does this person hate online? e.g., "Intrusive pop-ups"]
• [Another pain point, e.g., "Long load times on mobile"]

Typical Usage Context:
• Device(s): [e.g., "Primarily smartphone, desktop for purchases"]
• Situation: [e.g., "Stressed on subway" or "Relaxed on sofa in the evening"]

─────────────────────────────────────────────

**IMPORTANT MAPPING RULES for Persona Types:**

If Persona Type contains "Pragmatic":
- Goal-Orientation: HIGH
- Explorer Spirit: LOW
- Information Depth: LOW to MEDIUM
- Decision Basis: AUTONOMOUS or HYBRID
- Archetype should contain "Efficient" or "Pragmatic"

If Persona Type contains "Exploratory":
- Goal-Orientation: LOW to MEDIUM
- Explorer Spirit: HIGH
- Information Depth: MEDIUM to HIGH
- Decision Basis: SOCIAL or HYBRID
- Archetype should contain "Explorer" or "Inspired"

If Persona Type contains "Cautious":
- Goal-Orientation: MEDIUM to HIGH
- Explorer Spirit: LOW
- Information Depth: HIGH
- Decision Basis: SOCIAL (relies on reviews)
- Archetype should contain "Analytical" or "Thorough"

Answer ONLY with the formatted persona text. No additional comments.`;

   const prompt = language === 'de' ? promptDE : promptEN;

   console.log('[PERSONA] Generating structured persona...');

   try {
      const result = await callLLM('mistral:latest', prompt);

      console.log('[PERSONA] Generated successfully');
      return result;
   } catch (e: any) {
      console.error('[PERSONA] Generation failed:', e);

      // Better fallback with structured format
      return language === 'de'
         ? `─────────────────────────────────────────────
👤 PERSONA
─────────────────────────────────────────────

📋 SEKTION 1: Das Wichtigste auf einen Blick
─────────────────────────────────────────────
Name: Max Mustermann
Archetyp: Der Pragmatische Nutzer
Zitat:
"Ich möchte die Aufgabe '${task}' schnell und unkompliziert erledigen."

─────────────────────────────────────────────
🧑 SEKTION 2: Wer ist Max? (Demografie & Psychografie)
─────────────────────────────────────────────
Alter: 35
Beruf: Büroangestellter
Lebens- & Familiensituation: Single, lebt in der Stadt
Persönlichkeit & Profil:
- Pragmatisch und effizient
- Mittlere technische Kenntnisse
Technologie-Affinität:
- Nutzt digitale Tools für alltägliche Aufgaben
Bevorzugte Kanäle & Marken:
- Vertraut bekannten Marken und Bewertungen

─────────────────────────────────────────────
💻 SEKTION 3: Online-Verhaltensprofil (Die 5 Dimensionen)
─────────────────────────────────────────────

1️⃣ Zielorientierung: MITTEL
   └─ Beschreibung: Fokussiert auf die Aufgabe, lässt sich aber gelegentlich ablenken

2️⃣ Entdeckergeist: NIEDRIG
   └─ Beschreibung: Bevorzugt direkte Wege zum Ziel

3️⃣ Informations-Tiefe: MITTEL
   └─ Beschreibung: Liest die wichtigsten Informationen

4️⃣ Entscheidungs-Grundlage: HYBRID
   └─ Beschreibung: Kombiniert eigene Kriterien mit Bewertungen

5️⃣ Sensibilität (Preis & Aufwand): MITTEL
   └─ Beschreibung: Achtet auf gutes Preis-Leistungs-Verhältnis

─────────────────────────────────────────────
🎯 SEKTION 4: Kontext & Beziehung zu ${domain}
─────────────────────────────────────────────

Typische Ziele / Jobs-to-be-Done:
1. Aufgabe "${task}" effizient erledigen

Typische Frustrationspunkte:
• Zu viele Pop-ups und Ablenkungen
• Langsame Ladezeiten

Der typische Nutzungskontext:
• Gerät(e): Desktop und Smartphone
• Situation: Zwischendurch am Arbeitsplatz oder abends zuhause

─────────────────────────────────────────────`
         : `─────────────────────────────────────────────
👤 PERSONA
─────────────────────────────────────────────

📋 SECTION 1: Key Information at a Glance
─────────────────────────────────────────────
Name: John Doe
Archetype: The Pragmatic User
Quote:
"I want to complete the task '${task}' quickly and easily."

─────────────────────────────────────────────
🧑 SECTION 2: Who is John? (Demographics & Psychographics)
─────────────────────────────────────────────
Age: 35
Occupation: Office Worker
Life & Family Situation: Single, lives in the city
Personality & Profile:
- Pragmatic and efficient
- Medium technical skills
Technology Affinity:
- Uses digital tools for everyday tasks
Preferred Channels & Brands:
- Trusts known brands and reviews

─────────────────────────────────────────────
💻 SECTION 3: Online Behavior Profile (The 5 Dimensions)
─────────────────────────────────────────────

1️⃣ Goal-Orientation: MEDIUM
   └─ Description: Focused on the task, but occasionally distracted

2️⃣ Explorer Spirit: LOW
   └─ Description: Prefers direct paths to the goal

3️⃣ Information Depth: MEDIUM
   └─ Description: Reads the most important information

4️⃣ Decision Basis: HYBRID
   └─ Description: Combines own criteria with reviews

5️⃣ Sensitivity (Price & Effort): MEDIUM
   └─ Description: Looks for good value for money

─────────────────────────────────────────────
🎯 SECTION 4: Context & Relationship to ${domain}
─────────────────────────────────────────────

Typical Goals / Jobs-to-be-Done:
1. Complete task "${task}" efficiently

Typical Frustration Points:
• Too many pop-ups and distractions
• Slow loading times

Typical Usage Context:
• Device(s): Desktop and smartphone
• Situation: During work breaks or at home in the evening

─────────────────────────────────────────────`;
   }
}