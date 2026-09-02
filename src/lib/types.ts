/** ชนิดข้อมูลที่ใช้ร่วมกันทั้ง client และ server — ไฟล์นี้ต้องไม่ import อะไรเลย */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodSource = "usda" | "thai" | "off" | "custom";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: "มื้อเช้า",
  lunch: "มื้อกลางวัน",
  dinner: "มื้อเย็น",
  snack: "ของว่าง",
};

/**
 * ค่าไมโครต่อหน่วยที่กำหนด หน่วยตาม MICRO_UNITS
 * คีย์ที่ "ไม่มี" แปลว่าไม่มีข้อมูล ไม่ใช่ศูนย์ — อย่าเติม 0 ให้ครบคีย์
 */
export type Micros = Record<string, number>;
