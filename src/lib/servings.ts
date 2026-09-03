/**
 * แปลชื่อหน่วยครัวของ USDA เป็นไทย
 *
 * แปลตอนแสดงผล ไม่ใช่ตอน import — ชื่อในฐานข้อมูลต้องตรงกับต้นทางไว้เทียบย้อนกลับได้
 * และถ้าแก้คำแปลทีหลังจะได้ไม่ต้อง import ใหม่ทั้งคลัง
 *
 * หน่วยที่ไม่รู้จักคืนคำเดิม ดีกว่าเดาแล้วแปลผิด
 */
const UNIT_WORDS: [RegExp, string][] = [
  [/\bcup(s)?\b/gi, "ถ้วย"],
  [/\btbsp\b|\btablespoon(s)?\b/gi, "ช้อนโต๊ะ"],
  [/\btsp\b|\bteaspoon(s)?\b/gi, "ช้อนชา"],
  [/\bfl oz\b/gi, "ออนซ์ของเหลว"],
  [/\boz\b|\bounce(s)?\b/gi, "ออนซ์"],
  [/\bslice(s)?\b/gi, "แผ่น"],
  [/\bpiece(s)?\b/gi, "ชิ้น"],
  [/\bserving(s)?\b/gi, "ที่"],
  [/\bpackage(s)?\b/gi, "ห่อ"],
  [/\bcan\b/gi, "กระป๋อง"],
  [/\bbottle\b/gi, "ขวด"],
  [/\bfillet(s)?\b/gi, "ชิ้นเนื้อปลา"],
  [/\bbreast\b/gi, "อกไก่"],
  [/\bthigh\b/gi, "สะโพก"],
  [/\bextra large\b/gi, "ใหญ่พิเศษ"],
  [/\blarge\b/gi, "ใหญ่"],
  [/\bmedium\b/gi, "กลาง"],
  [/\bsmall\b/gi, "เล็ก"],
  [/\bchopped\b/gi, "สับ"],
  [/\bsliced\b/gi, "หั่น"],
  [/\bmashed\b/gi, "บด"],
  [/\bwhole\b/gi, "ทั้งชิ้น"],
  [/\bcooked\b/gi, "สุก"],
  [/\braw\b/gi, "ดิบ"],
];

export function localizeServingLabel(label: string): string {
  let result = label;
  for (const [pattern, thai] of UNIT_WORDS) result = result.replace(pattern, thai);
  return result.replace(/\s+/g, " ").trim();
}

/**
 * ลำดับความเหมาะสมของหน่วยที่จะใช้เป็นค่าตั้งต้น (คะแนนน้อย = เหมาะกว่า)
 *
 * คนบันทึกอาหารคิดเป็น "จำนวนชิ้น" ก่อนเสมอ — ไข่ 1 ฟอง, อกไก่ 1 ชิ้น
 * ไม่ใช่ "ไข่ต้มสับ 1 ถ้วย" ซึ่งเป็นหน่วยที่ USDA วางไว้เป็นตัวแรกในหลายรายการ
 * ตั้งค่าตั้งต้นผิดหน่วย ผู้ใช้ที่กดบันทึกเร็ว ๆ จะได้ตัวเลขผิดโดยไม่รู้ตัว
 *
 * ในกลุ่มที่นับเป็นชิ้นเหมือนกัน เลือก "ขนาดกลาง" ก่อน เพราะเป็นขนาดที่เจอบ่อยที่สุด
 * และพลาดน้อยที่สุดเมื่อผู้ใช้ไม่ได้ชั่งจริง
 */
const SMALL_SPOON = /\b(tbsp|tsp|tablespoon|teaspoon)\b/i;
const VOLUME_CUP = /\bcup\b/i;
const GENERIC_UNIT = /\b(unit|serving|nlea serving|package|can|bottle|container)\b/i;
const COUNTABLE =
  /\b(large|medium|small|whole|piece|slice|fillet|breast|thigh|leg|wing|egg|link|patty|stick|cookie|bar|head)\b/i;

export function servingPriority(label: string): number {
  if (SMALL_SPOON.test(label)) return 40;
  // ทั้งหัว/ทั้งต้น (กะหล่ำปลีทั้งหัว 1,248 ก.) ใหญ่เกินกว่าจะเป็นค่าตั้งต้นที่ดี
  // แพ้แม้แต่หน่วยตวง แต่ยังถูกเลือกได้ถ้าอาหารนั้นไม่มีหน่วยอื่นเลย
  if (/\bhead\b/i.test(label)) return 35;
  if (COUNTABLE.test(label)) {
    let score = 10;
    if (/\bextra large\b/i.test(label)) score += 2;
    else if (/\bextra small\b/i.test(label)) score += 3;
    else if (/\bmedium\b/i.test(label)) score -= 3;
    else if (/\blarge\b/i.test(label)) score -= 2;
    else if (/\bsmall\b/i.test(label)) score += 1;
    return score;
  }
  if (GENERIC_UNIT.test(label)) return 20;
  if (VOLUME_CUP.test(label)) return 30;
  return 25;
}

/** เลือกหน่วยตั้งต้นจากรายการหน่วยทั้งหมดของอาหารหนึ่งรายการ */
export function pickDefaultServingIndex(labels: string[]): number {
  let best = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  labels.forEach((label, index) => {
    const score = servingPriority(label);
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}
