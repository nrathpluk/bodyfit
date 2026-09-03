import { describe, expect, it } from "vitest";
import {
  MIN_SESSIONS_FOR_TREND,
  bestOneRepMax,
  estimateOneRepMax,
  isReliableEstimate,
  progressTrend,
  totalVolume,
} from "./strength";

describe("การประมาณ 1RM", () => {
  it("ยกครั้งเดียวคือน้ำหนักนั้นตรง ๆ", () => {
    expect(estimateOneRepMax({ weightKg: 100, reps: 1 })).toBe(100);
  });

  it("ยก 80 กก. 5 ครั้ง ได้ราว 93 กก.", () => {
    // 80 × (1 + 5/30) = 93.33
    expect(estimateOneRepMax({ weightKg: 80, reps: 5 })).toBeCloseTo(93.33, 1);
  });

  it("เทียบเซ็ตที่น้ำหนักกับจำนวนครั้งต่างกันได้ — นี่คือเหตุผลที่ต้องมีสูตรนี้", () => {
    const heavy = estimateOneRepMax({ weightKg: 80, reps: 5 });
    const light = estimateOneRepMax({ weightKg: 70, reps: 10 });
    // 80×5 = 93.3 ส่วน 70×10 = 93.3 พอ ๆ กัน ดูด้วยตาเปล่าไม่มีทางรู้
    expect(Math.abs(heavy - light)).toBeLessThan(1);
  });

  it("ค่าที่ใส่ผิดไม่ทำให้ได้ตัวเลขประหลาด", () => {
    expect(estimateOneRepMax({ weightKg: 0, reps: 5 })).toBe(0);
    expect(estimateOneRepMax({ weightKg: 50, reps: 0 })).toBe(0);
  });

  it("บอกได้ว่าจำนวนครั้งเยอะเกินจนค่าไม่น่าเชื่อถือ", () => {
    expect(isReliableEstimate({ weightKg: 60, reps: 8 })).toBe(true);
    expect(isReliableEstimate({ weightKg: 40, reps: 20 })).toBe(false);
  });
});

describe("สรุปของหนึ่งวัน", () => {
  const sets = [
    { weightKg: 60, reps: 10 },
    { weightKg: 80, reps: 5 },
    { weightKg: 70, reps: 8 },
  ];

  it("เซ็ตที่ดีที่สุดคือเซ็ตที่ให้ 1RM สูงสุด ไม่ใช่เซ็ตที่หนักที่สุด", () => {
    expect(bestOneRepMax(sets)).toBeCloseTo(93.33, 1);
  });

  it("ปริมาณงานรวมคือน้ำหนักคูณครั้งของทุกเซ็ต", () => {
    // 600 + 400 + 560
    expect(totalVolume(sets)).toBe(1560);
  });
});

const session = (date: string, oneRepMax: number) => ({
  date,
  oneRepMax,
  volumeKg: 1000,
  sets: 3,
});

describe("แนวโน้มความก้าวหน้า", () => {
  it("แข็งแรงขึ้นเรื่อย ๆ ให้ทิศทางขึ้น", () => {
    const trend = progressTrend([
      session("2026-09-01", 90),
      session("2026-09-08", 92),
      session("2026-09-15", 94),
      session("2026-09-22", 96),
    ])!;
    expect(trend.direction).toBe("up");
    expect(trend.perWeekKg).toBeCloseTo(2, 1);
    expect(trend.percentChange).toBeCloseTo(6.7, 1);
  });

  it("ถอยลงให้ทิศทางลง", () => {
    const trend = progressTrend([
      session("2026-09-01", 100),
      session("2026-09-08", 97),
      session("2026-09-15", 94),
    ])!;
    expect(trend.direction).toBe("down");
    expect(trend.perWeekKg).toBeLessThan(0);
  });

  it("แกว่งเล็กน้อยถือว่ายังไม่ขยับ ไม่ใช่ 'ก้าวหน้า'", () => {
    const trend = progressTrend([
      session("2026-09-01", 90),
      session("2026-09-08", 90.1),
      session("2026-09-15", 89.95),
    ])!;
    expect(trend.direction).toBe("flat");
  });

  it("วันที่ฟอร์มตกวันเดียวต้องไม่พลิกข้อสรุปทั้งช่วง", () => {
    const trend = progressTrend([
      session("2026-09-01", 90),
      session("2026-09-08", 93),
      session("2026-09-15", 96),
      session("2026-09-22", 99),
      // วันสุดท้ายนอนไม่พอ ยกได้น้อยลง
      session("2026-09-29", 94),
    ])!;
    expect(trend.direction).toBe("up");
  });

  it("ข้อมูลน้อยเกินไปคืน null แทนที่จะเดา", () => {
    const few = Array.from({ length: MIN_SESSIONS_FOR_TREND - 1 }, (_, i) =>
      session(`2026-09-0${i + 1}`, 90),
    );
    expect(progressTrend(few)).toBeNull();
  });

  it("เล่นหลายเซ็ตในวันเดียวทั้งหมดคืน null ไม่ใช่หารด้วยศูนย์", () => {
    const sameDay = Array.from({ length: 4 }, () => session("2026-09-01", 90));
    expect(progressTrend(sameDay)).toBeNull();
  });
});
