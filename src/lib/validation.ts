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

/** แก้ปริมาณของรายการที่บันทึกแล้ว — server คำนวณสารอาหารใหม่เอง */
export const diaryAmountUpdateSchema = z.object({
  entryId: z.uuid("รหัสรายการไม่ถูกต้อง"),
  grams: z.coerce.number().positive("ปริมาณต้องมากกว่า 0").max(5000, "ปริมาณมากเกินไป").optional(),
  servingId: z.uuid().optional(),
  quantity: z.coerce.number().positive().max(50).default(1),
});

/** แก้รายการที่กรอกแคลเอง */
export const diaryQuickUpdateSchema = diaryQuickEntrySchema
  .omit({ entryDate: true, meal: true })
  .extend({ entryId: z.uuid("รหัสรายการไม่ถูกต้อง") });

/** บันทึกซ้ำจากรายการเดิม */
export const diaryRepeatSchema = z.object({
  sourceEntryId: z.uuid("รหัสรายการไม่ถูกต้อง"),
  entryDate: dateString.default(() => today()),
  meal: mealSlot,
});

export type DiaryAmountUpdateInput = z.infer<typeof diaryAmountUpdateSchema>;
export type DiaryQuickUpdateInput = z.infer<typeof diaryQuickUpdateSchema>;
export type DiaryRepeatInput = z.infer<typeof diaryRepeatSchema>;

/** สูตรของผู้ใช้ */
export const recipeSchema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อสูตร").max(120, "ชื่อยาวเกินไป"),
  servings: z.coerce
    .number()
    .positive("จำนวนที่ต้องมากกว่า 0")
    .max(50, "จำนวนที่มากเกินไป")
    .default(1),
  note: z.string().trim().max(500).optional(),
});

export const recipeItemSchema = z.object({
  recipeId: z.uuid("รหัสสูตรไม่ถูกต้อง"),
  foodId: z.uuid("รหัสอาหารไม่ถูกต้อง"),
  grams: z.coerce.number().positive("ปริมาณต้องมากกว่า 0").max(5000, "ปริมาณมากเกินไป"),
});

export const diaryRecipeEntrySchema = z.object({
  recipeId: z.uuid("รหัสสูตรไม่ถูกต้อง"),
  entryDate: dateString.default(() => today()),
  meal: mealSlot,
  servings: z.coerce.number().positive().max(20).default(1),
});

export type RecipeInput = z.infer<typeof recipeSchema>;
export type RecipeItemInput = z.infer<typeof recipeItemSchema>;
export type DiaryRecipeEntryInput = z.infer<typeof diaryRecipeEntrySchema>;

/**
 * บันทึกเซ็ตที่ยก — ไม่มีช่องแคลอรีโดยตั้งใจ
 * พลังงานที่เผาถูกคิดรวมในตัวคูณกิจกรรมของ TDEE อยู่แล้ว เอามาบวกอีกจะนับซ้ำ
 */
export const workoutSetSchema = z
  .object({
    /** เลือกจากคลัง 876 ท่า — ทางหลัก */
    exerciseId: z.uuid().optional(),
    /** พิมพ์ชื่อเองเมื่อคลังไม่มีท่านั้น — ทางสำรอง */
    exerciseName: z.string().trim().max(80, "ชื่อท่ายาวเกินไป").optional(),
    logDate: dateString.default(() => today()),
    weightKg: z.coerce.number().min(0, "น้ำหนักติดลบไม่ได้").max(1000, "น้ำหนักมากเกินจริง"),
    reps: z.coerce
      .number()
      .int("จำนวนครั้งต้องเป็นจำนวนเต็ม")
      .min(1, "อย่างน้อยหนึ่งครั้ง")
      .max(100, "จำนวนครั้งมากเกินจริง"),
  })
  .refine((value) => Boolean(value.exerciseId ?? value.exerciseName), {
    message: "กรุณาเลือกหรือพิมพ์ชื่อท่า",
    path: ["exerciseName"],
  });

export type WorkoutSetInput = z.infer<typeof workoutSetSchema>;
