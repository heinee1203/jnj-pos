import type { NextConfig } from "next";
import { resolve } from "path";

const apiUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@jnj/types"],
  outputFileTracingRoot: resolve(import.meta.dirname, "../../"),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/analytics/daily-sales",
        destination: "/analytics/sales-report?view=daily",
        permanent: true,
      },
      {
        source: "/analytics/monthly-sales",
        destination: "/analytics/sales-report?view=monthly",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
