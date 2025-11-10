// app/page.tsx (Die NEUE Landing Page)
"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// HINWEIS: Du musst 'framer-motion' installieren, falls noch nicht geschehen: npm install framer-motion
import { motion, Variants } from 'framer-motion'; // <-- 1. GEÄNDERT: 'Variants' importiert
import { Bot, Rabbit, Copy, Check, Eye, Download, Settings, Star, Zap, Package, Loader2 } from "lucide-react";

export default function LandingPage() {

  // 2. GEÄNDERT: Wir sagen TypeScript, dass dies ein 'Variants'-Objekt ist
  const fadeIn: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" // Dieser String ist jetzt typsicher
      }
    },
  };

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">

      {/* Der globale "Glass-Header" aus app/layout.tsx wird hier automatisch angezeigt. */}

      <main className="flex-grow container mx-auto max-w-5xl px-4 py-32">
        <motion.div
          className="text-center flex flex-col items-center"
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.1 }}
        >
          <motion.h1
            className="text-5xl md:text-7xl font-bold text-foreground mb-6"
            variants={fadeIn}
          >
            Testen Sie Ihre UX
            <br />
            <span className="text-primary">mit autonomen KI-Agenten.</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8"
            variants={fadeIn}
          >
            Hören Sie auf zu raten. Validieren Sie Designs, finden Sie Usability-Probleme und verstehen Sie Ihre Nutzer – skaliert, schnell und datengetrieben.
          </motion.p>

          <motion.div variants={fadeIn}>
            <Button asChild size="lg" className="text-lg">
              <Link href="/simulation">
                <Rabbit className="mr-2 h-5 w-5" />
                Zur Simulation starten
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-32"
          initial="initial"
          whileInView="animate" // Animation startet, wenn man hinscrollt
          viewport={{ once: true, amount: 0.3 }}
          transition={{ staggerChildren: 0.2 }}
        >
          <h2 className="text-4xl font-bold text-center mb-12">
            Entwickelt für Ihre Anforderungen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Paket 1: Basic */}
            <motion.div variants={fadeIn}>
              <Card className="shadow-lg h-full flex flex-col">
                <CardHeader>
                  <Package className="h-8 w-8 text-primary mb-4" />
                  <CardTitle className="text-2xl">Basic</CardTitle>
                  <CardDescription>Unmoderierte Simulation</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-muted-foreground">
                  <p>Ein schneller, quantitativer "Smoke Test".</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>n=1 Agent</li>
                    <li>Quantitativer Klickpfad</li>
                    <li>Visuelles Logbuch</li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button variant="outline" className="w-full" disabled>1 Token / Test</Button>
                </div>
              </Card>
            </motion.div>

            {/* Paket 2: Plus */}
            <motion.div variants={fadeIn}>
              <Card className="shadow-lg h-full flex flex-col border-2 border-primary">
                <CardHeader>
                  <Zap className="h-8 w-8 text-primary mb-4" />
                  <CardTitle className="text-2xl">Plus</CardTitle>
                  <CardDescription>Moderierte Simulation + Gen. Wissen</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-muted-foreground">
                  <p>Ein "smarter" Agent mit KI-Moderator.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Live generierte Persona</li>
                    <li>RAG mit Baymard/NN Group Wissen</li>
                    <li>Intervention bei Schleifen</li>
                    <li>Qualitative Auswertung</li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button className="w-full" disabled>5 Tokens / Test</Button>
                </div>
              </Card>
            </motion.div>

            {/* Paket 3: Premium */}
            <motion.div variants={fadeIn}>
              <Card className="shadow-lg h-full flex flex-col">
                <CardHeader>
                  <Star className="h-8 w-8 text-primary mb-4" />
                  <CardTitle className="text-2xl">Premium</CardTitle>
                  <CardDescription>Data-Driven "Gott-Modus"</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-muted-foreground">
                  <p>Ein "digitaler Zwilling" Ihrer echten Kunden.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Anbindung an Adobe Analytics</li>
                    <li>Personas basierend auf echten Segmenten</li>
                    <li>Testen von "Nicht-Kunden"-Hypothesen</li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button variant="outline" className="w-full" disabled>10 Tokens / Test</Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>

      </main>
    </div>
  );
}