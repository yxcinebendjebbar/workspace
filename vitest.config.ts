import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so tests skip the React and Tailwind
// plugins and run against plain TypeScript.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
