import type { DateString } from "./dates";
import { diffDays } from "./dates";

/**
 * คณิตศาสตร์ของน้ำหนักตัว — ชั้น pure ห้ามแตะฐานข้อมูล
 *
 * ทำไมต้องมีเส้นแนวโน้ม: น้ำหนักรายวันแกว่งจากน้ำ เกลือ อาหารในลำไส้ และรอบเดือน
 * ได้เป็นกิโล ซึ่งกลบการเปลี่ยนแปลงของไขมันจริงที่เดินสัปดาห์ละ 0.5 กก.
 * ถ้าโชว์ตัวเลขดิบ ผู้ใช้จะเห็นน้ำหนักขึ้น 0.8 กก. ในวันเดียวแล้วท้อเลิก
 * ทั้งที่ไขมันไม่ได้เพิ่มเลย
 */

export type WeightPoint = { date: DateString; weightKg: number };
export type TrendPoint = WeightPoint & { trendKg: number };

/**
 * ค่าถ่วงของค่าเฉลี่ยเคลื่อนที่แบบเอ็กซ์โพเนนเชียล
 *
 * 0.1 คือค่าที่ The Hacker's Diet ใช้และถูกยืมไปใช้ในแอปติดตามน้ำหนักแทบทุกตัว
 * ให้ครึ่งชีวิตราวหนึ่งสัปดาห์ — ไวพอจะจับแนวโน้มจริงภายในสองสัปดาห์
 * แต่ช้าพอจะไม่กระโดดตามน้ำหนักวันเดียว
 */
const SMOOTHING = 0.1;

/** จำนวนจุดขั้นต่ำที่ยอมให้สรุปแนวโน้ม — น้อยกว่านี้ยังแยกสัญญาณจาก noise ไม่ได้ */
export const MIN_POINTS_FOR_TREND = 5;

/**
 * ใส่เส้นแนวโน้มให้ชุดน้ำหนัก (เรียงจากเก่าไปใหม่)
 *
 * จุดแรกใช้ค่าดิบเป็นจุดตั้งต้น เพราะยังไม่มีอดีตให้ถ่วง
 */
export function withTrend(points: WeightPoint[]): TrendPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let trend = sorted[0]?.weightKg ?? 0;

  return sorted.map((point, index) => {
    if (index > 0) trend += SMOOTHING * (point.weightKg - trend);
    else trend = point.weightKg;
    return { ...point, trendKg: Math.round(trend * 100) / 100 };
  });
}

/**
 * อัตราการเปลี่ยนน้ำหนักเป็น กก./สัปดาห์ จากความชันของเส้นแนวโน้ม
 *
 * ใช้ least squares บนค่าที่ปรับเรียบแล้ว ไม่ใช่เอาจุดแรกลบจุดสุดท้าย
 * เพราะสองจุดหัวท้ายอาจเป็นวันที่บวมน้ำพอดี แล้วสรุปผิดทั้งช่วง
 *
 * คืน null เมื่อข้อมูลน้อยเกินไปหรือทุกจุดอยู่วันเดียวกัน
 */
export function weeklyChangeKg(points: TrendPoint[]): number | null {
  if (points.length < MIN_POINTS_FOR_TREND) return null;

  const origin = points[0].date;
  const xs = points.map((p) => diffDays(origin, p.date));
  const ys = points.map((p) => p.trendKg);
  const n = points.length;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY);
    denominator += (xs[i] - meanX) ** 2;
  }
  if (denominator === 0) return null;

  const slopePerDay = numerator / denominator;
  return Math.round(slopePerDay * 7 * 1000) / 1000;
}

/** น้ำหนักแนวโน้มล่าสุด — ตัวเลขที่ควรเอาไปโชว์แทนน้ำหนักดิบของวันนี้ */
export function latestTrend(points: TrendPoint[]): number | null {
  return points.length > 0 ? points[points.length - 1].trendKg : null;
}
