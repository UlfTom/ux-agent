// app/_components/landing/HowTheMagicWorks.tsx
"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, TrendingUp } from "lucide-react";
import { gradients } from "@/app/_lib/design-tokens";

export function HowTheMagicWorks() {
    return (
        <div className="relative py-32 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

            {/* Floating Orbs */}
            <motion.div
                className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, -50, 0],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
                animate={{
                    scale: [1.2, 1, 1.2],
                    x: [0, -50, 0],
                    y: [0, 50, 0],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            <div className="container mx-auto max-w-4xl px-4 relative z-10">

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.5 }}
                    className="flex justify-center mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                        <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                            <Sparkles className="h-4 w-4" />
                        </motion.div>
                        <span>Powered by AI</span>
                    </div>
                </motion.div>

                {/* Main Title */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-12"
                >
                    <h2 className="text-5xl md:text-7xl mb-6 font-headline tracking-tighter-custom">
                        Wie die Magie
                        <br />
                        <span className={gradients.brandText}>
                            passiert
                        </span>
                    </h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto"
                    >
                        Drei Schritte. Eine Revolution für Ihr UX-Testing.
                    </motion.p>
                </motion.div>

                {/* Feature Pills */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="flex flex-wrap items-center justify-center gap-4"
                >
                    {[
                        { icon: Zap, text: "In Echtzeit" },
                        { icon: TrendingUp, text: "Skalierbar" },
                        { icon: Sparkles, text: "KI-powered" },
                    ].map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.05, y: -2 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-background/80 backdrop-blur-xl border border-white/20 shadow-lg"
                            >
                                <Icon className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium text-foreground">{item.text}</span>
                            </motion.div>
                        );
                    })}
                </motion.div>

            </div>
        </div>
    );
}
