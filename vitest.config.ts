import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "next/font/local": path.resolve(__dirname, "node_modules/next/font/local/index.js"),
      "next/font/google": path.resolve(__dirname, "node_modules/next/font/google/index.js"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
    server: {
      deps: {
        inline: ["geist"],
      },
    },
  },
});
