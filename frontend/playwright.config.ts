import path from "path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: [
    {
      // Next.js dev server — cwd defaults to frontend/ (where this config lives)
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
    },
    {
      // FastAPI backend — must be started from repo root
      command: "uvicorn main:app --port 8001",
      url: "http://localhost:8001/api/health",
      reuseExistingServer: !process.env.CI,
      env: { PYTHONPATH: path.resolve(__dirname, "../backend") },
      cwd: path.resolve(__dirname, ".."),
    },
  ],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
