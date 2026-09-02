import { describe, expect, it } from "vitest";
import { MICROS, USDA_NUMBER_TO_MICRO, microProgress } from "./micros";

describe("นิยามไมโคร", () => {
  it("มี 14 ตัวและคีย์ไม่ซ้ำ", () => {
    expect(MICROS).toHaveLength(14);
    expect(new Set(MICROS.map((m) => m.key)).size).toBe(14);
  });

  it("รหัส USDA ไม่ซ้ำกัน — ซ้ำแปลว่าแมปผิดตัว", () => {
    expect(Object.keys(USDA_NUMBER_TO_MICRO)).toHaveLength(14);
  });

  it("ชื่อคีย์ลงท้ายด้วยหน่วยของตัวเอง กันหยิบผิดหน่วยตอนคำนวณ", () => {
    for (const micro of MICROS) {
      expect(micro.key.endsWith(`_${micro.unit}`)).toBe(true);
    }
  });
});

describe("การเทียบกับค่าอ้างอิง", () => {
  it("คิดสัดส่วนของสารอาหารที่ควรได้ถึง", () => {
    const [fiber] = microProgress({ fiber_g: 12.5 });
    expect(fiber.definition.key).toBe("fiber_g");
    expect(fiber.ratio).toBeCloseTo(0.5, 5);
    expect(fiber.exceeded).toBe(false);
  });

  it("ตั้งธงเมื่อเกินค่าที่ไม่ควรเกิน", () => {
    const [sodium] = microProgress({ sodium_mg: 3000 });
    expect(sodium.exceeded).toBe(true);
  });

  it("ไม่เกินยังไม่ตั้งธง แม้จะใกล้เพดาน", () => {
    const [sodium] = microProgress({ sodium_mg: 2400 });
    expect(sodium.exceeded).toBe(false);
  });

  it("ไมโครที่ไม่มีข้อมูลต้องไม่โผล่ออกมาเป็นศูนย์", () => {
    const result = microProgress({ fiber_g: 5 });
    expect(result).toHaveLength(1);
    expect(result.map((r) => r.definition.key)).not.toContain("vitamin_d_mcg");
  });

  it("เรียงตามลำดับที่ประกาศไว้เสมอ ไม่ใช่ตามลำดับคีย์ที่ส่งเข้ามา", () => {
    const result = microProgress({ vitamin_c_mg: 30, fiber_g: 5, sodium_mg: 100 });
    expect(result.map((r) => r.definition.key)).toEqual(["fiber_g", "sodium_mg", "vitamin_c_mg"]);
  });
});
