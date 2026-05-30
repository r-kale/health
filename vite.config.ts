import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// On GitHub Pages the app is served from https://<user>.github.io/health/,
// so production assets need the "/health/" base. Dev stays at "/".
export default defineConfig(({ command }) => {
  const base = command === "build" ? "/health/" : "/";
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg"],
        manifest: {
          name: "Gym Tracker",
          short_name: "Gym",
          description: "Intelligent, machine-aware gym tracker for the whole family.",
          theme_color: "#0f172a",
          background_color: "#0f172a",
          display: "standalone",
          start_url: base,
          scope: base,
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
      }),
    ],
  };
});
