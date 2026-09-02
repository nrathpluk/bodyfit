import { describe, expect, it } from "vitest";
import { profileInputSchema } from "./validation";

const valid = {
  sex: "male",
  birthDate: "1998-05-20",
  heightCm: "178",
  weightKg: "80",
  activityLevel: "light",
  goal: "lose",
  rateKgPerWeek: "-0.5",
};

describe("การตรวจข้อมูลโปรไฟล์", () => {
  it("รับค่าที่มาจากฟอร์ม (ทุกอย่างเป็น string) แล้วแปลงเป็นตัวเลข", () => {
    const parsed = profileInputSchema.parse(valid);
    expect(parsed.heightCm).toBe(178);
    expect(parsed.rateKgPerWeek).toBe(-0.5);
  });

  it("ปฏิเสธอัตราลดที่เร็วเกิน 1 กก./สัปดาห์", () => {
    const result = profileInputSchema.safeParse({ ...valid, rateKgPerWeek: "-1.5" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธอายุต่ำกว่า 13 ปี", () => {
    const result = profileInputSchema.safeParse({ ...valid, birthDate: "2020-01-01" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเพศที่ไม่รู้จัก", () => {
    const result = profileInputSchema.safeParse({ ...valid, sex: "other" });
    expect(result.success).toBe(false);
  });
});
