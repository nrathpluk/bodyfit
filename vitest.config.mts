import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // ชั้น query import "server-only" ซึ่งพังนอก Next — สลับเป็น stub เปล่าตอนเทสต์
      "server-only": path.resolve(import.meta.dirname, "test/stub-server-only.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    environment: "node",
  },
});
