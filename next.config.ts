import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack configuration to handle build issues
  webpack: (config, { dev, isServer }) => {
    // Fix for WalletConnect dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Handle pino-pretty in client-side builds
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "pino-pretty": false,
      };
    }

    return config;
  },

  // Experimental features with style registry workaround
  experimental: {
    // Enable modern bundling
    optimizePackageImports: ["@walletconnect/ethereum-provider"],
    // Ignore style registry errors during build
    esmExternals: "loose",
    // Disable problematic static workers
    webVitalsAttribution: ["CLS", "LCP"],
  },

  // Disable static optimization for error pages to prevent style registry issues
  generateEtags: false,
  poweredByHeader: false,

  // Handle CSS-in-JS compatibility
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },

  // TypeScript configuration
  typescript: {
    // Don't fail build on type errors during development
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Don't fail build on lint errors during development
    ignoreDuringBuilds: false,
  },

  // Image optimization
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    NEXT_PUBLIC_AVALANCHE_FUJI_RPC: process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC,
    NEXT_PUBLIC_ETH_MAINNET_RPC: process.env.NEXT_PUBLIC_ETH_MAINNET_RPC,
  },
};

export default nextConfig;
