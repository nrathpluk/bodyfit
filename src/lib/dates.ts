/**
 * ตัดวันด้วยเขตเวลาไทยเสมอ
 *
 * เซิร์ฟเวอร์ (Vercel) รันด้วย UTC ถ้าใช้ `new Date().toISOString().slice(0,10)`
 * มื้อที่บันทึกระหว่างเที่ยงคืนถึง 07:00 ตามเวลาไทยจะไปโผล่ในวันก่อนหน้า
 * ทุกที่ที่ต้องการ "วันนี้" ให้เรียกผ่านไฟล์นี้
 */
export const APP_TIMEZONE = "Asia/Bangkok";

/** วันที่รูปแบบ YYYY-MM-DD */
export type DateString = string;

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** แปลงเวลาจริงเป็นวันตามเขตเวลาไทย */
export function toAppDate(instant: Date = new Date()): DateString {
  return ymdFormatter.format(instant);
}

/** วันนี้ตามเวลาไทย */
export function today(now: Date = new Date()): DateString {
  return toAppDate(now);
}

/** บวก/ลบวัน โดยคิดบนปฏิทินล้วน ไม่ผ่าน timezone (กันปัญหา DST ของ locale อื่น) */
export function addDays(date: DateString, days: number): DateString {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

/** จำนวนวันระหว่างสองวัน (b - a) */
export function diffDays(a: DateString, b: DateString): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** อายุเป็นปี ณ วันที่กำหนด — ใช้ในสูตร BMR */
export function ageOn(birthDate: DateString, onDate: DateString = today()): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [oy, om, od] = onDate.split("-").map(Number);
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age -= 1;
  return age;
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** แสดงผลแบบไทย เช่น "2 ก.ย. 2569" (พ.ศ.) */
export function formatThaiDate(date: DateString): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}
