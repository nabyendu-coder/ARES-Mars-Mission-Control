import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ["**/public/mission-control/data/ares-data.js"],
    },
    proxy: {
      "/gdal": {
        target: "http://127.0.0.1:8765",
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/gdal/, ""),
      },
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
