// app/_components/landing/PricingSection.tsx
"use client";

import { Button } from "@/app/_components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Zap, Crown, Sparkles, Gift, BadgePlus, ChevronDown } from "lucide-react";
import { useState } from "react";
import { staggerContainer, scaleIn } from "@/app/_lib/animations";
import { gradients } from "@/app/_lib/design-tokens";

const plans = [
    {
        icon: Gift,
        name: "Free",
        tagline: "Zum Ausprobieren",
        price: "0",
        monthlyTokens: "10 Tokens",
        description: "Perfekt für erste Tests.",
        features: ["10 Tokens/Monat gratis", "Unmoderierte Tests", "Standard-Personas", "Basis-Reporting"],
        tokenCost: "1 Token = 1 Test",
        cta: "Kostenlos starten",
        highlighted: false
    },
    {
        icon: Zap,
        name: "Basic",
        tagline: "Der schnelle Start",
        price: "49",
        monthlyTokens: "40 Tokens/Monat",
        description: "Für kleine Teams.",
        features: ["40 Tokens (10% Rabatt)", "Moderierte Tests", "Erweiterte Analysen", "Heatmaps"],
        tokenCost: "Unmoderiert: 1 Token | Moderiert: 5 Tokens",
        cta: "Jetzt starten",
        highlighted: false
    },
    {
        icon: BadgePlus,
        name: "Plus",
        tagline: "Der Game Changer",
        price: "89",
        monthlyTokens: "90 Tokens/Monat",
        description: "Für UX-Teams.",
        features: ["90 Tokens (20% Rabatt)", "KI-Researcher", "RAG-Integration", "Priorisierte Empfehlungen", "Slack/Teams"],
        tokenCost: "Unmoderiert: 1 Token | Moderiert: 5 Tokens",
        cta: "Jetzt durchstarten",
        highlighted: true,
        badge: "Beliebteste Wahl"
    },
    {
        icon: Crown,
        name: "Premium",
        tagline: "Der digitale Zwilling",
        price: "169",
        monthlyTokens: "200 Tokens/Monat",
        description: "Enterprise-Features.",
        features: ["200 Tokens (30% Rabatt)", "God Mode (+3 Tokens/Persona)", "Analytics-Integration", "Custom Workflows", "Success Manager"],
        tokenCost: "Unmoderiert: 1 Token | Moderiert: 5 Tokens | God Mode: +3 Tokens",
        cta: "Beratung buchen",
        highlighted: false
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
                    className="text-center mb-12"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                        Wählen Sie Ihr Token-Paket
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Flexibel, transparent und skalierbar.
                    </p>
                </motion.div>

                {/* Mobile: Horizontal Scroll */}
                <div className="md:hidden overflow-x-auto pb-8 -mx-4 px-4">
                    <div className="flex gap-4 snap-x snap-mandatory">
                        {plans.map((plan, index) => (
                            <MobilePricingCard key={index} plan={plan} />
                        ))}
                    </div>
                </div>

                {/* Desktop: Grid View */}
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    className="hidden md:grid grid-cols-4 gap-6"
                >
                    {plans.map((plan, index) => (
                        <PricingCard
                            key={index}
                            plan={plan}
                            prefersReducedMotion={prefersReducedMotion}
                        />
                    ))}
                </motion.div>

                {/* Info Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-12 space-y-4"
                >
                    <div className="p-4 bg-muted/30 rounded-lg max-w-3xl mx-auto">
                        <p className="text-sm text-muted-foreground">
                            <strong>Token-Verbrauch:</strong> 1 Token = 1 unmoderierter Test | 5 Tokens = 1 moderierter Test | God Mode: +3 Tokens
                        </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Alle Preise zzgl. MwSt. • Tokens bleiben 12 Monate gültig • Jederzeit kündbar
                    </p>
                </motion.div>
            </div>
        </section>
    );
}

// Desktop Card Component (Features always visible)
function PricingCard({ plan, prefersReducedMotion }: any) {
    const Icon = plan.icon;

    return (
        <motion.div
            variants={scaleIn}
            whileHover={prefersReducedMotion ? {} : {
                y: plan.highlighted ? -12 : -8,
                transition: { type: "spring", stiffness: 300, damping: 20 }
            }}
            className="relative group"
        >
            {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${gradients.brand} text-white text-xs font-semibold shadow-lg flex items-center gap-1`}>
                        {plan.badge}
                    </div>
                </div>
            )}

            <div className={`relative h-full rounded-3xl p-6 backdrop-blur-sm border-2 transition-all ${plan.highlighted
                ? 'bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-primary shadow-2xl shadow-primary/20'
                : 'bg-background/50 border-border hover:border-primary/50'
                }`}>
                {/* Icon + Name/Tagline horizontal */}
                <div className="flex items-start gap-3 mb-4">
                    <Icon className={`h-8 w-8 flex-shrink-0 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                        <h3 className="text-xl font-bold leading-tight">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">€/Monat</span>
                    </div>
                    <p className="text-xs text-primary mt-1">{plan.monthlyTokens}</p>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                <Button
                    className={`w-full mb-4 ${plan.highlighted
                        ? `bg-gradient-to-r ${gradients.brandLight} text-white`
                        : ''
                        }`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                    size="sm"
                >
                    {plan.cta}
                </Button>

                {/* Features: Always visible on desktop */}
                <div className="space-y-2 mb-4">
                    {plan.features.map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                            <Check className={`h-3 w-3 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-xs text-muted-foreground leading-relaxed">{feature}</span>
                        </div>
                    ))}
                </div>

                {/* Token Cost Info */}
                <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                    {plan.tokenCost}
                </div>
            </div>
        </motion.div>
    );
}

