import path from "node:path"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

/**
 * Integration tests against the `demo-clag` emulators only. Run them with
 * `npm run test:emulator`, which starts and stops the emulators itself.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "tests/emulator/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/emulator/**/*.test.ts"],
    setupFiles: ["./tests/emulator/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
