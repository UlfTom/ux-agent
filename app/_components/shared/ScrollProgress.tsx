// app/_components/shared/ScrollProgress.tsx
"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <motion.div
            className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary origin-left z-[100]"
            style={{ scaleX }}
        />
    );
}
