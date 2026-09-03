import type { ActivityLevel, Goal, Micros, Sex } from "./types";

/**
 * สูตรพลังงานและสารอาหาร — ชั้น pure ห้ามแตะฐานข้อมูล
 * ทุกฟังก์ชันในไฟล์นี้ต้องมี unit test ครอบ (nutrition.test.ts)
 */

/** ค่าพลังงานต่อกรัมของสารอาหารหลัก (Atwater) */
export const KCAL_PER_GRAM = { protein: 4, carb: 4, fat: 9 } as const;

/**
 * ตัวคูณกิจกรรมชุดคลาสสิก (Harris-Benedict)
 *
 * แอปนี้ไม่ได้บันทึกการออกกำลังกายแยก พลังงานจากการออกกำลังกายจึงต้องรวมอยู่ในตัวคูณนี้
 * (ถ้าวันหลังเพิ่มการบันทึกเซสชันออกกำลังกายแล้วบวกพลังงานเข้าไปอีก จะนับซ้ำ
 *  ต้องหรี่ตัวคูณชุดนี้ลงพร้อมกัน)
 */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "นั่งทำงานเป็นหลัก แทบไม่ออกกำลังกาย",
  light: "ออกกำลังกายเบา 1–3 วัน/สัปดาห์",
  moderate: "ออกกำลังกายปานกลาง 3–5 วัน/สัปดาห์",
  active: "ออกกำลังกายหนัก 6–7 วัน/สัปดาห์",
  very_active: "ออกกำลังกายหนักมาก หรือใช้แรงงานทั้งวัน",
};

/** พลังงานสะสมต่อไขมัน 1 กก. — ใช้แปลงเป้าหมาย กก./สัปดาห์ เป็นส่วนต่างแคลต่อวัน */
export const KCAL_PER_KG_FAT = 7700;

/**
 * ขั้นต่ำที่ยอมให้ตั้งเป้า ต่อให้ผู้ใช้ขอลดเร็วแค่ไหน
 * ต่ำกว่านี้เสี่ยงขาดสารอาหารและคุมได้ไม่นานพอ (แนวเดียวกับที่ MyFitnessPal ใช้)
 */
export const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };

/** BMR ด้วยสูตร Mifflin-St Jeor — แม่นกว่า Harris-Benedict ในคนยุคปัจจุบัน */
export function bmr(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  return base + (input.sex === "male" ? 5 : -161);
}

export function tdee(bmrValue: number, activity: ActivityLevel): number {
  return bmrValue * ACTIVITY_MULTIPLIERS[activity];
}

/** สัดส่วนโปรตีน (ก./กก. น้ำหนักตัว) — ตอนลดน้ำหนักต้องสูงขึ้นเพื่อรักษามวลกล้ามเนื้อ */
const PROTEIN_G_PER_KG: Record<Goal, number> = { lose: 2.0, maintain: 1.6, gain: 1.8 };

/** สัดส่วนพลังงานจากไขมัน — ต่ำกว่านี้กระทบฮอร์โมนและความอิ่ม */
const FAT_ENERGY_RATIO = 0.25;

export type TargetBasis = {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: Goal;
  rateKgPerWeek: number;
  bmr: number;
  tdee: number;
  /** true เมื่อเป้าที่ขอต่ำกว่าขั้นต่ำและถูกดันขึ้นมาที่ MIN_KCAL */
  floored: boolean;
  formula: "mifflin-st-jeor";
  /** ที่มาของค่า TDEE ที่ใช้จริง — "formula" คือจากสูตรล้วน */
  tdeeSource?: "formula" | "blended";
  /** 0–1 ความมั่นใจในค่าที่วัดได้จากข้อมูลจริงของผู้ใช้ */
  tdeeConfidence?: number;
};

export type DailyTarget = {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  basis: TargetBasis;
};

/**
 * เป้าหมายรายวันจากโปรไฟล์ + น้ำหนักล่าสุด
 *
 * ผลลัพธ์ถูกตรึงลง daily_targets วันละครั้ง (ดู CLAUDE.md) — ห้ามเรียกสดตอนแสดงผลย้อนหลัง
 */
