import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/env";
import * as schema from "./schema";

type Db = ReturnType<typeof create>;

function create() {
  const client = postgres(serverEnv().DATABASE_URL, {
    // transaction pooler ของ Supabase (port 6543) ไม่รองรับ prepared statement — ห้ามเอาออก
    prepare: false,
    max: 5,
  });
  return drizzle(client, { schema });
}

let instance: Db | null = null;

/**
 * ต่อฐานข้อมูลตอนเรียกเมธอดแรก ไม่ใช่ตอน import (เหตุผลเดียวกับ serverEnv())
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    instance ??= create();
    return Reflect.get(instance, prop, receiver);
  },
});
