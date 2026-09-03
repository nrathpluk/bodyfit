/**
 * แปลงข้อมูลจาก free-exercise-db → รูปแบบของเรา
 *
 * ชั้น pure ล้วน ไม่ยิงเน็ตและไม่แตะฐานข้อมูล (แนวเดียวกับ lib/usda.ts และ lib/off.ts)
 * สคริปต์ import เป็นแค่คนป้อนข้อมูล
 *
 * ชื่อท่าเก็บเป็นภาษาอังกฤษล้วนตามต้นทาง ไม่แปลไทย เพราะศัพท์เวทเทรนนิ่ง
 * คนไทยที่เข้ายิมใช้ทับศัพท์อังกฤษกันอยู่แล้ว และการแปลครึ่ง ๆ กลาง ๆ
 * จะทำให้ค้นหาไม่เจอทั้งสองภาษา
 */

export type RawExercise = {
  id?: string;
  name?: string;
  equipment?: string | null;
  category?: string | null;
  level?: string | null;
  primaryMuscles?: string[];
};

export type MappedExercise = {
  sourceRef: string;
  name: string;
  equipment: string | null;
  category: string | null;
  primaryMuscle: string | null;
  level: string | null;
};

/** คืน null เมื่อรายการนั้นไม่มีชื่อหรือไม่มีรหัสอ้างอิง — ใช้อะไรไม่ได้ */
export function mapExercise(raw: RawExercise): MappedExercise | null {
  const name = raw.name?.trim();
  const sourceRef = raw.id?.trim();
  if (!name || !sourceRef) return null;

  return {
    sourceRef,
    name,
    equipment: raw.equipment?.trim() || null,
    category: raw.category?.trim() || null,
    primaryMuscle: raw.primaryMuscles?.[0]?.trim() || null,
    level: raw.level?.trim() || null,
  };
}

/**
 * ข้อความบรรยายสั้น ๆ ใต้ชื่อท่าในผลค้นหา
 * เรียงจากสิ่งที่ผู้ใช้ใช้ตัดสินใจก่อน: อุปกรณ์ที่ต้องมี แล้วค่อยกล้ามเนื้อที่ใช้
 */
export function describeExercise(exercise: {
  equipment: string | null;
  primaryMuscle: string | null;
  category: string | null;
}): string {
  return [exercise.equipment, exercise.primaryMuscle, exercise.category]
    .filter(Boolean)
    .join(" · ");
}
