import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Routes typées: option stabilisée et remontée au niveau racine depuis Next 15.5.
  typedRoutes: true,
};

export default nextConfig;
