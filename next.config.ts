import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow opening the dev server from a phone on the same network.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // Keep the dev badge clear of the phone bottom navigation.
  devIndicators: { position: "top-right" },
};

export default nextConfig;
