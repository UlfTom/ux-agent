// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // (Hier können zukünftige experimentelle Flags hin)
    },

    // Die korrekte Position für die Einstellung (außerhalb von 'experimental')
    allowedDevOrigins: [
        'http://localhost:3000',
        'http://192.168.178.71:3000', // Füge hier deine lokale IP hinzu, falls sie sich ändert
    ],
};

export default nextConfig;