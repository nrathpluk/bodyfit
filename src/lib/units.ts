import type { MicroKey } from "./micros";

/**
 * แปลงหน่วยน้ำหนัก — ใช้ร่วมกันทั้งฝั่ง USDA และ Open Food Facts
 *
 * คืน null เมื่อแปลงไม่ได้ (เช่น IU ที่ตัวคูณต่างกันตามชนิดวิตามิน)
 * ปล่อยให้ค่านั้นหายไปดีกว่าใส่ค่าที่ผิดหน่วย เพราะค่าที่ผิดหน่วย
 * จะกลายเป็นตัวเลขที่ผู้ใช้เชื่อแล้วเข้าใจผิด
 */
const SCALE_TO_GRAM: Record<string, number> = {
  g: 1,
  mg: 1e-3,
  "µg": 1e-6,
  ug: 1e-6,
  mcg: 1e-6,
};

export function convertUnit(amount: number, from: string, to: "g" | "mg" | "mcg"): number | null {
  const fromScale = SCALE_TO_GRAM[from];
  if (fromScale === undefined) return null;
  return (amount * fromScale) / SCALE_TO_GRAM[to];
}

/** หน่วยที่คีย์ไมโครประกาศไว้ในชื่อตัวเอง ("sodium_mg" → "mg") */
export function unitOf(key: MicroKey): "g" | "mg" | "mcg" {
  return key.slice(key.lastIndexOf("_") + 1) as "g" | "mg" | "mcg";
}

/**
 * ปัดค่าสารอาหารให้อ่านง่ายโดยไม่ทำให้ค่าน้อย ๆ หายไปเป็นศูนย์
 *
 * วิตามินหลายตัวมีค่าต่ำกว่า 1 หน่วย ถ้าปัดสองตำแหน่งเหมือนกันหมด
 * ค่าอย่าง 0.004 มก. จะกลายเป็น 0 ซึ่งอ่านว่า "ไม่มีสารอาหารตัวนี้"
 */
export function roundNutrient(value: number): number {
  const digits = Math.abs(value) < 1 ? 4 : 2;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
