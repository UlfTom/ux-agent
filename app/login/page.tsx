// app/simulation/page.tsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Rabbit, Mail, Lock, ArrowRight, Github, Chrome } from "lucide-react";
import { gradients } from "@/app/_lib/design-tokens";
import { fadeInUp, staggerContainer } from "@/app/_lib/animations";

export default function SimulationLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement actual login logic
        console.log('Login attempt:', { email, password });
    };

    const handleOAuthLogin = (provider: string) => {
        // TODO: Implement OAuth
        console.log('OAuth login:', provider);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">

            {/* Animated Background */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

            {/* Floating Orbs */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"
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
                className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px]"
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

            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, y: 60, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md mx-4 relative z-10"
            >
                {/* Glass Card */}
                <div className="relative bg-background/70 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-10">

                    {/* Title */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="text-center mb-8 space-y-2"
                    >
                        <motion.h1
                            variants={fadeInUp}
                            className="text-3xl md:text-4xl font-headline font-black tracking-tighter-custom"
                        >
                            Willkommen zurück
                        </motion.h1>
                        <motion.p
                            variants={fadeInUp}
                            className="text-muted-foreground font-body"
                        >
                            Starten Sie Ihre nächste UX-Simulation
                        </motion.p>
                    </motion.div>

                    {/* OAuth Buttons */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3 mb-6"
                    >
                        <motion.div variants={fadeInUp}>
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full font-body font-medium group hover:border-primary/50 transition-all"
                                onClick={() => handleOAuthLogin('google')}
                            >
                                <Chrome className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                Mit Google fortfahren
                            </Button>
                        </motion.div>

                        <motion.div variants={fadeInUp}>
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full font-body font-medium group hover:border-primary/50 transition-all"
                                onClick={() => handleOAuthLogin('github')}
                            >
                                <Github className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                Mit GitHub fortfahren
                            </Button>
                        </motion.div>
                    </motion.div>

                    {/* Divider */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        className="space-y-3 mb-6"
                    >
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background/70 px-3 text-muted-foreground font-body">
                                Oder mit Email
                            </span>
                        </div>
                    </motion.div>

                    {/* Email/Password Form */}
                    <motion.form
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <motion.div variants={fadeInUp}>
                            <label htmlFor="email" className="text-sm font-medium text-foreground mb-2 block font-body">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="ihre@email.de"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 h-12 bg-background/50 border-white/20 focus:border-primary/50 transition-all font-body"
                                    required
                                />
                            </div>
                        </motion.div>

                        <motion.div variants={fadeInUp}>
                            <label htmlFor="password" className="text-sm font-medium text-foreground mb-2 block font-body">
                                Passwort
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 h-12 bg-background/50 border-white/20 focus:border-primary/50 transition-all font-body"
                                    required
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            variants={fadeInUp}
                            className="flex items-center justify-between text-sm"
                        >
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="rounded border-white/20 text-primary focus:ring-primary/50"
                                />
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors font-body">
                                    Angemeldet bleiben
                                </span>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-primary hover:underline font-body font-medium"
                            >
                                Passwort vergessen?
                            </Link>
                        </motion.div>

                        <motion.div variants={fadeInUp}>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button
                                    type="submit"
                                    size="lg"
                                    className={`w-full bg-gradient-to-r ${gradients.brandLight} hover:${gradients.brandLightHover} border-0 text-white shadow-lg shadow-primary/30 font-body font-medium group`}
                                >
                                    Anmelden
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </motion.div>
                        </motion.div>
                    </motion.form>

                    {/* Sign Up Link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.5 }}
                        className="mt-8 text-center text-sm font-body"
                    >
                        <span className="text-muted-foreground">Noch kein Account? </span>
                        <Link
                            href="/signup"
                            className={`font-medium ${gradients.brandText} hover:underline`}
                        >
                            Jetzt kostenlos registrieren
                        </Link>
                    </motion.div>

                </div>

                {/* Back to Home Link */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="text-center mt-6"
                >
                    <Link
                        href="/"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 font-body"
                    >
                        ← Zurück zur Startseite
                    </Link>
                </motion.div>

            </motion.div>
        </div>
    );
}
