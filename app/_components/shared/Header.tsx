// app/_components/shared/Header.tsx

"use client";

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Birdhouse, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/app/_components/ui/button';
import { gradients } from '@/app/_lib/design-tokens';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const pathname = usePathname();

  const headerY = useTransform(scrollY, [0, 100], [16, 8]);
  const headerBlur = useTransform(scrollY, [0, 100], [16, 24]);
  const headerBg = useTransform(scrollY, [0, 100], [0.7, 0.85]);

  // Determine which page we're on
  const isHomePage = pathname === '/';
  const isSimulationPage = pathname === '/simulation';
  const isLoginPage = pathname === '/login' || pathname === '/auth';

  // Define navigation items based on current page
  const getNavItems = () => {
    if (isHomePage) {
      return [
        { label: 'Wie es funktioniert', href: '#wie-es-funktioniert' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Demo', href: '/demo' },
      ];
    }

    if (isSimulationPage) {
      return [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Dokumentation', href: '/docs' },
        { label: 'Support', href: '/support' },
      ];
    }

    if (isLoginPage) {
      return [
        { label: 'Features', href: '/#wie-es-funktioniert' },
        { label: 'Pricing', href: '/#pricing' },
      ];
    }

    // Default navigation
    return [
      { label: 'Home', href: '/' },
      { label: 'Demo', href: '/demo' },
    ];
  };

  const navItems = getNavItems();

  // Define CTA button based on current page
  const getCTAButton = () => {
    if (isHomePage) {
      return {
        label: 'Jetzt starten',
        href: '/login',
      };
    }

    if (isSimulationPage) {
      return {
        label: 'Neue Simulation',
        href: '/simulation',
        onClick: () => window.location.reload(),
      };
    }

    if (isLoginPage) {
      return {
        label: 'Registrieren',
        href: '/register',
      };
    }

    return {
      label: 'Login',
      href: '/login',
    };
  };

  const ctaButton = getCTAButton();

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-500000"
        style={{
          y: headerY,
        }}
      >
        <div className="container mx-auto px-4">
          <motion.nav
            className="relative rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
            style={{
              backgroundColor: useTransform(headerBg, (v) => `rgba(255, 255, 255, ${v * 0.1})`),
              backdropFilter: useTransform(headerBlur, (v) => `blur(${v}px)`),
            }}
          >
            <div className="flex items-center justify-between h-16 px-6">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <motion.div
                  className={`flex items-center gap-2`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Birdhouse className="h-8 w-8 text-black" />
                  <span className="text-xxl md:text-xl text-black font-headline tracking-tighter-custom uppercase">bird<span className="font-accent normal-case">house</span></span>

                </motion.div>
                <span className={`text-xl font-bold group-hover:${gradients.brandText} transition-all duration-300`}>
                  UX Agent
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-8">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className="font-medium text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
                    >
                      {item.label}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 transition-all group-hover:w-full" />
                    </Link>
                  </motion.div>
                ))}

                {/* CTA Button Desktop */}
                <Button
                  asChild={!ctaButton.onClick}
                  onClick={ctaButton.onClick}
                  className={`font-display font-semibold shadow-lg text-white hover:shadow-xl transition-all bg-gradient-to-r ${gradients.brandLight}`}
                >
                  {ctaButton.onClick ? (
                    <button>{ctaButton.label}</button>
                  ) : (
                    <Link href={ctaButton.href}>{ctaButton.label}</Link>
                  )}
                </Button>
              </div>

              {/* Mobile Menu Toggle */}
              <motion.div whileTap={{ scale: 0.95 }}
                className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </motion.div>
            </div>
          </motion.nav>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{
          height: isMenuOpen ? 'auto' : 0,
          opacity: isMenuOpen ? 1 : 0,
        }}
        className="fixed top-24 left-0 right-0 z-40 md:hidden overflow-hidden"
      >
        <div className="container mx-auto px-4">
          <div className="bg-background/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground text-white hover:text-foreground hover:bg-background/50 transition-all block"
              >
                {item.label}
              </Link>
            ))}
            <Button
              asChild={!ctaButton.onClick}
              onClick={() => {
                setIsMenuOpen(false);
                ctaButton.onClick?.();
              }}
              className={`w-full font-display text-white font-semibold bg-gradient-to-r ${gradients.brandLight}`}
            >
              {ctaButton.onClick ? (
                <button>{ctaButton.label}</button>
              ) : (
                <Link href={ctaButton.href}>{ctaButton.label}</Link>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}