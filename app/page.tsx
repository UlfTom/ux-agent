// app/page.tsx
"use client";

import { LazyMotion, domAnimation } from 'framer-motion';
import { ScrollProgress } from "./_components/shared/ScrollProgress";
import { HeroSection } from "./_components/landing/HeroSection";
import { HowItWorksSection } from "./_components/landing/HowItWorksSection";
import { PricingSection } from "./_components/landing/PricingSection";
import { CTASection } from "./_components/landing/CTASection";
import { HowTheMagicWorks } from './_components/landing/HowTheMagicWorks';

export default function LandingPage() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-background">
        <ScrollProgress />

        <main className="relative">
          <HeroSection />
          <HowTheMagicWorks />
          <HowItWorksSection />
          <PricingSection />
          <CTASection />
        </main>
      </div>
    </LazyMotion>
  );
}
