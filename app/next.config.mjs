/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // darwin.market/qorechain in production; the root locally
  basePath,
};
export default nextConfig;
