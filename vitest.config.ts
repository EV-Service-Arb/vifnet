import { fileURLToPath } from "node:url";
import { buildEnv } from "./src/shared/lib/sites-tools/next-config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The marker throws outside a React Server bundle; tests call the
      // server modules directly, which is the point.
      "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Through Vite rather than Node, so the alias above reaches kitstart's own
    // `server-only` imports (its `./server` entry, which the webhook test uses);
    // and experiments' `./next`, whose bare `next/headers` Node's ESM cannot resolve.
    server: { deps: { inline: [/@evinvest\/kitstart/, /@evinvest\/experiments/] } },
    // The facts `next.config.ts` inlines, so the site reads the card here too.
    env: buildEnv(fileURLToPath(new URL(".", import.meta.url))),
  },
});
