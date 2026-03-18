import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
  resolve: {
    // REQUIRED: Vitest does not read tsconfig.json paths.
    // Without this every @/* import fails with "Cannot find module".
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: {
    // Next.js injects NEXT_PUBLIC_* only during its own build.
    // Set explicitly so apiClient.ts has a deterministic test base URL.
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify("http://test-api"),
  },
});
