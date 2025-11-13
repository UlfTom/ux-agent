// app/simulation/constants.ts

// Ein einfacher Typ für unsere Optionen
export type Option = {
    id: string;
    name: string;
};

export const personaTypeOptions: Option[] = [
    { id: 'Pragmatisch & Zielorientiert', name: 'Pragmatisch & Zielorientiert' },
    { id: 'Explorativ & Neugierig', name: 'Explorativ & Neugierig' },
    { id: 'Vorsichtig & Skeptisch', name: 'Vorsichtig & Skeptisch' },
];

export const domainOptions: Option[] = [
    { id: 'E-Commerce', name: 'E-Commerce' },
    { id: 'Travel & Booking', name: 'Travel & Booking' },
    { id: 'Finance', name: 'Finance' },
    { id: 'SaaS Platform', name: 'SaaS Platform' },
    { id: 'News & Media', name: 'News & Media' },
    { id: 'Job Portal', name: 'Job Portal' },
    { id: 'General Website', name: 'General Website' },
];