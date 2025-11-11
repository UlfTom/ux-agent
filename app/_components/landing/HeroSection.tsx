// app/_components/landing/HeroSection.tsx
"use client";

import Link from 'next/link';
import { Button } from "@/app/_components/ui/button";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Rabbit, ArrowRight, Play } from "lucide-react";
import { heroContainer, heroItem } from "@/app/_lib/animations";
import { gradients } from "@/app/_lib/design-tokens";
import { useEffect, useRef } from 'react';

// ===== MOUSE-TRACKING EYES COMPONENT =====
function WatchingEyes() {
    const containerRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            mouseX.set(e.clientX - centerX);
            mouseY.set(e.clientY - centerY);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div ref={containerRef} className="flex items-center justify-center gap-2 mt-8">
            <Eye mouseX={mouseX} mouseY={mouseY} delay={0.05} />
            <Eye mouseX={mouseX} mouseY={mouseY} delay={0.05} />

        </div>
    );
}

function Eye({
    mouseX,
    mouseY,
    delay
}: {
    mouseX: any;
    mouseY: any;
    delay: number;
}) {
    // Smooth spring animations for eye movement
    const springConfig = { damping: 20, stiffness: 150, mass: 0.5 };
    const eyeX = useSpring(useTransform(mouseX, [-500, 500], [-8, 8]), springConfig);
    const eyeY = useSpring(useTransform(mouseY, [-500, 500], [-8, 8]), springConfig);

    return (
        <motion.div
            className="relative w-6 h-5 rounded-full bg-background/80 backdrop-blur-sm border-4 border-primary/20 overflow-hidden"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                delay: 1.2 + delay,
                duration: 0.5,
                type: "spring",
                stiffness: 200
            }}
        >
            {/* White of the eye */}
            <div className="absolute inset-1 bg-white rounded-full" />

            {/* Iris (colored part) */}
            <motion.div
                className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2"
                style={{ x: eyeX, y: eyeY }}
            >
                <div className={`w-full h-full rounded-full bg-black shadow-inner`} />

                {/* Pupil */}
                <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-black rounded-full">
                    {/* Reflection dot */}
                    <div className="absolute top-0.25 right-0.25 w-1 h-1 bg-white rounded-full" />
                </div>
            </motion.div>

            {/* Subtle blink animation */}
            <motion.div
                className="absolute inset-0 bg-background"
                initial={{ scaleY: 0 }}
                animate={{
                    scaleY: [0, 1, 0],
                }}
                transition={{
                    duration: 0.2,
                    repeat: Infinity,
                    repeatDelay: 3 + Math.random() * 3, // Random blink timing
                }}
                style={{ originY: 0.5 }}
            />
        </motion.div>
    );
}

export function HeroSection() {
    const prefersReducedMotion = useReducedMotion();

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

            {/* Gradient Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute -top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px]"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.5, 0.3, 0.5],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            {/* Content */}
            <motion.div
                className="container mx-auto max-w-6xl px-4 py-32 relative z-10"
                variants={heroContainer}
                initial="hidden"
                animate="visible"
            >
                <div className="text-center space-y-8">

                    {/* Badge */}
                    <motion.div variants={heroItem} className="flex justify-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                            KI-gestützte User Experience Testing
                        </div>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h1
                        variants={heroItem}
                        className="font-headline tracking-tighter-custom text-5xl sm:text-6xl md:text-7xl lg:text-8xl"
                    >
                        Ihre Website durch
                        <br />
                        {/* UPDATED: Using design token */}
                        <span className={`${gradients.brandText} font-accent tracking-tighter-custom`}>
                            Nutzeraugen
                        </span>

                        <motion.div variants={heroItem}>
                            <WatchingEyes />
                        </motion.div>
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        variants={heroItem}
                        className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
                    >
                        KI-Agenten simulieren echte Nutzer. Finden Sie UX-Probleme, bevor Ihre Kunden sie erleben.
                        <span className="text-foreground font-semibold"> Automatisch. Skalierbar. Datengetrieben.</span>
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        variants={heroItem}
                        className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4"
                    >
                        <motion.div
                            whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                        >
                            {/* UPDATED: Using light gradient for button surface */}
                            <Button
                                asChild
                                size="lg"
                                className={`text-lg px-8 py-6 shadow-2xl shadow-primary/50 bg-gradient-to-r ${gradients.brandLight} hover:bg-gradient-to-r hover:${gradients.brandLightHover} transition-all text-white border-0 group`}
                            >
                                <Link href="/login">
                                    <Rabbit className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                                    Simulation starten
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        </motion.div>

                        <motion.div
                            whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                        >
                            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 group">
                                <Link href="#demo">
                                    <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                    Demo ansehen
                                </Link>
                            </Button>
                        </motion.div>
                    </motion.div>

                </div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
                    <motion.div
                        className="w-2 h-2 rounded-full bg-black"
                        animate={{ y: [0, 12, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </div>
            </motion.div>
        </section>
    );
}
