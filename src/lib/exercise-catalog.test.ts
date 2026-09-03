import { describe, expect, it } from "vitest";
import { describeExercise, mapExercise } from "./exercise-catalog";

const raw = {
  id: "Barbell_Bench_Press_-_Medium_Grip",
  name: "Barbell Bench Press - Medium Grip",
  equipment: "barbell",
  category: "strength",
  level: "beginner",
  primaryMuscles: ["chest"],
  secondaryMuscles: ["shoulders", "triceps"],
};

describe("การแปลงข้อมูลคลังท่า", () => {
  it("ดึงชื่อและ metadata ที่ใช้จริงออกมา", () => {
    const mapped = mapExercise(raw)!;
    expect(mapped.name).toBe("Barbell Bench Press - Medium Grip");
    expect(mapped.sourceRef).toBe("Barbell_Bench_Press_-_Medium_Grip");
    expect(mapped.equipment).toBe("barbell");
    expect(mapped.primaryMuscle).toBe("chest");
  });

  it("เก็บกล้ามเนื้อหลักตัวแรกตัวเดียว ไม่เก็บตัวรอง", () => {
    expect(mapExercise(raw)!.primaryMuscle).toBe("chest");
  });

  it("ทิ้งรายการที่ไม่มีชื่อหรือไม่มีรหัสอ้างอิง", () => {
    expect(mapExercise({ id: "x" })).toBeNull();
    expect(mapExercise({ name: "Squat" })).toBeNull();
    expect(mapExercise({ id: "x", name: "   " })).toBeNull();
  });

  it("ช่องที่ว่างกลายเป็น null ไม่ใช่สตริงว่าง", () => {
    const mapped = mapExercise({ id: "a", name: "Test", equipment: "  " })!;
    expect(mapped.equipment).toBeNull();
    expect(mapped.primaryMuscle).toBeNull();
  });
});

describe("คำบรรยายใต้ชื่อท่า", () => {
  it("เรียงอุปกรณ์ก่อนกล้ามเนื้อ เพราะผู้ใช้ตัดสินใจจากอุปกรณ์ที่มีก่อน", () => {
    expect(
      describeExercise({ equipment: "barbell", primaryMuscle: "chest", category: "strength" }),
    ).toBe("barbell · chest · strength");
  });

  it("ข้ามช่องที่ไม่มีข้อมูล ไม่ทิ้งจุดคั่นค้างไว้", () => {
    expect(describeExercise({ equipment: null, primaryMuscle: "abs", category: null })).toBe("abs");
    expect(describeExercise({ equipment: null, primaryMuscle: null, category: null })).toBe("");
  });
});
