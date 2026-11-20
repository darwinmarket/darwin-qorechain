/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Served at docs.darwin.market/qorechain (a rewrite in the main docs project points here).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '/qorechain',
  async redirects() {
    return [
      { source: '/', destination: '/overview', permanent: false },
      { source: '/docs', destination: '/overview', permanent: true },
      { source: '/docs/:path*', destination: '/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
