import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/securityHeaders";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          isDev: process.env.NODE_ENV !== "production",
          // CSP は nonce を使うため、リクエストごとに middleware で付ける
          omitCsp: true,
        }),
      },
    ];
  },
};

export default nextConfig;
