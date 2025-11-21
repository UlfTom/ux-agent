// app/_lib/simulation/constants.ts

export type Option = {
    id: string;
    name: string;
    url?: string; // Optional, falls für Domains genutzt
};

export const domainOptions: Option[] = [
    { id: 'zalando', name: 'Zalando', url: 'https://www.zalando.de' },
    { id: 'otto', name: 'OTTO', url: 'https://www.otto.de' },
    { id: 'amazon', name: 'Amazon', url: 'https://www.amazon.de' },
    { id: 'mediamarkt', name: 'MediaMarkt', url: 'https://www.mediamarkt.de' },
    { id: 'custom', name: 'Eigene URL eingeben...', url: '' },
];

export const personaTypeOptions: Option[] = [
    { id: 'pragmatic', name: '🎯 Pragmatisch & Zielorientiert' },
    { id: 'explorative', name: '🔍 Neugierig & Stöbernd' },
    { id: 'unsure', name: '🤔 Unsicher & Vorsichtig' },
];

// ⭐️ NEU: Accessibility Profile
export const simulationModeOptions: Option[] = [
    { id: 'default', name: 'Standard (Keine Einschränkungen)' },
    { id: 'visual_blur', name: '👁️ Sehschwäche (Verschwommen)' },
    { id: 'visual_protanopia', name: '🎨 Farbenblind (Rot-Grün)' },
    { id: 'motor_keyboard', name: '⌨️ Motorisch (Nur Tastatur)' },
    { id: 'cognitive_distracted', name: '🤯 Kognitiv (Leicht ablenkbar)' },
    { id: 'elderly_user', name: '👴 Senior (Kombination)' },
];