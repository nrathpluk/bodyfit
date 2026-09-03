import { describe, expect, it } from "vitest";
import {
  perServing,
  ACTIVITY_MULTIPLIERS,
  MIN_KCAL,
  atwaterKcal,
  bmr,
  dailyTarget,
  scaleTo,
  sumNutrients,
  tdee,
} from "./nutrition";

describe("BMR (Mifflin-St Jeor)", () => {
  it("คำนวณของผู้ชายตามสูตร", () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 1648.75
    expect(bmr({ sex: "male", weightKg: 70, heightCm: 175, ageYears: 30 })).toBeCloseTo(1648.75, 2);
  });

  it("คำนวณของผู้หญิงตามสูตร", () => {
    // 10*55 + 6.25*160 - 5*30 - 161 = 1239
    expect(bmr({ sex: "female", weightKg: 55, heightCm: 160, ageYears: 30 })).toBeCloseTo(1239, 2);
  });
});

describe("ตัวคูณกิจกรรม", () => {
  it("ตรึงค่าไว้ตามชุดคลาสสิก — เปลี่ยนแล้วเป้าของผู้ใช้เดิมจะขยับทั้งระบบ", () => {
    expect(ACTIVITY_MULTIPLIERS).toEqual({
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    });
  });

  it("TDEE คือ BMR คูณตัวคูณ", () => {
    expect(tdee(1600, "moderate")).toBeCloseTo(2480, 5);
  });
});

describe("เป้าหมายรายวัน", () => {
  const base = {
    sex: "male" as const,
    weightKg: 80,
    heightCm: 178,
    ageYears: 28,
    activity: "light" as const,
  };

  it("goal maintain ไม่สนใจ rate ที่ส่งมา", () => {
    const target = dailyTarget({ ...base, goal: "maintain", rateKgPerWeek: -0.5 });
    expect(target.basis.rateKgPerWeek).toBe(0);
    expect(target.kcal).toBe(Math.round(target.basis.tdee / 10) * 10);
  });

  it("ลด 0.5 กก./สัปดาห์ = หัก 550 kcal/วัน", () => {
    const maintain = dailyTarget({ ...base, goal: "maintain", rateKgPerWeek: 0 });
    const lose = dailyTarget({ ...base, goal: "lose", rateKgPerWeek: -0.5 });
    expect(maintain.kcal - lose.kcal).toBeCloseTo(550, -1);
  });

  it("มาโครรวมกลับมาเท่ากับ kcal ของเป้า", () => {
    const target = dailyTarget({ ...base, goal: "lose", rateKgPerWeek: -0.5 });
    const fromMacros = atwaterKcal(target);
    expect(Math.abs(fromMacros - target.kcal)).toBeLessThanOrEqual(4);
  });

  it("ไม่ยอมให้เป้าต่ำกว่าขั้นต่ำ และบันทึกไว้ใน basis", () => {
    const target = dailyTarget({
      sex: "female",
      weightKg: 45,
      heightCm: 150,
      ageYears: 60,
      activity: "sedentary",
      goal: "lose",
      rateKgPerWeek: -1,
    });
    expect(target.kcal).toBe(MIN_KCAL.female);
    expect(target.basis.floored).toBe(true);
  });

  it("ตอนลดน้ำหนักให้โปรตีนสูงกว่าตอนคงน้ำหนัก", () => {
    const lose = dailyTarget({ ...base, goal: "lose", rateKgPerWeek: -0.5 });
    const maintain = dailyTarget({ ...base, goal: "maintain", rateKgPerWeek: 0 });
    expect(lose.protein).toBeGreaterThan(maintain.protein);
  });
});

describe("การสเกลและรวมยอด", () => {
  const rice = {
    kcalPer100g: 130,
    proteinPer100g: 2.7,
    carbPer100g: 28,
    fatPer100g: 0.3,
    micros: { fiber_g: 0.4, sodium_mg: 1 },
  };

  it("สเกลตามน้ำหนักที่กินจริง", () => {
    const eaten = scaleTo(rice, 200);
    expect(eaten.kcal).toBe(260);
    expect(eaten.carb).toBe(56);
    expect(eaten.micros.fiber_g).toBe(0.8);
  });

  it("รวมยอดหลายมื้อได้", () => {
    const total = sumNutrients([scaleTo(rice, 100), scaleTo(rice, 50)]);
    expect(total.kcal).toBe(195);
    expect(total.micros.sodium_mg).toBe(1.5);
  });

  it("ไมโครที่อาหารไม่ประกาศ ต้องไม่ถูกนับเป็นศูนย์", () => {
    const withIron = { ...rice, micros: { fiber_g: 1, iron_mg: 2 } };
    const total = sumNutrients([scaleTo(rice, 100), scaleTo(withIron, 100)]);
    // iron มาจากอาหารเดียว ผลรวมต้องเป็นของอาหารนั้นล้วน ไม่ใช่ถูกเฉลี่ยหรือบวก 0
    expect(total.micros.iron_mg).toBe(2);
    expect(total.micros.fiber_g).toBe(1.4);
    expect("vitamin_c_mg" in total.micros).toBe(false);
  });
});

describe("การหารสูตรเป็นต่อหนึ่งที่", () => {
  const total = {
    kcal: 900,
    protein: 60,
    carb: 90,
    fat: 30,
    micros: { sodium_mg: 1200, fiber_g: 6 },
  };

  it("หารทั้งมาโครและไมโครตามจำนวนที่", () => {
    const one = perServing(total, 3);
    expect(one.kcal).toBe(300);
    expect(one.protein).toBe(20);
    expect(one.micros.sodium_mg).toBe(400);
  });

  it("รับจำนวนที่เป็นทศนิยมได้ (สูตรแบ่งครึ่ง)", () => {
    expect(perServing(total, 1.5).kcal).toBe(600);
  });

  it("จำนวนที่เป็นศูนย์ต้องไม่ทำให้ค่ากลายเป็นอนันต์", () => {
    expect(perServing(total, 0).kcal).toBe(900);
  });
});
