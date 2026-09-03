import { z } from "zod";
import { ageOn, today } from "./dates";

/** zod schema ที่ใช้ร่วมกันทั้ง client และ server — ข้อความ error เป็นภาษาไทย */

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง");

export const profileInputSchema = z.object({
  displayName: z.string().trim().max(60, "ชื่อยาวเกินไป").optional(),
  sex: z.enum(["male", "female"], { message: "กรุณาเลือกเพศ" }),
  birthDate: dateString.refine(
    (value) => {
      const age = ageOn(value);
      return age >= 13 && age <= 100;
    },
    { message: "อายุต้องอยู่ระหว่าง 13–100 ปี" },
  ),
  heightCm: z.coerce
    .number({ message: "กรุณากรอกส่วนสูง" })
    .min(90, "ส่วนสูงต่ำเกินไป")
    .max(250, "ส่วนสูงสูงเกินไป"),
  weightKg: z.coerce
    .number({ message: "กรุณากรอกน้ำหนัก" })
    .min(25, "น้ำหนักต่ำเกินไป")
    .max(400, "น้ำหนักสูงเกินไป"),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"], {
    message: "กรุณาเลือกระดับกิจกรรม",
  }),
  goal: z.enum(["lose", "maintain", "gain"], { message: "กรุณาเลือกเป้าหมาย" }),
  /**
   * อัตราเปลี่ยนน้ำหนักต่อสัปดาห์ — จำกัดที่ 1 กก. ทั้งสองทิศ
   * เร็วกว่านี้ต้องหักแคลเกิน 1,100 kcal/วัน ซึ่งคนส่วนใหญ่ทำไม่ได้จริงและเสียมวลกล้ามเนื้อ
   */
  rateKgPerWeek: z.coerce
    .number()
    .min(-1, "ลดเร็วเกิน 1 กก./สัปดาห์ไม่ปลอดภัย")
    .max(1, "เพิ่มเร็วเกิน 1 กก./สัปดาห์จะกลายเป็นไขมันเป็นหลัก"),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

export const weightInputSchema = z.object({
  logDate: dateString.default(() => today()),
  weightKg: z.coerce.number().min(25, "น้ำหนักต่ำเกินไป").max(400, "น้ำหนักสูงเกินไป"),
  bodyFatPct: z.coerce.number().min(1).max(70).optional(),
});

/**
 * บันทึกมื้ออาหาร — มีสองแบบ
 * 1. เลือกจากคลัง (มี foodId) → server คำนวณสารอาหารเองจากฐานข้อมูล
 *    ไม่รับตัวเลขจาก client เด็ดขาด
 * 2. quick add (ไม่มี foodId) → ผู้ใช้กรอกแคลเอง สำหรับของที่ไม่มีในคลัง
 */
const mealSlot = z.enum(["breakfast", "lunch", "dinner", "snack"], {
  message: "มื้ออาหารไม่ถูกต้อง",
});

export const diaryFoodEntrySchema = z.object({
  entryDate: dateString.default(() => today()),
  meal: mealSlot,
  foodId: z.uuid("รหัสอาหารไม่ถูกต้อง"),
  /** เลือกได้ทางใดทางหนึ่ง: กรัมตรง ๆ หรือหน่วยครัว × จำนวน */
  grams: z.coerce.number().positive("ปริมาณต้องมากกว่า 0").max(5000, "ปริมาณมากเกินไป").optional(),
  servingId: z.uuid().optional(),
  quantity: z.coerce.number().positive().max(50).default(1),
});

export const diaryQuickEntrySchema = z.object({
  entryDate: dateString.default(() => today()),
  meal: mealSlot,
  name: z.string().trim().min(1, "กรุณาใส่ชื่ออาหาร").max(120, "ชื่อยาวเกินไป"),
  kcal: z.coerce.number().min(0, "พลังงานติดลบไม่ได้").max(10000, "พลังงานสูงเกินจริง"),
  protein: z.coerce.number().min(0).max(1000).default(0),
  carb: z.coerce.number().min(0).max(1000).default(0),
  fat: z.coerce.number().min(0).max(1000).default(0),
});

export type DiaryFoodEntryInput = z.infer<typeof diaryFoodEntrySchema>;
export type DiaryQuickEntryInput = z.infer<typeof diaryQuickEntrySchema>;
