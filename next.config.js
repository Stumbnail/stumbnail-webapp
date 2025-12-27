/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint during production builds (allows deployment with warnings)
  // Linting still runs during development
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimize bundle size
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: ['lucide-react'],
  },
  // Compiler options for production optimization
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Allow external images from various sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/**',
      },
    ],
    // Optimize image formats
    formats: ['image/avif', 'image/webp'],
    // Reduce image sizes
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // Modularize imports for firebase
  modularizeImports: {
    'firebase/auth': {
      transform: 'firebase/auth',
      skipDefaultConversion: true,
    },
    'firebase/app': {
      transform: 'firebase/app',
      skipDefaultConversion: true,
    },
  },
};

module.exports = nextConfig;
