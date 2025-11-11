// app/_components/landing/CTASection.tsx
"use client";

import Link from 'next/link';
import { Button } from "@/app/_components/ui/button";
import { motion, useReducedMotion } from 'framer-motion';
import { Rabbit, Calendar, ArrowRight } from "lucide-react";
import { fadeInUp } from "@/app/_lib/animations";
import { gradients } from "@/app/_lib/design-tokens";

export function CTASection() {
    const prefersReducedMotion = useReducedMotion();

    return (
        <section className="py-32 relative overflow-hidden">
            <div className="absolute inset-0">
                {/* UPDATED: Using brand gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradients.brand} opacity-10`} />
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
            </div>

            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/30 rounded-full blur-[150px]"
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            <div className="container mx-auto max-w-4xl px-4 relative z-10">

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.15 }
                        }
                    }}
                    className="text-center space-y-12"
                >

                    <motion.div variants={fadeInUp} className="space-y-6">
                        <h2 className="text-5xl md:text-7xl font-bold">
                            Bereit für bessere
                            <br />
                            {/* UPDATED: Using brand gradient */}
                            <span className={gradients.brandText}>
                                User Experiences?
                            </span>
                        </h2>
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                            Starten Sie Ihre erste Simulation in weniger als 2 Minuten.
                            <span className="text-foreground font-semibold"> Keine Kreditkarte erforderlich.</span>
                        </p>
                    </motion.div>

                    <motion.div
                        variants={fadeInUp}
                        className="flex flex-col sm:flex-row gap-4 items-center justify-center"
                    >
                        <motion.div
                            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                        >
                            {/* UPDATED: Using light gradient */}
                            <Button
                                asChild
                                size="lg"
                                className={`text-xl px-10 py-7 shadow-2xl shadow-primary/50 bg-gradient-to-r ${gradients.brandLight} hover:bg-gradient-to-r hover:${gradients.brandLightHover} border-0 text-white group`}
                            >
                                <Link href="/simulation">
                                    <Rabbit className="mr-2 h-6 w-6 group-hover:rotate-12 transition-transform" />
                                    Kostenlos starten
                                    <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        </motion.div>

                        <motion.div
                            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                        >
                            <Button asChild variant="outline" size="lg" className="text-xl px-10 py-7 bg-background/50 backdrop-blur-sm">
                                <Link href="/demo">
                                    <Calendar className="mr-2 h-6 w-6" />
                                    Demo vereinbaren
                                </Link>
                            </Button>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        variants={fadeInUp}
                        className="pt-8 space-y-4"
                    >
                        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckIcon className="h-4 w-4 text-primary" />
                                <span>Keine Kreditkarte</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckIcon className="h-4 w-4 text-primary" />
                                <span>In 2 Minuten startklar</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckIcon className="h-4 w-4 text-primary" />
                                <span>Jederzeit kündbar</span>
                            </div>
                        </div>
                    </motion.div>

                </motion.div>

            </div>
        </section>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
}
