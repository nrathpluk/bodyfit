import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { foods, foodServings } from "@/db/schema";
import { getFoodWithServings, type FoodWithServings } from "./foods";
import { mapOffProduct, type OffResponse } from "./off";

const OFF_ENDPOINT = "https://world.openfoodfacts.org/api/v2/product";

/** Open Food Facts ขอให้ระบุตัวตนของแอปที่เรียก จะได้ติดต่อกลับได้ถ้ามีปัญหา */
const USER_AGENT = "Bodymefit/0.1 (https://github.com/nrathpluk/bodyfit)";

/** บาร์โค้ดสินค้าเป็นตัวเลข 8–14 หลัก (EAN-8 ถึง GTIN-14) */
export function isValidBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code);
}

export type BarcodeResult =
  | { status: "found"; food: FoodWithServings; fromCache: boolean }
  | { status: "not_found" }
  | { status: "unreliable" }
  | { status: "unavailable" };

/**
 * หาอาหารจากบาร์โค้ด — ดูในคลังของเราก่อน ถ้าไม่มีค่อยถาม Open Food Facts
 *
 * ที่ไม่ import ฐานข้อมูล OFF ทั้งก้อนมาเก็บไว้ เพราะมีสินค้าเป็นล้านรายการ
 * ซึ่งคนไทยหนึ่งคนจะสแกนจริงไม่กี่ร้อยชิ้น เก็บตอนสแกนจึงคุ้มกว่ามาก
 * และผลที่ดึงมาแล้วจะอยู่ในคลังถาวร ครั้งต่อไปไม่ต้องยิงเน็ตอีก
 */
export async function findByBarcode(code: string, userId: string): Promise<BarcodeResult> {
  const [cached] = await db.select().from(foods).where(eq(foods.barcode, code)).limit(1);
  if (cached) {
    const food = await getFoodWithServings(cached.id, userId);
    if (food) return { status: "found", food, fromCache: true };
  }

  let payload: OffResponse;
  try {
    const response = await fetch(`${OFF_ENDPOINT}/${code}.json`, {
      headers: { "User-Agent": USER_AGENT },
      // OFF ล่มหรือช้าไม่ควรทำให้หน้าบันทึกอาหารค้าง — ผู้ใช้กรอกเองต่อได้
      signal: AbortSignal.timeout(6000),
    });
    if (response.status === 404) return { status: "not_found" };
    if (!response.ok) return { status: "unavailable" };
    payload = (await response.json()) as OffResponse;
  } catch {
    return { status: "unavailable" };
  }

  if (!payload.product || payload.status === 0) return { status: "not_found" };

  const mapped = mapOffProduct(payload, code);
  // เจอสินค้าแต่ข้อมูลโภชนาการไม่ครบหรือไม่สมเหตุสมผล — ต่างจาก "ไม่เจอ"
  if (!mapped) return { status: "unreliable" };

  const [inserted] = await db
    .insert(foods)
    .values({
      name: mapped.name,
      nameTh: mapped.nameTh,
      brand: mapped.brand,
      barcode: mapped.barcode,
      source: "off",
      sourceRef: mapped.barcode,
      kcalPer100g: mapped.kcalPer100g,
      proteinPer100g: mapped.proteinPer100g,
      carbPer100g: mapped.carbPer100g,
      fatPer100g: mapped.fatPer100g,
      micros: mapped.micros,
      // ข้อมูลจากผู้ใช้ทั่วโลก ไม่ใช่ค่าจากห้องแล็บ
      verified: false,
    })
    .onConflictDoUpdate({
      target: [foods.source, foods.sourceRef],
      set: {
        name: mapped.name,
        kcalPer100g: mapped.kcalPer100g,
        proteinPer100g: mapped.proteinPer100g,
        carbPer100g: mapped.carbPer100g,
        fatPer100g: mapped.fatPer100g,
        micros: mapped.micros,
      },
    })
    .returning();

  if (mapped.serving) {
    await db
      .insert(foodServings)
      .values({
        foodId: inserted.id,
        label: mapped.serving.label,
        grams: mapped.serving.grams,
        isDefault: true,
      })
      .onConflictDoNothing();
  }

  const food = await getFoodWithServings(inserted.id, userId);
  return food ? { status: "found", food, fromCache: false } : { status: "unavailable" };
}
