import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // db:generate ไม่ใช้ค่านี้ จึงปล่อยว่างได้เวลาทำงานออฟไลน์
    url: process.env.DATABASE_URL ?? "",
  },
});
