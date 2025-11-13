// app/simulation/_components/ElapsedTimer.tsx
"use client";

import { useEffect, useState } from 'react';

// Timer Component (jetzt in eigener Datei)
export function ElapsedTimer({ loading }: { loading: boolean }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!loading) {
            setElapsed(0);
            return;
        }
        const startTime = Date.now();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [loading]);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    return (
        <span className="font-mono">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
    );
}