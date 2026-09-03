import type { DateString } from "./dates";
import { diffDays } from "./dates";

/**
 * คณิตศาสตร์ของความก้าวหน้าในการยกน้ำหนัก — ชั้น pure ห้ามแตะฐานข้อมูล
 *
 * **ไม่มีอะไรเกี่ยวกับแคลอรีในไฟล์นี้เลย** ตามที่ตั้งใจไว้ตั้งแต่ออกแบบ
 *
 * ปัญหาของการดู "ความก้าวหน้า" คือน้ำหนักที่ยกกับจำนวนครั้งแลกกันได้
 * ยก 80 กก. 5 ครั้ง กับ 70 กก. 10 ครั้ง อันไหนแข็งแรงกว่ากัน ดูด้วยตาไม่ออก
 * ต้องแปลงให้เป็นตัวเลขเดียวกันก่อนถึงจะเทียบข้ามวันได้
 */

export type WorkoutSet = { weightKg: number; reps: number };
export type SessionPoint = { date: DateString; oneRepMax: number; volumeKg: number; sets: number };

/**
 * ประมาณน้ำหนักสูงสุดที่ยกได้หนึ่งครั้ง (1RM) ด้วยสูตร Epley
 *
 *     1RM = น้ำหนัก × (1 + ครั้ง ÷ 30)
 *
 * เลือก Epley เพราะเป็นสูตรที่ใช้กันแพร่หลายที่สุดและคำนวณง่าย
 * ทำให้เทียบเซ็ตที่น้ำหนักและจำนวนครั้งต่างกันได้ด้วยตัวเลขเดียว
 *
 * **แม่นเฉพาะช่วงไม่เกินราว 12 ครั้ง** เกินกว่านั้นความทนเข้ามาเกี่ยวมากกว่าแรง
 * ตัวเลขจะสูงเกินจริง — ใช้ isReliableEstimate() เช็คก่อนเอาไปเทียบ
 */
export function estimateOneRepMax(set: WorkoutSet): number {
  if (set.reps <= 0 || set.weightKg <= 0) return 0;
  if (set.reps === 1) return set.weightKg;
  return Math.round(set.weightKg * (1 + set.reps / 30) * 100) / 100;
}

export const RELIABLE_REP_LIMIT = 12;

export function isReliableEstimate(set: WorkoutSet): boolean {
  return set.reps >= 1 && set.reps <= RELIABLE_REP_LIMIT;
}

/** เซ็ตที่ดีที่สุดของวัน วัดด้วย 1RM ที่ประมาณได้ */
export function bestOneRepMax(sets: WorkoutSet[]): number {
  return sets.reduce((best, set) => Math.max(best, estimateOneRepMax(set)), 0);
}

/** ปริมาณงานรวม = น้ำหนัก × ครั้ง ของทุกเซ็ต — บอกภาระที่ร่างกายรับทั้งวัน */
export function totalVolume(sets: WorkoutSet[]): number {
  return Math.round(sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0) * 10) / 10;
}

export type Progress = {
  /** เปลี่ยนไปกี่ กก. ต่อสัปดาห์ (บวก = แข็งแรงขึ้น) */
  perWeekKg: number;
  /** เปลี่ยนไปกี่เปอร์เซ็นต์ตลอดช่วงที่ดู */
  percentChange: number;
  direction: "up" | "down" | "flat";
};

/** ต่ำกว่านี้ถือว่าไม่ขยับ — กันไม่ให้เส้นที่แกว่งเล็กน้อยถูกอ่านว่า "ก้าวหน้า" */
const FLAT_THRESHOLD_PER_WEEK = 0.15;

/** ต้องมีอย่างน้อยเท่านี้ครั้งถึงจะสรุปแนวโน้มได้ */
export const MIN_SESSIONS_FOR_TREND = 3;

/**
 * แนวโน้มความก้าวหน้าจากความชันของเส้น 1RM
 *
 * ใช้ least squares ทั้งช่วง ไม่ใช่เอาครั้งแรกลบครั้งล่าสุด เพราะวันที่นอนไม่พอ
 * หรือกินมาน้อยจะกดตัวเลขวันนั้นลงจนสรุปผิดทั้งช่วง (เหตุผลเดียวกับเส้นน้ำหนักตัว)
 */
export function progressTrend(points: SessionPoint[]): Progress | null {
  if (points.length < MIN_SESSIONS_FOR_TREND) return null;

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const origin = sorted[0].date;
  const xs = sorted.map((p) => diffDays(origin, p.date));
  const ys = sorted.map((p) => p.oneRepMax);
  const n = sorted.length;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY);
    denominator += (xs[i] - meanX) ** 2;
  }
  if (denominator === 0) return null;

  const perWeekKg = Math.round((numerator / denominator) * 7 * 100) / 100;
  const first = ys[0];
  const last = ys[ys.length - 1];
  const percentChange = first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : 0;

  return {
    perWeekKg,
    percentChange,
    direction:
      Math.abs(perWeekKg) < FLAT_THRESHOLD_PER_WEEK ? "flat" : perWeekKg > 0 ? "up" : "down",
  };
}
