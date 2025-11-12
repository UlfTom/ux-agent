// app/_lib/simulation/types.ts
// FIX: Add scrollCount to SessionState

export type LogStep = {
    step: string;
    logs: string[];
    image?: string;
    timestamp?: number;
    plan?: string;
    observation?: string;
    verification?: any;
    reflection?: string;
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

    // CRITICAL FIX: Add scroll tracking
    scrollCount?: number;
    consecutiveScrolls?: number;
};

export type Language = 'de' | 'en';

export type PersonaType =
    | 'Pragmatisch & Zielorientiert'
    | 'Explorativ & Neugierig'
    | 'Vorsichtig & Skeptisch';