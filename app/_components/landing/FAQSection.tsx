// app/_components/landing/FAQSection.tsx
"use client";

import { motion } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";
import { fadeInUp } from "@/app/_lib/animations";

type FAQItem = {
    question: string;
    answer: string;
    category: "product" | "pricing" | "technical" | "general";
};

const faqData: FAQItem[] = [
    // Product
    {
        category: "product",
        question: "Was ist UX-Simulation und wie funktioniert sie?",
        answer: "KI-Agents navigieren deine Website wie echte Nutzer. Sie denken, beobachten und handeln basierend auf verschiedenen Personas (pragmatisch, explorativ, vorsichtig). Vision AI analysiert dabei das UI, findet UX-Issues und dokumentiert alles mit Screenshots und Handlungsempfehlungen."
    },
    {
        category: "product",
        question: "Was ist der Unterschied zwischen unmoderierten und moderierten Tests?",
        answer: "Unmoderierte Tests (1 Token) laufen vollautomatisch – die KI navigiert selbstständig. Bei moderierten Tests (5 Tokens) greift ein KI-Moderator aktiv ein, stellt Fragen und analysiert qualitativ – ideal für komplexe User Journeys und tiefere Insights."
    },
    {
        category: "product",
        question: "Was ist der God Mode?",
        answer: "Ein Premium-Feature, mit dem du maßgeschneiderte Personas basierend auf echten Nutzerdaten (z.B. aus Adobe Analytics, GA4) generierst. Jede neue God-Mode-Persona kostet zusätzlich 3 Tokens und ermöglicht hochrelevante Tests für deine spezifischen Zielgruppen."
    },
    {
        category: "product",
        question: "Werden auch Voice-Interviews unterstützt?",
        answer: "Ja! Als kommende Erweiterung planen wir Speech-AI-Integration (z.B. ElevenLabs): Echte KI-Piloten sprechen mit KI-Researchern in qualitativen Interviews – für noch tiefere, authentischere Insights bei komplexen Fragestellungen."
    },
    
    // Pricing
    {
        category: "pricing",
        question: "Was ist ein Token und wie viele brauche ich?",
        answer: "1 Token = 1 unmoderierter Test pro Persona/Site. Moderierte Tests kosten 5 Tokens. Beispiel: Du willst 3 Personas auf 2 verschiedenen Sites testen? Das sind 6 Tokens (unmoderiert) bzw. 30 Tokens (moderiert)."
    },
    {
        category: "pricing",
        question: "Wie funktioniert die Abrechnung?",
        answer: "Im Abo bekommst du monatlich Tokens zum rabattierten Preis (10-30% je nach Paket). Zusätzliche Tokens kannst du jederzeit flexibel nachkaufen. Nicht verbrauchte Tokens bleiben 12 Monate gültig."
    },
    {
        category: "pricing",
        question: "Kann ich jederzeit kündigen?",
        answer: "Ja, alle Abos sind monatlich kündbar. Deine Tokens bleiben auch nach Kündigung 12 Monate lang gültig – du verlierst nichts."
    },
    {
        category: "pricing",
        question: "Gibt es ein kostenloses Paket?",
        answer: "Ja! Das Free-Paket gibt dir 10 Tokens pro Monat kostenlos. Perfekt zum Ausprobieren und für kleinere Projekte. Keine Kreditkarte erforderlich."
    },

    // Technical
    {
        category: "technical",
        question: "Welche Websites kann ich testen?",
        answer: "Grundsätzlich alle öffentlich zugänglichen Websites. Auch passwortgeschützte Bereiche sind testbar, wenn du entsprechende Credentials bereitstellst. Die KI navigiert wie ein echter Browser (Chrome-basiert)."
    },
    {
        category: "technical",
        question: "Wie lange dauert ein Test?",
        answer: "Die meisten Tests dauern 2-5 Minuten. Du bekommst Echtzeit-Updates während der Simulation und einen vollständigen Report sofort danach – mit Screenshots, Klickpfaden und priorisierten Handlungsempfehlungen."
    },
    {
        category: "technical",
        question: "Kann ich eigene Personas erstellen?",
        answer: "Ja! Im God Mode (Premium) kannst du Personas basierend auf echten Analytics-Daten generieren. Alternativ kannst du aus unserer Bibliothek wählen oder manuelle Persona-Beschreibungen eingeben."
    },
    {
        category: "technical",
        question: "Werden meine Daten sicher gespeichert?",
        answer: "Ja, alle Daten werden DSGVO-konform in Deutschland gehostet. Simulationen laufen in isolierten Umgebungen. Du entscheidest selbst, welche Reports du speicherst oder teilst."
    },

    // General
    {
        category: "general",
        question: "Ersetzt UX-Simulation echte User-Tests?",
        answer: "Nein, sie ergänzt sie. KI-Simulationen sind ideal für schnelles Feedback, Iteration und Pre-Launch-Checks (100x schneller, 50x günstiger). Für finale Validierung empfehlen wir zusätzlich echte User-Tests."
    },
    {
        category: "general",
        question: "Für wen ist die Plattform geeignet?",
        answer: "Für UX-Designer, Product Owner, Entwickler, Agenturen und alle, die digitale Produkte verbessern wollen. Von Startups bis Enterprise – jeder profitiert von schnellem, kosteneffizientem UX-Feedback."
    },
    {
        category: "general",
        question: "Kann ich die Plattform in meine Tools integrieren?",
        answer: "Ja! Wir bieten Integrationen für Slack, Teams, Jira und webhooks. Im Premium-Paket steht dir auch eine Pro-API zur Verfügung. Analytics-Anbindungen (Adobe, GA4) sind ebenfalls möglich."
    },
    {
        category: "general",
        question: "Wie schnell kann ich starten?",
        answer: "In unter 2 Minuten! Registrieren, erstes Szenario anlegen, Persona wählen – fertig. Keine Kreditkarte nötig für das Free-Paket."
    }
];