export function dailyTarget(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  activity: ActivityLevel;
  goal: Goal;
  /** บวก = ตั้งใจขึ้น, ลบ = ตั้งใจลง; goal maintain จะถูกบังคับเป็น 0 */
  rateKgPerWeek: number;
  /**
   * ใช้ค่านี้แทน TDEE จากสูตร เมื่อมีข้อมูลจริงพอจะประมาณได้แม่นกว่า
   * (ดู lib/adaptive.ts) ส่วนที่เหลือของสูตรทำงานเหมือนเดิมทุกอย่าง
   */
  tdeeOverride?: { tdee: number; source: "formula" | "blended"; confidence: number };
}): DailyTarget {
  const bmrValue = bmr(input);
  const tdeeValue = input.tdeeOverride?.tdee ?? tdee(bmrValue, input.activity);

  const rate = input.goal === "maintain" ? 0 : input.rateKgPerWeek;
  const raw = tdeeValue + (rate * KCAL_PER_KG_FAT) / 7;

  const floor = MIN_KCAL[input.sex];
  const floored = raw < floor;
  const kcal = Math.round((floored ? floor : raw) / 10) * 10;

  const protein = Math.round(input.weightKg * PROTEIN_G_PER_KG[input.goal]);
  const fat = Math.round((kcal * FAT_ENERGY_RATIO) / KCAL_PER_GRAM.fat);
  // คาร์บรับส่วนที่เหลือ เพื่อให้ผลรวมมาโครกลับมาเท่ากับ kcal เสมอ
  const carbKcal = kcal - protein * KCAL_PER_GRAM.protein - fat * KCAL_PER_GRAM.fat;
  const carb = Math.max(0, Math.round(carbKcal / KCAL_PER_GRAM.carb));

  return {
    kcal,
    protein,
    carb,
    fat,
    basis: {
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      ageYears: input.ageYears,
      sex: input.sex,
      activity: input.activity,
      goal: input.goal,
      rateKgPerWeek: rate,
      bmr: Math.round(bmrValue),
      tdee: Math.round(tdeeValue),
      floored,
      formula: "mifflin-st-jeor",
      tdeeSource: input.tdeeOverride?.source ?? "formula",
      tdeeConfidence: input.tdeeOverride?.confidence ?? 0,
    },
  };
}

export type Nutrients = {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  micros: Micros;
};

export type Per100g = {
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  micros: Micros;
};

/** ปัดทศนิยม 2 ตำแหน่ง — พอสำหรับกรัมของสารอาหาร และกัน error สะสมจาก float */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** สเกลค่าต่อ 100 ก. ให้เป็นค่าตามน้ำหนักที่กินจริง */
export function scaleTo(food: Per100g, grams: number): Nutrients {
  const factor = grams / 100;
  const micros: Micros = {};
  for (const [key, value] of Object.entries(food.micros)) {
    micros[key] = round2(value * factor);
  }
  return {
    kcal: round2(food.kcalPer100g * factor),
    protein: round2(food.proteinPer100g * factor),
    carb: round2(food.carbPer100g * factor),
    fat: round2(food.fatPer100g * factor),
    micros,
  };
}

/**
 * รวมยอดสารอาหาร
 *
 * ไมโครรวมเฉพาะคีย์ที่มีข้อมูลจริง — อาหารที่ไม่ประกาศค่านั้นถือว่า "ไม่รู้" ไม่ใช่ 0
 * ผลรวมจึงเป็นค่า "อย่างน้อยเท่านี้" ต้องบอกผู้ใช้ตามนั้นเวลาแสดงผล
 */
export function sumNutrients(items: Nutrients[]): Nutrients {
  const total: Nutrients = { kcal: 0, protein: 0, carb: 0, fat: 0, micros: {} };
  for (const item of items) {
    total.kcal += item.kcal;
    total.protein += item.protein;
    total.carb += item.carb;
    total.fat += item.fat;
    for (const [key, value] of Object.entries(item.micros)) {
      total.micros[key] = (total.micros[key] ?? 0) + value;
    }
  }
  total.kcal = round2(total.kcal);
  total.protein = round2(total.protein);
  total.carb = round2(total.carb);
  total.fat = round2(total.fat);
  for (const key of Object.keys(total.micros)) total.micros[key] = round2(total.micros[key]);
  return total;
}

/**
 * พลังงานที่คำนวณจากมาโคร เทียบกับค่า kcal ที่ประกาศไว้
 * ใช้ตรวจข้อมูลนำเข้า: ถ้าคลาดเคลื่อนเกิน ~20% แปลว่าแถวนั้นน่าจะกรอกผิดหน่วย
 */
export function atwaterKcal(macros: { protein: number; carb: number; fat: number }): number {
  return (
    macros.protein * KCAL_PER_GRAM.protein +
    macros.carb * KCAL_PER_GRAM.carb +
    macros.fat * KCAL_PER_GRAM.fat
  );
}
