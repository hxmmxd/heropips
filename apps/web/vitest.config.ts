import { defineConfig, defaultExclude } from "vitest/config";

/** Unit tests only — Playwright owns e2e/ (running its specs under vitest throws). */
export default defineConfig({
  test: {
    exclude: [...defaultExclude, "e2e/**", ".next/**"],
  },
});
