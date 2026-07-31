import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.spec.ts"],
  },
  plugins: [
    // Decorator metadata for NestJS classes pulled in by the service under test.
    swc.vite({ module: { type: "es6" } }),
  ],
});
