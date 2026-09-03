/**
 * นำเข้าคลังท่าออกกำลังกายจาก free-exercise-db (public domain, 876 ท่า)
 *
 * ใช้: npm run import:exercises -- <path ของไฟล์ json>
 * โหลดไฟล์: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
 * (~1 MB ไม่เก็บใน repo เพราะเป็นข้อมูลต้นทางที่โหลดใหม่ได้ตลอด)
 *
 * เข้าเป็นท่า "คลังกลาง" (user_id = null) ทุกคนเห็นเหมือนกัน
 * รันซ้ำได้ upsert ตาม source + source_ref
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { exercises } from "../src/db/schema";
import { mapExercise, type RawExercise } from "../src/lib/exercise-catalog";

const CHUNK = 500;
const SOURCE = "free-exercise-db";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error("ต้องระบุ path ของไฟล์ json — npm run import:exercises -- <path>");

  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("ไม่ได้ตั้งค่า DIRECT_URL หรือ DATABASE_URL");

  const raw = JSON.parse(readFileSync(filePath, "utf8")) as RawExercise[];
  console.log(`อ่านได้ ${raw.length.toLocaleString("th-TH")} รายการ`);

  const rows: (typeof exercises.$inferInsert)[] = [];
  let skipped = 0;
  const seen = new Set<string>();

  for (const item of raw) {
    const mapped = mapExercise(item);
    if (!mapped) {
      skipped += 1;
      continue;
    }
    // ชื่อซ้ำในคลังกลางไม่ได้ (มีดัชนีบังคับอยู่) ตัดออกตั้งแต่ในหน่วยความจำ
    if (seen.has(mapped.name)) {
      skipped += 1;
      continue;
    }
    seen.add(mapped.name);

    rows.push({
      userId: null,
      name: mapped.name,
      equipment: mapped.equipment,
      category: mapped.category,
      primaryMuscle: mapped.primaryMuscle,
      level: mapped.level,
      source: SOURCE,
      sourceRef: mapped.sourceRef,
    });
  }

  console.log(`แปลงสำเร็จ ${rows.length.toLocaleString("th-TH")} · ข้าม ${skipped} (ชื่อซ้ำหรือข้อมูลไม่ครบ)`);

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);

  for (let i = 0; i < rows.length; i += CHUNK) {
    await db
      .insert(exercises)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoUpdate({
        target: [exercises.source, exercises.sourceRef],
        // ดัชนีที่กันซ้ำเป็นแบบมีเงื่อนไข (WHERE source_ref IS NOT NULL)
        // Postgres จะเลือกดัชนีนั้นให้ได้ก็ต่อเมื่อเราบอกเงื่อนไขเดียวกันกลับไป
        targetWhere: sql`source_ref IS NOT NULL`,
        set: {
          name: sql`excluded.name`,
          equipment: sql`excluded.equipment`,
          category: sql`excluded.category`,
          primaryMuscle: sql`excluded.primary_muscle`,
          level: sql`excluded.level`,
        },
      });
    process.stdout.write(`\r  ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }

  console.log("\nเสร็จแล้ว");
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
