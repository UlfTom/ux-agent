// app/_components/landing/HowItWorksSection.tsx
"use client";

import { motion, useScroll, useTransform, useAnimationFrame } from 'framer-motion';
import { Eye, Brain, MousePointerClick, Sparkles, Zap } from "lucide-react";
import { useRef, useState, useEffect } from 'react';


const steps = [
    {
        icon: Eye,
        number: "01",
        title: "Sehen",
        subtitle: "Computer Vision trifft UX",
        description: "Unsere KI scannt Ihre Website Pixel für Pixel. Jeder Button, jedes Formular, jede Microinteraction wird erfasst.",
        benefits: [
            "Screenshot-basierte Analyse",
            "Element-Erkennung in Echtzeit",
            "Accessibility-Checks inklusive"
        ],
        color: "from-blue-500 to-cyan-500",
        bgGradient: "from-blue-500/10 via-cyan-500/5 to-background",
        visualType: "scan" as const
    },
    {
        icon: Brain,
        number: "02",
        title: "Denken",
        subtitle: "Personas, die sich echt anfühlen",
        description: "Nicht irgendwelche Random-Clicks. Unsere Agenten haben Persönlichkeiten, Ziele und Frustrationstoleranz.",
        benefits: [
            "10+ realistische Persona-Typen",
            "Kontextbasierte Entscheidungen",
            "Frustrations-Simulation"
        ],
        color: "from-purple-500 to-pink-500",
        bgGradient: "from-purple-500/10 via-pink-500/5 to-background",
        visualType: "neural" as const
    },
    {
        icon: MousePointerClick,
        number: "03",
        title: "Handeln",
        subtitle: "Jeder Klick wird dokumentiert",
        description: "Die KI navigiert Ihre Website wie ein echter Nutzer. Fehler werden gefunden, verwirrende Flows aufgedeckt.",
        benefits: [
            "Vollständige Journey-Aufzeichnung",
            "Problem-Priorisierung",
            "Actionable Recommendations"
        ],
        color: "from-green-500 to-emerald-500",
        bgGradient: "from-emerald-500/10 via-green-500/5 to-background",
        visualType: "interactions" as const
    }
];

// ===== VISUAL COMPONENTS =====

