import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // .next ของแอปเดิมที่เก็บไว้กู้โค้ด ไม่ใช่ซอร์สของโปรเจกต์นี้
    ".recovery-old-app/**",
  ]),
]);

export default eslintConfig;
