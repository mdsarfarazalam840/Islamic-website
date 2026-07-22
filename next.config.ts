import type { NextConfig } from "next";

// On GitHub Pages this ships as a *project* site served from a subpath
// (https://<owner>.github.io/<repo>/), so every asset and route must be
// prefixed with that repo path. The deploy workflow sets NEXT_PUBLIC_BASE_PATH
// (e.g. "/Islamic-website"); local `npm run dev` leaves it unset so the app
// still serves from "/".
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
