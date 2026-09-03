import { USDA_NUMBER_TO_MICRO } from "./micros";
import type { Micros } from "./types";
import { convertUnit, unitOf } from "./units";

/**
 * แปลงข้อมูลดิบจาก USDA FoodData Central → รูปแบบของเรา
 *
 * ชั้น pure ล้วน ไม่ยิงเน็ตและไม่แตะฐานข้อมูล เพื่อให้เทสต์ตรึงกฎการแปลงได้
 * (สคริปต์ import เป็นแค่คนดึงข้อมูลมาป้อนให้ฟังก์ชันนี้)
 *
 * ค่าใน SR Legacy และ Foundation Foods อ้าง "ต่อ 100 กรัม" อยู่แล้ว
 * ตรงกับที่ตาราง foods ต้องการ จึงไม่ต้องสเกลซ้ำ
 */

/** รหัสสารอาหารหลักของ USDA */
const USDA_ENERGY_KCAL = "208";
const USDA_PROTEIN = "203";
const USDA_FAT = "204";
const USDA_CARB = "205";

export type UsdaNutrient = {
  /** รูปแบบจาก endpoint /food/{id} */
  nutrient?: { number?: string; unitName?: string };
  amount?: number;
  /** รูปแบบจาก endpoint /foods/search (แบนกว่า) */
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
};

export type UsdaFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  brandName?: string;
  foodNutrients?: UsdaNutrient[];
};

export type MappedFood = {
  sourceRef: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  micros: Micros;
};

function readNutrient(item: UsdaNutrient): { number?: string; unit?: string; amount?: number } {
  return {
    number: item.nutrient?.number ?? item.nutrientNumber,
    unit: (item.nutrient?.unitName ?? item.unitName)?.toLowerCase(),
    amount: item.amount ?? item.value,
  };
}

/**
 * คืน null เมื่ออาหารรายการนั้นไม่มีค่าพลังงานหรือมาโครครบ
 * แถวที่มาโครไม่ครบใช้คำนวณอะไรไม่ได้ และจะไปโผล่ในผลค้นหาให้ผู้ใช้เลือกโดยเปล่าประโยชน์
 */
export function mapUsdaFood(food: UsdaFood): MappedFood | null {
  const macros = new Map<string, number>();
  const micros: Micros = {};

  for (const item of food.foodNutrients ?? []) {
    const { number, unit, amount } = readNutrient(item);
    if (!number || amount === undefined || !Number.isFinite(amount)) continue;

    if ([USDA_ENERGY_KCAL, USDA_PROTEIN, USDA_FAT, USDA_CARB].includes(number)) {
      // พลังงานบางแถวมาเป็น kJ ด้วย — เอาเฉพาะ kcal
      if (number === USDA_ENERGY_KCAL && unit !== "kcal") continue;
      macros.set(number, amount);
      continue;
    }

    const microKey = USDA_NUMBER_TO_MICRO[number];
    if (!microKey || !unit) continue;
    const converted = convertUnit(amount, unit, unitOf(microKey));
    if (converted === null) continue;
    micros[microKey] = Math.round(converted * 100) / 100;
  }

  const kcal = macros.get(USDA_ENERGY_KCAL);
  const protein = macros.get(USDA_PROTEIN);
  const carb = macros.get(USDA_CARB);
  const fat = macros.get(USDA_FAT);
  if (kcal === undefined || protein === undefined || carb === undefined || fat === undefined) {
    return null;
  }

  return {
    sourceRef: String(food.fdcId),
    name: food.description.trim(),
    brand: food.brandName?.trim() || null,
    kcalPer100g: kcal,
    proteinPer100g: protein,
    carbPer100g: carb,
    fatPer100g: fat,
    micros,
  };
}
