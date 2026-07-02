/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["lighthouse", "puppeteer"],
};

export default nextConfig;