function ScanVisual() {
    const [scanProgress, setScanProgress] = useState(0);

    useAnimationFrame((t) => {
        setScanProgress((t / 3000) % 1);
    });

    const formattedProgress = Math.round(scanProgress * 100).toString().padStart(2, '0');

    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Pixelated Background */}
            <div className="absolute inset-0 opacity-30">
                <div className="grid grid-cols-16 grid-rows-12 h-full w-full gap-2 p-8">
                    {[...Array(192)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="bg-blue-500/20 rounded-sm"
                            animate={{
                                opacity: [0.2, 0.5, 0.2],
                                scale: [1, 1.1, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: (i * 0.01) % 2,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Scanning Line with Gradient Blur */}
            <motion.div
                className="absolute inset-x-0 h-40"
                style={{
                    top: `${scanProgress * 100}%`,
                    transform: 'translateY(-50%)',
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/40 to-transparent blur-2xl" />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_30px_rgba(59,130,246,1)]" />

                {/* Detection Markers */}
                {[0.15, 0.35, 0.55, 0.75, 0.85].map((x, i) => (
                    <motion.div
                        key={i}
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 rounded-full bg-blue-500/30"
                        style={{ left: `${x * 100}%` }}
                        animate={{
                            scale: [1, 1.8, 1],
                            opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                        }}
                    />
                ))}
            </motion.div>

            {/* Progress Indicator */}
            <div className="absolute bottom-8 right-8 font-mono text-lg text-blue-400 bg-background/90 backdrop-blur-md px-6 py-3 rounded-full border-2 border-blue-500/50 shadow-lg">
                Scanning: {formattedProgress}%
            </div>
        </div>
    );
}

function NeuralVisual() {
    const nodes = [
        { x: 10, y: 20 }, { x: 10, y: 40 }, { x: 10, y: 60 }, { x: 10, y: 80 },
        { x: 35, y: 15 }, { x: 35, y: 35 }, { x: 35, y: 55 }, { x: 35, y: 75 }, { x: 35, y: 95 },
        { x: 65, y: 20 }, { x: 65, y: 45 }, { x: 65, y: 70 },
        { x: 90, y: 35 }, { x: 90, y: 65 },
    ];

    const connections = [
        [0, 4], [0, 5], [1, 5], [1, 6], [2, 6], [2, 7], [3, 7], [3, 8],
        [4, 9], [5, 9], [5, 10], [6, 10], [7, 10], [7, 11], [8, 11],
        [9, 12], [10, 12], [10, 13], [11, 13],
    ];

    return (
        <div className="absolute inset-0 flex items-center justify-center p-16">
            <svg className="w-full h-full max-w-5xl" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {/* Connection Lines */}
                {connections.map(([start, end], i) => (
                    <motion.line
                        key={i}
                        x1={nodes[start].x}
                        y1={nodes[start].y}
                        x2={nodes[end].x}
                        y2={nodes[end].y}
                        stroke="url(#gradient-purple)"
                        strokeWidth="0.4"
                        opacity="0.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.05,
                            ease: "linear"
                        }}
                    />
                ))}

                {/* Signal Pulses */}
                {connections.map(([start, end], i) => (
                    <motion.line
                        key={`pulse-${i}`}
                        x1={nodes[start].x}
                        y1={nodes[start].y}
                        x2={nodes[end].x}
                        y2={nodes[end].y}
                        stroke="#a855f7"
                        strokeWidth="0.8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, pathOffset: 0 }}
                        animate={{ pathLength: 0.3, pathOffset: 1 }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: "linear"
                        }}
                    />
                ))}

                {/* Nodes */}
                {nodes.map((node, i) => (
                    <motion.circle
                        key={i}
                        cx={node.x}
                        cy={node.y}
                        r="2"
                        fill="#a855f7"
                        initial={{ scale: 0 }}
                        animate={{
                            scale: [1, 1.4, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.1,
                        }}
                    />
                ))}

                <defs>
                    <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.1" />
                        <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Thinking Labels */}
            <motion.div
                className="absolute top-12 left-12 text-sm font-mono text-purple-400 space-y-2 bg-background/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-purple-500/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <div>→ Analyzing context...</div>
                <div>→ Matching persona...</div>
                <div>→ Calculating intent...</div>
            </motion.div>
        </div>
    );
}

function InteractionsVisual() {
    const interactionTypes = [
        { type: 'click', icon: '👆', label: 'Click' },
        { type: 'swipe', icon: '👉', label: 'Swipe' },
        { type: 'pinch', icon: '🤏', label: 'Pinch' },
        { type: 'scroll', icon: '📜', label: 'Scroll' },
        { type: 'type', icon: '⌨️', label: 'Type' },
    ];

    const [activeInteractions, setActiveInteractions] = useState<Array<{
        type: string;
        x: number;
        y: number;
        icon: string;
        label: string;
        id: number;
    }>>([]);

    useEffect(() => {
        let counter = 0;

        const addInteraction = () => {
            const randomType = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
            const newInteraction = {
                ...randomType,
                x: 20 + Math.random() * 60,
                y: 20 + Math.random() * 60,
                id: counter++
            };

            setActiveInteractions(prev => {
                const updated = [...prev, newInteraction];
                return updated.slice(-2); // Keep max 2 at once
            });
        };

        // Add first two interactions with small delay
        addInteraction();
        setTimeout(addInteraction, 400);

        // Then add new one every 1.8 seconds
        const interval = setInterval(addInteraction, 1800);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />

            {activeInteractions.map((interaction) => (
                <motion.div
                    key={interaction.id}
                    className="absolute"
                    style={{
                        left: `${interaction.x}%`,
                        top: `${interaction.y}%`,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                        opacity: [0, 1, 1, 0.8, 0],
                        scale: [0, 1.2, 1, 1, 0.8],
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{
                        duration: 2.2,
                        ease: "easeOut"
                    }}
                >
                    {/* Ripple Effect */}
                    <motion.div
                        className="absolute inset-0 -m-12 rounded-full border-2 border-green-500"
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{
                            scale: [1, 2.5],
                            opacity: [0.6, 0],
                        }}
                        transition={{
                            duration: 1.2,
                            ease: "easeOut"
                        }}
                    />

                    {/* Icon */}
                    <div className="relative z-10 text-4xl bg-background/90 backdrop-blur-md rounded-full w-20 h-20 flex items-center justify-center border-2 border-green-500/50 shadow-xl">
                        {interaction.icon}
                    </div>

                    {/* Label */}
                    <motion.div
                        className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-sm font-mono text-green-400 whitespace-nowrap bg-background/90 backdrop-blur-md px-4 py-2 rounded-lg border border-green-500/30"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            y: 0,
                        }}
                        transition={{
                            duration: 2.2,
                            ease: "easeOut"
                        }}
                    >
                        {interaction.label}
                    </motion.div>
                </motion.div>
            ))}
        </div>
    );
}

// ===== MAIN COMPONENT =====

