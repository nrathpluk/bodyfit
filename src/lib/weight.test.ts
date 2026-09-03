import { describe, expect, it } from "vitest";
import { MIN_POINTS_FOR_TREND, latestTrend, weeklyChangeKg, withTrend } from "./weight";

/** ชุดน้ำหนักที่ลดจริงวันละ 0.07 กก. แต่มี noise ±0.6 กก. สลับขึ้นลง */
function noisySeries(): { date: string; weightKg: number }[] {
  const noise = [0, 0.6, -0.5, 0.4, -0.6, 0.5, -0.4, 0.3, -0.5, 0.4, -0.3, 0.2, -0.4, 0.3];
  return noise.map((n, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, "0")}`,
    weightKg: Math.round((80 - i * 0.07 + n) * 100) / 100,
  }));
}

describe("เส้นแนวโน้มน้ำหนัก", () => {
  it("เรียงวันให้เองแม้ข้อมูลเข้ามาสลับลำดับ", () => {
    const trend = withTrend([
      { date: "2026-09-03", weightKg: 80 },
      { date: "2026-09-01", weightKg: 79 },
      { date: "2026-09-02", weightKg: 81 },
    ]);
    expect(trend.map((t) => t.date)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });

  it("จุดแรกเท่ากับค่าดิบ เพราะยังไม่มีอดีตให้ถ่วง", () => {
    const trend = withTrend([{ date: "2026-09-01", weightKg: 80 }]);
    expect(trend[0].trendKg).toBe(80);
  });

  it("กลบ noise รายวัน — เส้นแนวโน้มแกว่งน้อยกว่าน้ำหนักดิบมาก", () => {
    const raw = noisySeries();
    const trend = withTrend(raw);

    const swing = (values: number[]) =>
      Math.max(...values.map((v, i) => (i === 0 ? 0 : Math.abs(v - values[i - 1]))));

    const rawSwing = swing(raw.map((p) => p.weightKg));
    const trendSwing = swing(trend.map((p) => p.trendKg));
    expect(trendSwing).toBeLessThan(rawSwing / 3);
  });

  it("น้ำหนักเด้งขึ้นวันเดียวต้องไม่ทำให้แนวโน้มกระโดดตาม", () => {
    const flat = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      weightKg: 70,
    }));
    flat.push({ date: "2026-09-11", weightKg: 71.5 });

    const trend = withTrend(flat);
    // ขึ้นจริง 1.5 กก. แต่แนวโน้มต้องขยับไม่เกินหนึ่งในสี่ของนั้น
    expect(latestTrend(trend)! - 70).toBeLessThan(0.375);
  });
});

describe("อัตราการเปลี่ยนต่อสัปดาห์", () => {
  it("จับทิศทางที่ลดจริงได้แม้ข้อมูลมี noise", () => {
    const change = weeklyChangeKg(withTrend(noisySeries()));
    expect(change).not.toBeNull();
    expect(change!).toBeLessThan(0);
  });

  it("น้ำหนักคงที่ให้ค่าใกล้ศูนย์", () => {
    const flat = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      weightKg: 65,
    }));
    expect(Math.abs(weeklyChangeKg(withTrend(flat))!)).toBeLessThan(0.01);
  });

  it("ข้อมูลน้อยเกินไปคืน null แทนที่จะเดา", () => {
    const few = Array.from({ length: MIN_POINTS_FOR_TREND - 1 }, (_, i) => ({
      date: `2026-09-0${i + 1}`,
      weightKg: 70,
    }));
    expect(weeklyChangeKg(withTrend(few))).toBeNull();
  });

  it("ชั่งหลายครั้งในวันเดียวกันทั้งหมดคืน null ไม่ใช่หารด้วยศูนย์", () => {
    const sameDay = Array.from({ length: 6 }, () => ({ date: "2026-09-01", weightKg: 70 }));
    expect(weeklyChangeKg(withTrend(sameDay))).toBeNull();
  });

  it("ใช้ความชันทั้งช่วง ไม่ใช่หัวลบท้าย — จุดท้ายที่บวมน้ำต้องไม่พลิกข้อสรุป", () => {
    const losing = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      weightKg: 80 - i * 0.1,
    }));
    const withBloat = [...losing, { date: "2026-09-15", weightKg: 80.5 }];
    expect(weeklyChangeKg(withTrend(withBloat))!).toBeLessThan(0);
  });
});
