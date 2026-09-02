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