export function HowItWorksSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [isInSection, setIsInSection] = useState(false);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    useEffect(() => {
        const unsubscribe = scrollYProgress.on('change', (latest) => {
            setIsInSection(latest > 0 && latest < 1);
            const stepIndex = Math.floor(latest * steps.length);
            setActiveStep(Math.min(stepIndex, steps.length - 1));
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    return (
        <section
            id="wie-es-funktioniert"
            ref={containerRef}
            className="relative"
            style={{ height: `${steps.length * 100}vh` }}
        >
            <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">

                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === activeStep;

                    const opacity = useTransform(
                        scrollYProgress,
                        [
                            (index - 0.2) / steps.length,
                            index / steps.length,
                            (index + 0.8) / steps.length,
                            (index + 1) / steps.length
                        ],
                        [0, 1, 1, 0]
                    );

                    const scale = useTransform(
                        scrollYProgress,
                        [
                            (index - 0.2) / steps.length,
                            index / steps.length,
                            (index + 1) / steps.length
                        ],
                        [0.8, 1, 1]
                    );

                    const bgOpacity = useTransform(
                        scrollYProgress,
                        [
                            (index - 0.3) / steps.length,
                            index / steps.length,
                            (index + 0.7) / steps.length,
                            (index + 1) / steps.length
                        ],
                        [0, 1, 1, 0]
                    );

                    return (
                        <motion.div
                            key={index}
                            className="absolute inset-0 w-full h-full"
                            style={{
                                opacity,
                                scale,
                                pointerEvents: isActive ? 'auto' : 'none'
                            }}
                        >
                            {/* Clean Background Gradient */}
                            <motion.div
                                className={`absolute inset-0 bg-gradient-to-br ${step.bgGradient}`}
                                style={{ opacity: bgOpacity }}
                            />

                            {/* Full-Screen Visual */}
                            <div className="absolute inset-0">
                                {step.visualType === 'scan' && <ScanVisual />}
                                {step.visualType === 'neural' && <NeuralVisual />}
                                {step.visualType === 'interactions' && <InteractionsVisual />}
                            </div>

                            {/* Content Card */}
                            <div className="absolute inset-0 flex items-center pointer-events-none px-8 lg:px-16">
                                <motion.div
                                    className="w-full max-w-[26.25rem] bg-background/70 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-10 space-y-6 pointer-events-auto"
                                    initial={{ opacity: 0, x: -60 }}
                                    animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -60 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                >
                                    {/* Badge */}
                                    <div className="inline-flex items-center gap-3">
                                        <div className={`p-3 rounded-xl bg-gradient-to-br ${step.color}`}>
                                            <Icon className="h-6 w-6 text-white" />
                                        </div>
                                        <span className="text-5xl font-headline tracking-tighter-custom text-muted-foreground/30">
                                            {step.number}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <h3 className="text-4xl font-accent tracking-tighter-custom mb-2">
                                            {step.title}
                                        </h3>
                                        <p className={`text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r ${step.color}`}>
                                            {step.subtitle}
                                        </p>
                                    </div>

                                    {/* Description */}
                                    <p className="text-base text-muted-foreground leading-relaxed">
                                        {step.description}
                                    </p>

                                    {/* Benefits */}
                                    <div className="space-y-2.5 pt-2">
                                        {step.benefits.map((benefit, i) => (
                                            <motion.div
                                                key={i}
                                                className="flex items-center gap-2.5"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                                                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                                            >
                                                <div className={`p-1.5 rounded-md bg-gradient-to-br ${step.color} flex-shrink-0`}>
                                                    <Zap className="h-3.5 w-3.5 text-white" />
                                                </div>
                                                <span className="text-sm text-foreground font-medium">{benefit}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Progress Indicator */}
                <motion.div
                    className="fixed bottom-8 right-8 flex flex-col gap-3 z-50"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{
                        opacity: isInSection ? 1 : 0,
                        x: isInSection ? 0 : 20
                    }}
                    transition={{ duration: 0.3 }}
                >
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            className={`w-2 rounded-full transition-all ${index === activeStep
                                ? 'bg-primary shadow-lg shadow-primary/50'
                                : 'bg-muted-foreground/30'
                                }`}
                            animate={{
                                scale: index === activeStep ? 1 : 0.8,
                                height: index === activeStep ? 48 : 32
                            }}
                            transition={{ duration: 0.3 }}
                        />
                    ))}
                </motion.div>

                {/* Step Counter */}
                <motion.div
                    className="fixed top-8 right-8 bg-background/90 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl font-mono text-lg z-50"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{
                        opacity: isInSection ? 1 : 0,
                        y: isInSection ? 0 : -20
                    }}
                    transition={{ duration: 0.3 }}
                >
                    <span className="text-primary font-bold">{activeStep + 1}</span>
                    <span className="text-muted-foreground"> / {steps.length}</span>
                </motion.div>

            </div>
        </section>
    );
}
