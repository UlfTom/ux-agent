// app/_components/landing/PricingSection.tsx
"use client";

import { Button } from "@/app/_components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Zap, Star, Sparkles, Package, Crown } from "lucide-react";
import { staggerContainer, scaleIn } from "@/app/_lib/animations";
import { gradients } from "@/app/_lib/design-tokens";

const plans = [
    {
        icon: Package,
        name: "Basic",
        tagline: "Der schnelle Start",
        price: "1",
        unit: "Token pro Test",
        description: "Perfekt für erste Experimente, kleine Projekte und den Einstieg.",
        features: [
            "1 KI-Agent (Autopilot) pro Test",
            "Visuelles Logbuch & Screenshots",
            "Klickpfad-Analyse",
            "PDF/CSV Export",
            "Einsteiger-Support"
        ],
        cta: "Jetzt starten",
        highlighted: false,
        badge: null
    },
    {
        icon: Zap,
        name: "Plus",
        tagline: "Der Game Changer",
        price: "5",
        unit: "Tokens pro Test",
        description: "Für Teams mit höheren Ansprüchen und echte UX-Optimierer.",
        features: [
            "Live-Personas (Standard & Branchenspezifisch)",
            "KI-Moderator greift intelligent ein",
            "RAG-Integration (z.B. Baymard, NN Group)",
            "Qualitative & quantitative UX-Analysen",
            "Heatmaps & User-Journey-Visualisierung",
            "Slack/Teams Integrationen",
            "Priorisierte AI-Empfehlungen"
        ],
        cta: "Jetzt durchstarten",
        highlighted: true,
        badge: "Beliebteste Wahl"
    },
    {
        icon: Crown,
        name: "Premium",
        tagline: "Der digitale Zwilling",
        price: "10",
        unit: "Tokens pro Test",
        description: "Exklusive Pro-Features für Enterprise und UX-Leadership.",
        features: [
            "Alles aus Plus",
            "God Mode: maßgeschneiderte Personas (je neue Persona: +3 Tokens)",
            "Analytics-Integration (z.B. Adobe Analytics)",
            "Personas auf Basis echter Userdaten",
            "Segmentierte Tests & A/B-Vorhersagen",
            "Custom Workflows & Pro-API",
            "Dedicated Success Manager"
        ],
        cta: "Beratung buchen",
        highlighted: false,
        badge: null
    }
];

const faqItems = [
    {
        question: "Wie funktioniert die Abrechnung?",
        answer: "Jeder Test verbraucht Tokens. Die Anzahl hängt vom gewählten Paket und Zusatzfeatures (z.B. God Mode) ab. Im Abo bekommst du monatlich Tokens günstiger – weitere jederzeit flexibel zukaufen."
    },
    {
        question: "Was kostet eine maßgeschneiderte (God Mode) Persona?",
        answer: "Premium-User können KI-basierte, maßgeschneiderte Personas generieren. Jede neue 'God Mode'-Persona kostet zusätzlich 3 Tokens."
    },
    {
        question: "Kann ich ungenutzte Tokens behalten?",
        answer: "Nicht verbrauchte Tokens aus Paketen bleiben bis zu 12 Monate gültig und verfallen nicht direkt."
    }
];

export function PricingSection() {
    const prefersReducedMotion = useReducedMotion();
    return (
        <section id="pricing" className="py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
            <div className="container mx-auto max-w-7xl px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                        Wählen Sie Ihr Token-Paket
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Flexibel, transparent und skalierbar. Jedes Feature für einen Token-Preis – mehr Testpower für Ihr UX-Team.
                    </p>
                </motion.div>
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8"
                >
                    {plans.map((plan, index) => {
                        const Icon = plan.icon;
                        return (
                            <motion.div
                                key={index}
                                variants={scaleIn}
                                whileHover={prefersReducedMotion ? {} : {
                                    y: plan.highlighted ? -12 : -8,
                                    transition: { type: "spring", stiffness: 300, damping: 20 }
                                }}
                                className="relative group"
                            >
                                {plan.badge && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                                        <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${gradients.brand} text-white text-sm font-semibold shadow-lg flex items-center gap-1.5`}>
                                            <Sparkles className="h-3.5 w-3.5" />
                                            {plan.badge}
                                        </div>
                                    </div>
                                )}
                                <div className={`relative h-full rounded-3xl p-8 backdrop-blur-sm border-2 transition-all ${plan.highlighted
                                    ? 'bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-primary shadow-2xl shadow-primary/20'
                                    : 'bg-background/50 border-border hover:border-primary/50'
                                    }`}>
                                    <div className="mb-6">
                                        <motion.div
                                            whileHover={{ rotate: 360, scale: plan.highlighted ? 1.2 : 1 }}
                                            transition={{ duration: 0.6 }}
                                            className="inline-block mb-4"
                                        >
                                            <Icon className={`h-10 w-10 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                                        </motion.div>
                                        <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                                        <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                                    </div>
                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-bold">{plan.price}</span>
                                            <span className="text-muted-foreground">{plan.unit}</span>
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground mb-8">
                                        {plan.description}
                                    </p>
                                    <Button
                                        className={`w-full mb-8 ${plan.highlighted
                                            ? `bg-gradient-to-r ${gradients.brandLight} hover:bg-gradient-to-r hover:${gradients.brandLightHover} shadow-lg shadow-primary/30 border-0 text-white`
                                            : ''
                                            }`}
                                        variant={plan.highlighted ? 'default' : 'outline'}
                                        size="lg"
                                    >
                                        {plan.cta}
                                    </Button>
                                    <div className="space-y-3">
                                        {plan.features.map((feature, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className={`mt-0.5 p-0.5 rounded-full ${plan.highlighted ? 'bg-primary/20' : 'bg-muted'
                                                    }`}>
                                                    <Check className={`h-4 w-4 ${plan.highlighted ? 'text-primary' : 'text-muted-foreground'
                                                        }`} />
                                                </div>
                                                <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-16"
                >
                    <div className="mb-4 text-md text-muted-foreground">
                        <b>1 Token</b> = 1 Autopilot-Test pro Persona/Site<br />
                        Moderierte Tests kosten 5 Tokens, God Mode-Persona Generation (nur Premium): +3 Tokens je Generierung.<br />
                        Unverbrauchte Tokens bleiben 12 Monate gültig.
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Alle Preise verstehen sich zzgl. MwSt. • Zusätzliche Token-Bundles jederzeit verfügbar.
                    </p>
                </motion.div>
                <div className="mt-20 max-w-3xl mx-auto">
                    <h4 className="text-xl font-semibold mb-4 text-center">Häufige Fragen</h4>
                    <ul className="space-y-6">
                        {faqItems.map((item, idx) => (
                            <li key={idx} className="border-t border-border pt-4">
                                <p className="font-semibold">{item.question}</p>
                                <p className="text-muted-foreground">{item.answer}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}