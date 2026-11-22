import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{js,ts}", "test/**/*.test.{js,ts}"],
    globals: true,
    environment: "jsdom",
    environmentOptions: { jsdom: { resources: "usable" } },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts"]
    }
  }
});