// Mobile Card Component (collapsible features, 70vw width)
function MobilePricingCard({ plan }: any) {
    const Icon = plan.icon;
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`flex-shrink-0 w-[70vw] snap-center rounded-3xl p-6 backdrop-blur-sm border-2 ${plan.highlighted
                ? 'bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-primary shadow-2xl'
                : 'bg-background/50 border-border'
                }`}
        >
            {plan.badge && (
                <div className="absolute -top-0.5 -right-1.5 z-20">
                    <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${gradients.brand} text-white text-xs font-semibold shadow-lg flex items-center gap-1`}>
                        {plan.badge}
                    </div>
                </div>
            )}

            {/* Icon + Name/Tagline horizontal */}
            <div className="flex items-start gap-4 mb-4">
                <Icon className={`h-10 w-10 flex-shrink-0 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                    <h3 className="text-2xl font-bold leading-tight">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.tagline}</p>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">€/Monat</span>
                </div>
                <p className="text-sm text-primary mt-2">{plan.monthlyTokens}</p>
            </div>

            <p className="text-muted-foreground mb-6">{plan.description}</p>

            <Button
                className={`w-full mb-6 ${plan.highlighted
                    ? `bg-gradient-to-r ${gradients.brandLight} text-white shadow-lg`
                    : ''
                    }`}
                variant={plan.highlighted ? 'default' : 'outline'}
                size="lg"
            >
                {plan.cta}
            </Button>

            {/* Collapsible Features */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-sm font-medium text-foreground mb-3 p-3 rounded-lg hover:bg-background/50 transition-colors"
            >
                <span>Features anzeigen</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            <motion.div
                initial={false}
                animate={{ height: isExpanded ? "auto" : 0 }}
                className="overflow-hidden"
            >
                <div className="space-y-3 mb-6 pt-2">
                    {plan.features.map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                            <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Token Cost Info */}
            <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                    <strong>Token-Verbrauch:</strong><br />
                    {plan.tokenCost}
                </p>
            </div>
        </motion.div>
    );
}
