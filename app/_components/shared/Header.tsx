// app/_components/shared/Header.tsx
"use client";

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Birdhouse, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/app/_components/ui/button';
import { gradients } from '@/app/_lib/design-tokens';

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { scrollY } = useScroll();

    const headerY = useTransform(scrollY, [0, 100], [16, 8]);
    const headerBlur = useTransform(scrollY, [0, 100], [16, 24]);
    const headerBg = useTransform(scrollY, [0, 100], [0.7, 0.85]);

    const navItems = [
        { label: 'Wie es funktioniert', href: '#wie-es-funktioniert' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Demo', href: '/demo' },
    ];

    return (
        <motion.header
            className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
            <motion.div
                className="w-full max-w-6xl relative mt-4"
                style={{ y: headerY }}
            >
                <motion.div
                    className="absolute inset-0 rounded-2xl border border-white/10 shadow-2xl"
                    style={{
                        backgroundColor: useTransform(headerBg, (v) => `rgba(255, 255, 255, ${v * 0.1})`),
                        backdropFilter: useTransform(headerBlur, (v) => `blur(${v}px)`),
                    }}
                />

                {/* UPDATED: Using brand gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r ${gradients.brand} opacity-5 rounded-2xl pointer-events-none`} />

                <div className="relative flex items-center justify-between px-6 py-4">

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <motion.div
                            className={`flex items-center gap-2`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            <Birdhouse className="h-8 w-8 text-black" />
                            <span className="text-xxl md:text-xl text-black font-headline tracking-tighter-custom">bird<span className="font-accent">house</span></span>

                        </motion.div>
                        <span className={`text-xl font-bold group-hover:${gradients.brandText} transition-all duration-300`}>
                            UX Agent
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item, index) => (
                            <motion.div
                                key={item.href}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                            >
                                <Link
                                    href={item.href}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all duration-200 relative group"
                                >
                                    {item.label}
                                    <motion.div
                                        className={`absolute bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r ${gradients.brand} rounded-full`}
                                        initial={{ scaleX: 0 }}
                                        whileHover={{ scaleX: 1 }}
                                        transition={{ duration: 0.2 }}
                                    />
                                </Link>
                            </motion.div>
                        ))}
                    </nav>

                    {/* CTA Button Desktop */}
                    <div className="hidden md:flex items-center gap-3">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6, duration: 0.5 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {/* UPDATED: Using brand gradient */}
                            <Button
                                asChild
                                className={`shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow bg-gradient-to-r ${gradients.brand} hover:opacity-90 border-0 text-white`}
                            >
                                <Link href="/login">
                                    Jetzt starten
                                </Link>
                            </Button>
                        </motion.div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <motion.button
                        className="md:hidden p-2 rounded-xl hover:bg-background/50 transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        whileTap={{ scale: 0.95 }}
                    >
                        <motion.div
                            animate={{ rotate: isMenuOpen ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </motion.div>
                    </motion.button>
                </div>

                {/* Mobile Menu */}
                <motion.div
                    initial={false}
                    animate={{
                        height: isMenuOpen ? 'auto' : 0,
                        opacity: isMenuOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                >
                    <nav className="flex flex-col p-4 gap-2 border-t border-white/10">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className="px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="pt-2">
                            <Button
                                asChild
                                className={`shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow bg-gradient-to-r ${gradients.brandLight} hover:bg-gradient-to-r hover:${gradients.brandLightHover} border-0 text-white`}
                            >
                                <Link href="/login">
                                    Jetzt starten
                                </Link>
                            </Button>
                        </div>
                    </nav>
                </motion.div>
            </motion.div>
        </motion.header>
    );
}
