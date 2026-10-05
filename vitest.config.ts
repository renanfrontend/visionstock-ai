import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Missions and reports depend on the local calendar day; pin it for deterministic runs.
process.env.TZ = "America/Sao_Paulo";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