const categories = [
    { id: "all", label: "Alle Fragen" },
    { id: "product", label: "Produkt" },
    { id: "pricing", label: "Preise & Abos" },
    { id: "technical", label: "Technisches" },
    { id: "general", label: "Allgemeines" }
];

export function FAQSection() {
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const filteredFAQs = activeCategory === "all" 
        ? faqData 
        : faqData.filter(item => item.category === activeCategory);

    return (
        <section id="faq" className="py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
            
            <div className="container mx-auto max-w-5xl px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                        Häufig gestellte Fragen
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Alles, was du über UX-Simulation wissen musst
                    </p>
                </motion.div>

                {/* Category Filter */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap justify-center gap-3 mb-12"
                >
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                                activeCategory === cat.id
                                    ? 'bg-primary text-primary-foreground shadow-lg'
                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </motion.div>

                {/* FAQ Items */}
                <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="space-y-4"
                >
                    {filteredFAQs.map((item, index) => {
                        const isOpen = openIndex === index;
                        
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="border border-border rounded-2xl overflow-hidden bg-background/50 backdrop-blur-sm hover:border-primary/50 transition-all"
                            >
                                <button
                                    onClick={() => setOpenIndex(isOpen ? null : index)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <span className="font-semibold text-lg pr-8">
                                        {item.question}
                                    </span>
                                    <div className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                        {isOpen ? (
                                            <Minus className="h-5 w-5 text-primary" />
                                        ) : (
                                            <Plus className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                </button>
                                
                                <motion.div
                                    initial={false}
                                    animate={{
                                        height: isOpen ? "auto" : 0,
                                        opacity: isOpen ? 1 : 0
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                                        {item.answer}
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Contact CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="text-center mt-16 p-8 rounded-2xl bg-muted/30 backdrop-blur-sm border border-border"
                >
                    <h3 className="text-xl font-semibold mb-2">Noch Fragen?</h3>
                    <p className="text-muted-foreground mb-4">
                        Unser Team hilft dir gerne weiter
                    </p>
                    <a 
                        href="mailto:support@uxsimulation.io" 
                        className="text-primary hover:underline font-medium"
                    >
                        support@uxsimulation.io
                    </a>
                </motion.div>
            </div>
        </section>
    );
}
