// app/_lib/design-tokens.ts

export const gradients = {
    // Primary Brand Gradient - SATURATED (für Text)
    brand: "from-[#6366f1] via-purple-500 to-pink-500",
    brandText: "bg-gradient-to-r from-[#6366f1] via-purple-500 to-pink-500 bg-clip-text text-transparent",

    // Primary Brand Gradient - LIGHT (für Buttons/Flächen)
    brandLight: "from-[#6366f1] via-purple-500/80 to-pink-500/80",
    brandLightHover: "from-primary via-purple-500 to-pink-500",

    // Step-specific Gradients
    blue: "from-blue-500 to-cyan-500",
    purple: "from-purple-500 to-pink-500",
    green: "from-green-500 to-emerald-500",

    // Background Gradients
    blueBg: "from-blue-500/10 via-cyan-500/5 to-background",
    purpleBg: "from-purple-500/10 via-pink-500/5 to-background",
    greenBg: "from-emerald-500/10 via-green-500/5 to-background",

    // Accent Colors
    blueAccent: "bg-blue-500/20 border-blue-500/30",
    purpleAccent: "bg-purple-500/20 border-purple-500/30",
    greenAccent: "bg-green-500/20 border-green-500/30",
} as const;

export const animations = {
    // Easing curves
    smooth: [0.16, 1, 0.3, 1] as const,
    bounce: [0.68, -0.55, 0.265, 1.55] as const,

    // Spring configs
    spring: {
        default: { type: "spring", stiffness: 300, damping: 20 } as const,
        gentle: { type: "spring", stiffness: 100, damping: 15 } as const,
        snappy: { type: "spring", stiffness: 400, damping: 17 } as const,
    }
} as const;
