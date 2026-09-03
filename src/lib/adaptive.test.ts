import { describe, expect, it } from "vitest";
import {
  FULL_TRUST_DAYS,
  MIN_LOGGED_DAYS,
  adaptiveTdee,
  tdeeFromBalance,
} from "./adaptive";

describe("TDEE จากสมดุลพลังงาน", () => {
  it("น้ำหนักนิ่ง แปลว่าใช้เท่าที่กิน", () => {
    expect(tdeeFromBalance(2000, 0)).toBe(2000);
  });

  it("ลด 0.5 กก./สัปดาห์ ขณะกิน 1,800 แปลว่าใช้จริงราว 2,350", () => {
    // 0.5 กก. = 3,850 kcal ต่อสัปดาห์ = 550 ต่อวัน
    expect(tdeeFromBalance(1800, -0.5)).toBeCloseTo(2350, 0);
  });

  it("น้ำหนักขึ้นขณะกินเท่าเดิม แปลว่าใช้จริงน้อยกว่าที่กิน", () => {
    expect(tdeeFromBalance(2500, 0.25)).toBeLessThan(2500);
  });
});

const base = {
  formulaTdee: 2400,
  windowDays: 28,
  loggedDays: 28,
  avgIntakeKcal: 1800,
  weeklyChangeKg: -0.5,
};

describe("การผสมค่าสูตรกับค่าที่วัดได้", () => {
  it("ยังไม่มีแนวโน้มน้ำหนัก ให้ใช้สูตรล้วน", () => {
    const result = adaptiveTdee({ ...base, weeklyChangeKg: null });
    expect(result.source).toBe("formula");
    expect(result.tdee).toBe(2400);
    expect(result.confidence).toBe(0);
  });

  it("บันทึกไม่สม่ำเสมอ ให้ใช้สูตรล้วน — ค่าเฉลี่ยที่กินต่ำกว่าความจริง", () => {
    const result = adaptiveTdee({ ...base, loggedDays: 10 });
    expect(result.source).toBe("formula");
    expect(result.reason).toContain("ไม่สม่ำเสมอ");
  });

  it("บันทึกสม่ำเสมอแต่ยังไม่ครบสองสัปดาห์ ก็ยังไม่ปรับ", () => {
    const result = adaptiveTdee({ ...base, windowDays: 13, loggedDays: 13 });
    expect(result.source).toBe("formula");
    expect(result.confidence).toBe(0);
  });

  it("ครบสองสัปดาห์เริ่มปรับ แต่ยังเชื่อค่าที่วัดได้ไม่เต็มร้อย", () => {
    const result = adaptiveTdee({ ...base, windowDays: 21, loggedDays: 21 });
    expect(result.source).toBe("blended");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(1);
    // อยู่ระหว่างค่าสูตร (2,400) กับค่าที่วัดได้ (~2,350)
    expect(result.tdee).toBeGreaterThan(2350);
    expect(result.tdee).toBeLessThan(2400);
  });

  it("ครบสี่สัปดาห์เชื่อค่าที่วัดได้เต็มร้อย", () => {
    const result = adaptiveTdee({ ...base, loggedDays: FULL_TRUST_DAYS });
    expect(result.confidence).toBe(1);
    expect(result.tdee).toBeCloseTo(2350, -1);
  });

  it("เป้าไม่กระโดดข้ามคืน — เพิ่มทีละวันแล้วค่าขยับทีละน้อย", () => {
    const day14 = adaptiveTdee({ ...base, loggedDays: MIN_LOGGED_DAYS });
    const day15 = adaptiveTdee({ ...base, loggedDays: MIN_LOGGED_DAYS + 1 });
    expect(Math.abs(day15.tdee - day14.tdee)).toBeLessThan(30);
  });

  it("ข้อมูลเพี้ยนสุดขั้วถูกจำกัดไม่ให้ต่างจากสูตรเกิน 35%", () => {
    // อ้างว่าลดสัปดาห์ละ 3 กก. ทั้งที่กิน 1,800 → คำนวณตรง ๆ จะได้เกิน 5,000 kcal
    const result = adaptiveTdee({ ...base, weeklyChangeKg: -3 });
    expect(result.tdee).toBeLessThanOrEqual(Math.round(2400 * 1.35));
  });

  it("จำกัดขอบล่างด้วย ไม่ให้เป้าตกฮวบจากข้อมูลผิด", () => {
    const result = adaptiveTdee({ ...base, weeklyChangeKg: 3 });
    expect(result.tdee).toBeGreaterThanOrEqual(Math.round(2400 * 0.65));
  });
});
