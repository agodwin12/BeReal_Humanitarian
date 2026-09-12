import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Media library photos: the local API in development, Cloudflare R2 (or
    // any HTTPS host) once the bucket is configured.
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "**" },
    ],
    // Next refuses to optimize images served from a private IP (SSRF guard).
    // Only needed when the API runs on localhost, i.e. a production-mode run
    // on one machine — never on a real server, where media has a public host.
    ...(process.env.ALLOW_LOCAL_IMAGE_HOST === "true" ? { dangerouslyAllowLocalIP: true } : {}),
  },
};

export default withNextIntl(nextConfig);
