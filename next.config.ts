import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig =
  process.env.BUILD_STANDALONE === "1"
    ? { output: "standalone" }
    : {};

export default withNextIntl(nextConfig);
