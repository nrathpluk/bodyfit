import { describe, expect, it } from "vitest";
import { localizeServingLabel, pickDefaultServingIndex } from "./servings";

describe("การแปลหน่วยครัว", () => {
  it("แปลหน่วยตวงพื้นฐาน", () => {
    expect(localizeServingLabel("cup")).toBe("ถ้วย");
    expect(localizeServingLabel("tbsp")).toBe("ช้อนโต๊ะ");
    expect(localizeServingLabel("tsp")).toBe("ช้อนชา");
  });

  it("แปลขนาดของชิ้นอาหาร", () => {
    expect(localizeServingLabel("large")).toBe("ใหญ่");
    expect(localizeServingLabel("extra large")).toBe("ใหญ่พิเศษ");
  });

  it("แปลคำประกอบในวลีเดียวกันได้ทั้งหมด", () => {
    expect(localizeServingLabel("cup, chopped")).toBe("ถ้วย, สับ");
    expect(localizeServingLabel("slice, cooked")).toBe("แผ่น, สุก");
  });

  it("หน่วยที่ไม่รู้จักคืนคำเดิม ไม่เดา", () => {
    expect(localizeServingLabel("cubic inch boneless")).toBe("cubic inch boneless");
  });

  it("ไม่แปลคำที่บังเอิญมีตัวอักษรตรงกันกลางคำ", () => {
    expect(localizeServingLabel("occupancy")).toBe("occupancy");
  });
});

describe("การเลือกหน่วยตั้งต้น", () => {
  it("เลือกหน่วยที่นับเป็นชิ้นก่อนหน่วยตวง", () => {
    // ลำดับนี้คือลำดับจริงของ "ไข่ต้ม" ใน USDA
    expect(pickDefaultServingIndex(["cup, chopped", "tbsp", "large"])).toBe(2);
  });

  it("ชิ้นเนื้อที่ระบุชัดชนะหน่วยกลาง ๆ อย่าง unit", () => {
    expect(
      pickDefaultServingIndex([
        "cup, chopped or diced",
        "unit (yield from 1 lb ready-to-cook chicken)",
        "breast, bone and skin removed",
      ]),
    ).toBe(2);
  });

  it("ขนาดกลางชนะขนาดอื่นในกลุ่มเดียวกัน", () => {
    expect(pickDefaultServingIndex(["extra small", "large", "medium"])).toBe(2);
  });

  it("ไม่เลือกทั้งหัวเป็นค่าตั้งต้น", () => {
    expect(pickDefaultServingIndex(["head, large (about 7\" dia)", "cup, chopped"])).toBe(1);
  });

  it("ถ้ามีแต่หน่วยตวง ให้ถ้วยชนะช้อน", () => {
    expect(pickDefaultServingIndex(["tbsp", "cup"])).toBe(1);
  });

  it("หน่วยเดียวก็คือหน่วยนั้น", () => {
    expect(pickDefaultServingIndex(["cup"])).toBe(0);
  });

  it("เสมอกันให้ใช้ลำดับของ USDA (ตัวแรกชนะ)", () => {
    expect(pickDefaultServingIndex(["slice", "piece"])).toBe(0);
  });
});
