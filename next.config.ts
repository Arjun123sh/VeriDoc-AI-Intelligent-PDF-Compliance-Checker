import type { NextConfig } from "next";

const nextConfig: NextConfig & Record<string, unknown> = {
  /* config options here */
      experimental: {
        serverComponentsExternalPackages: ['pdf2json'],
    },
    
    
    swcMinify: true,
    compress: true,
    reactStrictMode: true,
};

export default nextConfig;
