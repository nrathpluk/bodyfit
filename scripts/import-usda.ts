/**
 * นำเข้าอาหารจากไฟล์ SR Legacy ของ USDA FoodData Central
 *
 * ใช้: npm run import:usda -- <path ของไฟล์ json>
 * โหลดไฟล์: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2021-10-28.zip
 * (12 MB บีบอัด / 201 MB เมื่อแตกไฟล์ — ไม่เก็บใน repo)
 *
 * สคริปต์นี้ไม่มีกฎการแปลงข้อมูลของตัวเอง ทุกอย่างอยู่ใน src/lib/usda.ts ซึ่งมีเทสต์ครอบ
 * รันซ้ำได้ (upsert ตาม source + source_ref) จึงเติมข้อมูลรอบใหม่ทับของเดิมได้เสมอ
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { foods, foodServings } from "../src/db/schema";
import { THAI_NAMES } from "../src/db/thai-names";
import { mapUsdaFood, type UsdaFood } from "../src/lib/usda";

type UsdaPortion = {
  gramWeight?: number;
  modifier?: string;
  amount?: number;
  measureUnit?: { name?: string };
};

const CHUNK = 500;

function servingLabel(portion: UsdaPortion): string | null {
  const unit = portion.measureUnit?.name;
  const parts = [
    portion.amount && portion.amount !== 1 ? String(portion.amount) : null,
    unit && unit !== "undetermined" ? unit : null,
    portion.modifier?.trim() || null,
  ].filter(Boolean);
  const label = parts.join(" ").trim();
  return label.length > 0 && label.length <= 80 ? label : null;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error("ต้องระบุ path ของไฟล์ json — npm run import:usda -- <path>");

  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("ไม่ได้ตั้งค่า DIRECT_URL หรือ DATABASE_URL");

  console.log("กำลังอ่านไฟล์…");
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as { SRLegacyFoods: UsdaFood[] };
  const source = raw.SRLegacyFoods;
  console.log(`อ่านได้ ${source.length.toLocaleString("th-TH")} รายการ`);

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);

  const matchedThai = new Set<string>();
  const rows: (typeof foods.$inferInsert)[] = [];
  const portionsByRef = new Map<string, UsdaPortion[]>();
  let skipped = 0;

  for (const food of source) {
    const mapped = mapUsdaFood(food);
    if (!mapped) {
      skipped += 1;
      continue;
    }
    const thai = THAI_NAMES[mapped.name];
    if (thai) matchedThai.add(mapped.name);

    rows.push({
      name: mapped.name,
      nameTh: thai ?? null,
      source: "usda",
      sourceRef: mapped.sourceRef,
      kcalPer100g: mapped.kcalPer100g,
      proteinPer100g: mapped.proteinPer100g,
      carbPer100g: mapped.carbPer100g,
      fatPer100g: mapped.fatPer100g,
      micros: mapped.micros,
      // SR Legacy เป็นค่าที่วิเคราะห์ในห้องแล็บ ถือว่าตรวจสอบแล้ว
      verified: true,
    });

    const portions = ((food as { foodPortions?: UsdaPortion[] }).foodPortions ?? []).filter(
      (portion) => (portion.gramWeight ?? 0) > 0,
    );
    if (portions.length > 0) portionsByRef.set(mapped.sourceRef, portions.slice(0, 6));
  }

  console.log(`แปลงสำเร็จ ${rows.length.toLocaleString("th-TH")} · ข้าม ${skipped} (มาโครไม่ครบ)`);

  const missingThai = Object.keys(THAI_NAMES).filter((name) => !matchedThai.has(name));
  if (missingThai.length > 0) {
    console.warn(`\nชื่อไทยที่หาคู่ใน USDA ไม่เจอ ${missingThai.length} รายการ:`);
    for (const name of missingThai) console.warn(`  - ${name}`);
  }

  console.log("\nกำลังบันทึกอาหาร…");
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db
      .insert(foods)
      .values(chunk)
      .onConflictDoUpdate({
        target: [foods.source, foods.sourceRef],
        // excluded = แถวที่กำลังจะ insert — เขียนทับค่าที่ import รอบก่อนไว้
        set: {
          name: sql`excluded.name`,
          nameTh: sql`excluded.name_th`,
          kcalPer100g: sql`excluded.kcal_per_100g`,
          proteinPer100g: sql`excluded.protein_per_100g`,
          carbPer100g: sql`excluded.carb_per_100g`,
          fatPer100g: sql`excluded.fat_per_100g`,
          micros: sql`excluded.micros`,
        },
      });
    process.stdout.write(`\r  ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  console.log("\nบันทึกอาหารเสร็จ");

  const saved = await db.select({ id: foods.id, ref: foods.sourceRef }).from(foods);
  const idByRef = new Map(saved.map((row) => [row.ref, row.id]));

  const servingRows: (typeof foodServings.$inferInsert)[] = [];
  for (const [ref, portions] of portionsByRef) {
    const foodId = idByRef.get(ref);
    if (!foodId) continue;
    const seen = new Set<string>();
    for (const portion of portions) {
      const label = servingLabel(portion);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      servingRows.push({ foodId, label, grams: portion.gramWeight!, isDefault: seen.size === 1 });
    }
  }

  console.log(`กำลังบันทึกหน่วยครัว ${servingRows.length.toLocaleString("th-TH")} รายการ…`);
  for (let i = 0; i < servingRows.length; i += CHUNK) {
    await db
      .insert(foodServings)
      .values(servingRows.slice(i, i + CHUNK))
      .onConflictDoNothing();
    process.stdout.write(`\r  ${Math.min(i + CHUNK, servingRows.length)}/${servingRows.length}`);
  }

  console.log("\nเสร็จแล้ว");
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
