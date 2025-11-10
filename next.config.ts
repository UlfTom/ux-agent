// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'experimental' ist leer oder nicht vorhanden

  // HIER ist die korrekte Position
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://192.168.178.71:3000',
  ],
};
export default nextConfig;