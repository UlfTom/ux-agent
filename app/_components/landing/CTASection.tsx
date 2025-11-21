// app/_components/landing/CTASection.tsx
"use client";

import Link from 'next/link';
import { Button } from "@/app/_components/ui/button";
import { motion, useReducedMotion } from 'framer-motion';
import { Rabbit, Calendar, ArrowRight, Zap, Target, TrendingUp, Shield, Clock, Users } from "lucide-react";
import { fadeInUp } from "@/app/_lib/animations";
import { gradients } from "@/app/_lib/design-tokens";

const benefits = [
    {
        icon: Zap,
        title: "100x schneller",
        description: "Tests in Minuten, nicht Wochen"
    },
    {
        icon: Target,
        title: "50x günstiger",
        description: "Kosteneffizient vs. traditionelles Testing"
    },
    {
        icon: TrendingUp,
        title: "Skalierbar",
        description: "Von 1 bis 100 Personas parallel"
    },
    {
        icon: Shield,
        title: "DSGVO-konform",
        description: "Keine echten Nutzerdaten nötig"
    },
    {
        icon: Clock,
        title: "24/7 verfügbar",
        description: "Automatisiert & jederzeit"
    },
    {
        icon: Users,
        title: "Diverse Personas",
        description: "Realistische Nutzerprofile"
    }
];

export function CTASection() {
    const prefersReducedMotion = useReducedMotion();

    return (
        <section className="py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-primary/5" />

            <div className="container mx-auto max-w-7xl px-4 relative z-10">
                {/* Benefits Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-20"
                >
                    <h3 className="text-3xl md:text-4xl font-bold text-center mb-12">
                        Warum UX-Simulation?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {benefits.map((benefit, index) => {
                            const Icon = benefit.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-start gap-4 p-6 rounded-xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all"
                                >
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${gradients.brandLight}`}>
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">{benefit.title}</h4>
                                        <p className="text-sm text-muted-foreground">{benefit.description}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Main CTA */}
                <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    className="text-center"
                >
                    <div className="max-w-4xl mx-auto">
                        <motion.h2
                            className="font-headline tracking-tighter-custom text-4xl md:text-6xl font-bold mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            Bereit für bessere{' '}
                            <span className={`${gradients.brandText} font-accent tracking-tighter-custom`}>
                                User Experiences?
                            </span>
                        </motion.h2>

                        <motion.p
                            className="text-xl text-muted-foreground mb-12"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            Starten Sie Ihre erste Simulation in weniger als 2 Minuten.<br />
                            Keine Kreditkarte erforderlich.
                        </motion.p>

                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                        >
                            <Link href="/simulation">
                                <Button
                                    size="lg"
                                    className={`bg-gradient-to-r ${gradients.brandLight} hover:bg-gradient-to-r hover:${gradients.brandLightHover} shadow-lg shadow-primary/30 border-0 text-white group`}
                                >
                                    <Rabbit className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                    Kostenlos starten
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <Link href="/demo">
                                <Button size="lg" variant="outline">
                                    <Calendar className="mr-2 h-5 w-5" />
                                    Demo vereinbaren
                                </Button>
                            </Link>
                        </motion.div>

                        <motion.div
                            className="flex flex-wrap justify-center gap-8 mt-12 text-sm text-muted-foreground"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex items-center gap-2">
                                <CheckIcon className="h-5 w-5 text-primary" />
                                Keine Kreditkarte
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckIcon className="h-5 w-5 text-primary" />
                                In 2 Minuten startklar
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckIcon className="h-5 w-5 text-primary" />
                                Jederzeit kündbar
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
            />
        </svg>
    );
}
