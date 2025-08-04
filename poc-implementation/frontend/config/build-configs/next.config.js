/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // App directory is now stable in Next.js 14
  },
  images: {
    domains: [
      ...(process.env.NEXT_PUBLIC_ALLOWED_IMAGE_DOMAINS ?
          process.env.NEXT_PUBLIC_ALLOWED_IMAGE_DOMAINS.split(',') :
          ['cdn.solana.com']),
    ],
    unoptimized: process.env.NEXT_PUBLIC_IMAGES_UNOPTIMIZED === 'true',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || (() => {

    })(),
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || (() => {

    })(),
    NEXT_PUBLIC_PROGRAM_ID: process.env.NEXT_PUBLIC_PROGRAM_ID || (() => {

    })(),
  },
};

module.exports = nextConfig;
