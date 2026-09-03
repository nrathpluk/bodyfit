import { describe, expect, it } from "vitest";
import { atwaterKcal } from "./nutrition";
import { convertUnit } from "./units";
import { mapUsdaFood, type UsdaFood } from "./usda";

/** ตัดมาจากรูปแบบจริงของ endpoint /food/{fdcId} */
const rawEgg: UsdaFood = {
  fdcId: 171287,
  description: "Egg, whole, raw, fresh",
  dataType: "SR Legacy",
  foodNutrients: [
    { nutrient: { number: "208", unitName: "kcal" }, amount: 143 },
    { nutrient: { number: "208", unitName: "kJ" }, amount: 598 },
    { nutrient: { number: "203", unitName: "g" }, amount: 12.56 },
    { nutrient: { number: "204", unitName: "g" }, amount: 9.51 },
    { nutrient: { number: "205", unitName: "g" }, amount: 0.72 },
    { nutrient: { number: "307", unitName: "mg" }, amount: 142 },
    { nutrient: { number: "601", unitName: "mg" }, amount: 372 },
    { nutrient: { number: "320", unitName: "µg" }, amount: 160 },
    { nutrient: { number: "418", unitName: "µg" }, amount: 0.89 },
    { nutrient: { number: "301", unitName: "mg" }, amount: 56 },
    // สารอาหารที่เราไม่ได้ติดตาม ต้องถูกทิ้ง ไม่ใช่หลุดเข้า micros
    { nutrient: { number: "255", unitName: "g" }, amount: 76.15 },
  ],
};

describe("การแปลงหน่วย", () => {
  it("แปลงข้ามหน่วยได้ถูกต้อง", () => {
    expect(convertUnit(1, "g", "mg")).toBe(1000);
    expect(convertUnit(1000, "mg", "g")).toBe(1);
    expect(convertUnit(1, "mg", "mcg")).toBeCloseTo(1000, 6);
    expect(convertUnit(160, "µg", "mcg")).toBeCloseTo(160, 6);
  });

  it("คืน null เมื่อเป็นหน่วยที่แปลงตรง ๆ ไม่ได้ เช่น IU", () => {
    expect(convertUnit(400, "iu", "mcg")).toBeNull();
  });
});

describe("การแปลงข้อมูล USDA", () => {
  it("ดึงมาโครและไมโครที่ติดตามออกมาได้", () => {
    const mapped = mapUsdaFood(rawEgg)!;
    expect(mapped.sourceRef).toBe("171287");
    expect(mapped.name).toBe("Egg, whole, raw, fresh");
    expect(mapped.kcalPer100g).toBe(143);
    expect(mapped.proteinPer100g).toBe(12.56);
    expect(mapped.micros.sodium_mg).toBe(142);
    expect(mapped.micros.vitamin_a_mcg).toBe(160);
    expect(mapped.micros.vitamin_b12_mcg).toBe(0.89);
  });

  it("เอาพลังงานเฉพาะหน่วย kcal ไม่ใช่ kJ ที่มาในแถวถัดกัน", () => {
    expect(mapUsdaFood(rawEgg)!.kcalPer100g).toBe(143);
  });

  it("ไม่เก็บสารอาหารนอกชุด 14 ตัวที่ประกาศไว้", () => {
    const mapped = mapUsdaFood(rawEgg)!;
    expect(Object.keys(mapped.micros).sort()).toEqual([
      "calcium_mg",
      "cholesterol_mg",
      "sodium_mg",
      "vitamin_a_mcg",
      "vitamin_b12_mcg",
    ]);
  });

  it("ค่าพลังงานที่ได้ต้องสอดคล้องกับมาโครตามสูตร Atwater", () => {
    const mapped = mapUsdaFood(rawEgg)!;
    const fromMacros = atwaterKcal({
      protein: mapped.proteinPer100g,
      carb: mapped.carbPer100g,
      fat: mapped.fatPer100g,
    });
    expect(Math.abs(fromMacros - mapped.kcalPer100g) / mapped.kcalPer100g).toBeLessThan(0.2);
  });

  it("รองรับรูปแบบแบนจาก endpoint ค้นหา", () => {
    const mapped = mapUsdaFood({
      fdcId: 1,
      description: "Test",
      foodNutrients: [
        { nutrientNumber: "208", unitName: "KCAL", value: 100 },
        { nutrientNumber: "203", unitName: "G", value: 5 },
        { nutrientNumber: "204", unitName: "G", value: 2 },
        { nutrientNumber: "205", unitName: "G", value: 15 },
      ],
    })!;
    expect(mapped.kcalPer100g).toBe(100);
    expect(mapped.carbPer100g).toBe(15);
  });

  it("ทิ้งรายการที่มาโครไม่ครบ เพราะใช้คำนวณอะไรไม่ได้", () => {
    expect(
      mapUsdaFood({
        fdcId: 2,
        description: "ไม่มีคาร์บ",
        foodNutrients: [
          { nutrient: { number: "208", unitName: "kcal" }, amount: 50 },
          { nutrient: { number: "203", unitName: "g" }, amount: 1 },
        ],
      }),
    ).toBeNull();
  });
});
