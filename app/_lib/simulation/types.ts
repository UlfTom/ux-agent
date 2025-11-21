// app/_lib/simulation/types.ts

export type Language = 'de' | 'en';
export type PersonaType = 'pragmatic' | 'explorative' | 'unsure';

// ⭐️ NEU: Der Typ für die Simulation-Modi
export type SimulationMode = 'default' | 'visual_blur' | 'visual_protanopia' | 'motor_keyboard' | 'cognitive_distracted' | 'elderly_user';

export type LogStep = {
    step: string;
    logs: string[];
    image?: string | null;
    timestamp?: number;
    plan?: string;
    observation?: string;
    verification?: any;
    reflection?: string;
    timings_ms?: Record<string, number>;
};

export type InteractableElement = {
    id: number;
    realIndex: number;
    role: 'link' | 'button' | 'textbox';
    box: { x: number; y: number; width: number; height: number };
    text: string;
    placeholder: string | null;
    isHoverTarget: boolean;
    priorityScore?: number;
};

export type SessionState = {
    searchText: string | null;
    searchSubmitted: boolean;
    onSearchResults: boolean;
    onProductPage: boolean;
    currentUrl: string;
    lastAction: string;
    actionHistory: Array<{
        plan: string;
        action: string;
        result: string;
        reflection: string;
    }>;
    seenSearchField: boolean;
    searchFieldPosition: 'top' | 'unknown';
    scrollCount?: number;
    consecutiveScrolls?: number;
};

export interface FrictionPoint {
    step: number;
    description: string;
    severity: 'high' | 'medium' | 'low';
}

export interface SimulationResult {
    success: boolean;
    logs: string[];
    summary: string;
    frictionPoints: FrictionPoint[];
    uxScore: number;
    duration?: number;
}