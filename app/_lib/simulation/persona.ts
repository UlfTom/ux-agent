// app/_lib/simulation/persona.ts

import { Language, PersonaType } from './types';
import { callOllama } from './utils';

export async function generatePersona(
    task: string,
    domain: string,
    personaType: PersonaType,
    language: Language = 'de'
): Promise<string> {

    const promptDE = `Du bist ein Senior UX Researcher. Erstelle eine **realistische, lebendige Persona** für einen Usability-Test.

Kontext:
- Domain: "${domain}"
- Persona-Typ: "${personaType}"
- Aufgabe: "${task}"

**Wichtig:**
1. Die Persona soll ein ECHTER MENSCH sein
2. Die Demografie soll zur Aufgabe passen
3. Schreibe in "Du"-Form
4. Gib der Persona: Name, Alter, Beruf, Lebenssituation, Motivation
5. **Verhaltensmuster:**
   - Pragmatisch: Nutzt DIREKT die Suche, effizient, ungeduldig
   - Explorativ: Scrollt ERSTMAL, schaut sich um, neugierig
   - Vorsichtig: Skeptisch, liest viel, überprüft

Beispiel-Format:
**Persona:**
Name: Sarah Müller
Alter: 34
Beruf: Marketing Managerin
Lebensstil: Ich lebe ein aktives Leben in der Stadt, habe wenig Zeit, bin technikaffin.
Demografie:
- Geschlecht: Weiblich
- Wohnort: Großstadt
- Bildung: Master
- Einkommen: Mittelschicht
- Tech-Level: Fortgeschritten
Motivation: Ich suche schnell und effizient, habe keine Zeit für langes Browsen.

Antworte NUR mit dem Persona-Text in "Du"-Form.`;

    const promptEN = `You are a Senior UX Researcher. Create a **realistic, vivid persona** for a usability test.

Context:
- Domain: "${domain}"
- Persona Type: "${personaType}"
- Task: "${task}"

**Important:**
1. The persona should be a REAL PERSON
2. Demographics should match the task
3. Write in "You" form
4. Give persona: Name, Age, Job, Life situation, Motivation
5. **Behavior patterns:**
   - Pragmatic: Uses search DIRECTLY, efficient, impatient
   - Exploratory: Scrolls FIRST, looks around, curious
   - Cautious: Skeptical, reads a lot, verifies

Example format:
**Persona:**
Name: Sarah Miller
Age: 34
Job: Marketing Manager
Lifestyle: I live an active life in the city, have little time, am tech-savvy.
Demographics:
- Gender: Female
- Location: Big city
- Education: Master's
- Income: Middle class
- Tech-Level: Advanced
Motivation: I search quickly and efficiently, don't have time for long browsing.

Answer ONLY with the persona text in "You" form.`;

    const prompt = language === 'de' ? promptDE : promptEN;

    try {
        const result = await callOllama('mistral', prompt, language);
        return result;
    } catch (e: any) {
        console.error("Persona generation failed:", e);
        return language === 'de'
            ? `Du bist ein durchschnittlicher Nutzer, der die Aufgabe "${task}" erledigen möchte.`
            : `You are an average user who wants to complete the task "${task}".`;
    }
}
