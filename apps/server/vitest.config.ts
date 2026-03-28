import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Allow .js extension imports (NodeNext TS convention) to resolve to .ts files
    alias: {
      // vitest handles .js → .ts transparently via its resolver
    },
  },
  resolve: {
    // Let vitest resolve .js imports to their .ts source during tests
    extensionOrder: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
});
