import { MICROS, type MicroKey } from "./micros";
import type { Micros } from "./types";
import { convertUnit, roundNutrient, unitOf } from "./units";

/**
 * แปลงข้อมูลสินค้าจาก Open Food Facts → รูปแบบของเรา
 *
 * ชั้น pure ล้วน ไม่ยิงเน็ต เพื่อให้เทสต์ตรึงกฎการแปลงได้ (แนวเดียวกับ lib/usda.ts)
 *
 * ต่างจาก USDA ตรงที่ OFF เป็นข้อมูลที่ผู้ใช้ทั่วโลกกรอกเอง คุณภาพไม่นิ่ง
 * จึงบันทึกด้วย verified = false และตรวจความสมเหตุสมผลก่อนรับเข้าคลัง
 */

/** OFF ปรับหน่วยของ *_100g เป็นกรัมทั้งหมด ยกเว้นพลังงานที่เป็น kcal */
const OFF_FIELD_BY_MICRO: Record<MicroKey, string> = {
  fiber_g: "fiber_100g",
  sugar_g: "sugars_100g",
  saturated_fat_g: "saturated-fat_100g",
  cholesterol_mg: "cholesterol_100g",
  sodium_mg: "sodium_100g",
  potassium_mg: "potassium_100g",
  calcium_mg: "calcium_100g",
  iron_mg: "iron_100g",
  magnesium_mg: "magnesium_100g",
  zinc_mg: "zinc_100g",
  vitamin_a_mcg: "vitamin-a_100g",
  vitamin_c_mg: "vitamin-c_100g",
  vitamin_d_mcg: "vitamin-d_100g",
  vitamin_b12_mcg: "vitamin-b12_100g",
};

export type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_th?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

export type OffResponse = {
  status?: number;
  product?: OffProduct;
};

export type MappedOffFood = {
  barcode: string;
  name: string;
  nameTh: string | null;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  micros: Micros;
  /** หน่วยบรรจุที่ฉลากระบุ เช่น "1 กระป๋อง (330 มล.)" — null เมื่อฉลากไม่ได้บอก */
  serving: { label: string; grams: number } | null;
};

function num(value: unknown): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * รับเฉพาะสินค้าที่มีมาโครครบและตัวเลขสมเหตุสมผล
 *
 * OFF มีสินค้าที่กรอกผิดหน่วยเยอะ (เช่น ใส่แคลต่อชิ้นในช่องต่อ 100 ก.)
 * ถ้าปล่อยผ่านเข้าคลัง ผู้ใช้จะบันทึกตัวเลขผิดโดยไม่มีทางรู้
 */
export function mapOffProduct(response: OffResponse, barcode: string): MappedOffFood | null {
  const product = response.product;
  if (!product || response.status === 0) return null;

  const nutriments = product.nutriments ?? {};
  const kcal = num(nutriments["energy-kcal_100g"]);
  const protein = num(nutriments.proteins_100g);
  const carb = num(nutriments.carbohydrates_100g);
  const fat = num(nutriments.fat_100g);

  if (kcal === undefined || protein === undefined || carb === undefined || fat === undefined) {
    return null;
  }
  // อาหารจริงไม่มีทางเกิน 900 kcal ต่อ 100 ก. (ไขมันบริสุทธิ์อยู่ที่ 900)
  if (kcal < 0 || kcal > 900) return null;
  if ([protein, carb, fat].some((value) => value < 0 || value > 100)) return null;

  const name = product.product_name?.trim();
  if (!name) return null;

  const micros: Micros = {};
  for (const micro of MICROS) {
    const raw = num(nutriments[OFF_FIELD_BY_MICRO[micro.key]]);
    if (raw === undefined) continue;
    const converted = convertUnit(raw, "g", unitOf(micro.key));
    if (converted === null) continue;
    micros[micro.key] = roundNutrient(converted);
  }

  const servingGrams = num(product.serving_quantity);
  const servingLabel = product.serving_size?.trim();

  return {
    barcode,
    name,
    nameTh: product.product_name_th?.trim() || null,
    brand: product.brands?.split(",")[0]?.trim() || null,
    kcalPer100g: kcal,
    proteinPer100g: protein,
    carbPer100g: carb,
    fatPer100g: fat,
    micros,
    serving:
      servingGrams && servingGrams > 0
        ? { label: servingLabel || "1 หน่วยบรรจุ", grams: servingGrams }
        : null,
  };
}
