import type { NextConfig } from 'next';

const remotePatterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = [];
if (process.env.SUPABASE_URL) {
  remotePatterns.push({
    protocol: 'https',
    hostname: new URL(process.env.SUPABASE_URL).hostname,
    pathname: '/storage/v1/object/public/**',
  });
}

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self' https://accept.paymob.com" },
];

const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [70, 80, 90],
    deviceSizes: [480, 828, 1200, 1920],
    imageSizes: [96, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns,
  },
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/(images|brand)/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=2592000' }] },
    ];
  },
};
export default config;
