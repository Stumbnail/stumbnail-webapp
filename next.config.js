/** @type {import('next').NextConfig} */
const nextConfig = {
  // Target modern browsers to reduce legacy JavaScript polyfills (~10 KiB savings)
  // This configuration tells Next.js to generate code for modern browsers only
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: ['lucide-react', 'gsap'],
  },
  // Compiler options for production optimization
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
