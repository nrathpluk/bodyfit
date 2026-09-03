import { KCAL_PER_KG_FAT } from "./nutrition";

/**
 * ประมาณพลังงานที่ร่างกายใช้จริง จากสิ่งที่กินเทียบกับน้ำหนักที่เปลี่ยนไป
 *
 * สูตร Mifflin-St Jeor ให้ค่าประมาณจากส่วนสูง/น้ำหนัก/อายุเท่านั้น มันไม่รู้ว่า
 * คนนี้ขยับตัวเยอะแค่ไหนจริง ๆ และไม่รู้ว่าเมตาบอลิซึมปรับตัวลงระหว่างลดน้ำหนัก
 * ตัวเลขจึงค้างอยู่ที่เดิมทั้งที่ร่างกายเปลี่ยนไปแล้ว
 *
 * สมดุลพลังงานบอกความจริงได้ตรงกว่า: ถ้ากินเฉลี่ยวันละ 2,000 แล้วน้ำหนักนิ่ง
 * แปลว่าใช้จริงวันละ 2,000 ไม่ว่าสูตรจะบอกว่าเท่าไร
 *
 * ชั้น pure ล้วน ห้ามแตะฐานข้อมูล
 */

/** ต้องมีข้อมูลอย่างน้อยเท่านี้ก่อนจะเริ่มเชื่อค่าที่วัดได้ */
export const MIN_LOGGED_DAYS = 14;
/** ครบเท่านี้จึงเชื่อค่าที่วัดได้เต็มร้อย */
export const FULL_TRUST_DAYS = 28;
/** ต้องบันทึกอาหารอย่างน้อยเท่านี้ของช่วงเวลา ไม่งั้นค่าเฉลี่ยที่กินต่ำกว่าความจริง */
export const MIN_LOGGING_DENSITY = 0.7;

export type AdaptiveInput = {
  /** ค่าจากสูตร ใช้เป็นตัวตั้งต้นและตัวคุมไม่ให้ค่าที่วัดได้เพี้ยนเกินจริง */
  formulaTdee: number;
  /** ความยาวของช่วงที่พิจารณา (วัน) */
  windowDays: number;
  /** จำนวนวันในช่วงนั้นที่มีการบันทึกอาหาร */
  loggedDays: number;
  /** ค่าเฉลี่ยพลังงานที่กิน นับเฉพาะวันที่บันทึก */
  avgIntakeKcal: number;
  /** อัตราการเปลี่ยนน้ำหนักจากเส้นแนวโน้ม — null เมื่อข้อมูลไม่พอ */
  weeklyChangeKg: number | null;
};

export type AdaptiveResult = {
  tdee: number;
  source: "formula" | "blended";
  /** 0–1 บอกว่าเชื่อค่าที่วัดได้แค่ไหน ใช้แสดงผลให้ผู้ใช้เข้าใจว่าทำไมเป้าถึงขยับ */
  confidence: number;
  reason: string;
};

/**
 * TDEE จากสมดุลพลังงาน — กินเท่าไร ลบด้วยพลังงานที่กลายเป็น (หรือหายจาก) เนื้อตัว
 * น้ำหนักลด = ร่างกายใช้มากกว่าที่กิน จึงบวกกลับเข้าไป
 */
export function tdeeFromBalance(avgIntakeKcal: number, weeklyChangeKg: number): number {
  const dailyStorageKcal = (weeklyChangeKg * KCAL_PER_KG_FAT) / 7;
  return avgIntakeKcal - dailyStorageKcal;
}

/**
 * รวมค่าจากสูตรกับค่าที่วัดได้ ตามปริมาณข้อมูลที่มี
 *
 * ยิ่งบันทึกนาน ยิ่งเชื่อค่าที่วัดได้มากขึ้นทีละน้อย ไม่ใช่สลับทันทีในวันเดียว
 * เพราะเป้าที่กระโดด 300 kcal ข้ามคืนทำให้ผู้ใช้ไม่เชื่อถือระบบ
 */
export function adaptiveTdee(input: AdaptiveInput): AdaptiveResult {
  const formula = Math.round(input.formulaTdee);

  if (input.weeklyChangeKg === null) {
    return {
      tdee: formula,
      source: "formula",
      confidence: 0,
      reason: "ยังชั่งน้ำหนักไม่พอที่จะอ่านแนวโน้ม",
    };
  }

  const density = input.windowDays > 0 ? input.loggedDays / input.windowDays : 0;
  if (density < MIN_LOGGING_DENSITY) {
    return {
      tdee: formula,
      source: "formula",
      confidence: 0,
      // บันทึกไม่ครบทำให้ค่าเฉลี่ยที่กินต่ำกว่าความจริง ถ้าเชื่อจะได้เป้าที่ต่ำเกินไป
      reason: "ยังบันทึกอาหารไม่สม่ำเสมอพอ",
    };
  }

  if (input.loggedDays < MIN_LOGGED_DAYS) {
    return {
      tdee: formula,
      source: "formula",
      confidence: 0,
      reason: `ต้องบันทึกครบ ${MIN_LOGGED_DAYS} วันก่อน จึงจะเริ่มปรับเป้าให้`,
    };
  }

  const observedRaw = tdeeFromBalance(input.avgIntakeKcal, input.weeklyChangeKg);

  /*
   * กันค่าที่เพี้ยนจากข้อมูลผิด เช่น ชั่งน้ำหนักตอนใส่เสื้อผ้าหนาวันเดียว
   * หรือลืมบันทึกมื้อใหญ่ไปหลายวัน — ยอมให้ต่างจากสูตรได้ไม่เกิน 35%
   */
  const lower = formula * 0.65;
  const upper = formula * 1.35;
  const observed = Math.min(upper, Math.max(lower, observedRaw));

  const progress = (input.loggedDays - MIN_LOGGED_DAYS) / (FULL_TRUST_DAYS - MIN_LOGGED_DAYS);
  const confidence = Math.min(1, Math.max(0, progress));
  const tdee = Math.round(formula * (1 - confidence) + observed * confidence);

  return {
    tdee,
    source: "blended",
    confidence: Math.round(confidence * 100) / 100,
    reason:
      confidence >= 1
        ? "คำนวณจากอาหารที่บันทึกและน้ำหนักจริงของคุณ"
        : `กำลังปรับตามข้อมูลจริงของคุณ (${Math.round(confidence * 100)}%)`,
  };
}
