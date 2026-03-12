import type { NextConfig } from "next";

const remotePatterns = [];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (supabaseUrl) {
  const url = new URL(supabaseUrl);
  remotePatterns.push({
    protocol: url.protocol.replace(":", "") as "https",
    hostname: url.hostname,
    pathname: "/storage/v1/object/sign/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
