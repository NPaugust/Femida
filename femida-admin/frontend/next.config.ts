import type { NextConfig } from "next";
const { i18n } = require('./next-i18next.config');

const nextConfig: NextConfig = {
  i18n,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* config options here */
};

export default nextConfig;
