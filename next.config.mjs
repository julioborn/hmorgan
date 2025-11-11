/** @type {import('next').NextConfig} */
const nextConfig = {
  // ❌ eliminamos "output: export" porque rompe las API routes
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=(self)" }],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
