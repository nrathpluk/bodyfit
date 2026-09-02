/**
 * ชุดสารอาหารรองที่ระบบติดตาม — 14 ตัว
 *
 * ทำไมไม่เก็บให้ครบทุกตัวที่ USDA มี (100+): อาหารไทยที่ต้องกรอกมือทีหลัง
 * แทบไม่มีข้อมูลไมโครหายากพวกนั้น เก็บไว้ก็จะเป็นช่องว่างเปล่าเต็มไปหมด
 * และหน้าจอมือถือแสดงได้จริงประมาณนี้ (MyFitnessPal เองแสดง ~14 ตัวเท่ากัน)
 *
 * คีย์ในนี้คือคีย์ที่ใช้จริงใน jsonb ของ foods.micros และ diary_entries.micros
 * เปลี่ยนชื่อคีย์ = ข้อมูลเก่าอ่านไม่ออก ต้องเขียน migration แปลงข้อมูลด้วย
 */

export type MicroKey =
  | "fiber_g"
  | "sugar_g"
  | "saturated_fat_g"
  | "cholesterol_mg"
  | "sodium_mg"
  | "potassium_mg"
  | "calcium_mg"
  | "iron_mg"
  | "magnesium_mg"
  | "zinc_mg"
  | "vitamin_a_mcg"
  | "vitamin_c_mg"
  | "vitamin_d_mcg"
  | "vitamin_b12_mcg";

export type MicroDefinition = {
  key: MicroKey;
  label: string;
  unit: "g" | "mg" | "mcg";
  /**
   * goal = ควรได้ถึง (แสดงเป็น % ของเป้า)
   * limit = ไม่ควรเกิน (แสดงเป็นแถบที่เปลี่ยนสีเมื่อเกิน)
   * ตัวเลขอ้าง Thai RDI ของ อย. ซึ่งคิดบนฐานพลังงาน 2,000 kcal/วัน
   */
  kind: "goal" | "limit";
  reference: number;
  /** รหัสสารอาหารของ USDA FoodData Central — ใช้ตอน import */
  usdaNumber: string;
};

export const MICROS: MicroDefinition[] = [
  { key: "fiber_g", label: "ใยอาหาร", unit: "g", kind: "goal", reference: 25, usdaNumber: "291" },
  { key: "sugar_g", label: "น้ำตาล", unit: "g", kind: "limit", reference: 65, usdaNumber: "269" },
  { key: "saturated_fat_g", label: "ไขมันอิ่มตัว", unit: "g", kind: "limit", reference: 20, usdaNumber: "606" },
  { key: "cholesterol_mg", label: "คอเลสเตอรอล", unit: "mg", kind: "limit", reference: 300, usdaNumber: "601" },
  { key: "sodium_mg", label: "โซเดียม", unit: "mg", kind: "limit", reference: 2400, usdaNumber: "307" },
  { key: "potassium_mg", label: "โพแทสเซียม", unit: "mg", kind: "goal", reference: 3500, usdaNumber: "306" },
  { key: "calcium_mg", label: "แคลเซียม", unit: "mg", kind: "goal", reference: 800, usdaNumber: "301" },
  { key: "iron_mg", label: "ธาตุเหล็ก", unit: "mg", kind: "goal", reference: 15, usdaNumber: "303" },
  { key: "magnesium_mg", label: "แมกนีเซียม", unit: "mg", kind: "goal", reference: 350, usdaNumber: "304" },
  { key: "zinc_mg", label: "สังกะสี", unit: "mg", kind: "goal", reference: 15, usdaNumber: "309" },
  { key: "vitamin_a_mcg", label: "วิตามินเอ", unit: "mcg", kind: "goal", reference: 800, usdaNumber: "320" },
  { key: "vitamin_c_mg", label: "วิตามินซี", unit: "mg", kind: "goal", reference: 60, usdaNumber: "401" },
  { key: "vitamin_d_mcg", label: "วิตามินดี", unit: "mcg", kind: "goal", reference: 5, usdaNumber: "328" },
  { key: "vitamin_b12_mcg", label: "วิตามินบี 12", unit: "mcg", kind: "goal", reference: 2, usdaNumber: "418" },
];

export const MICRO_BY_KEY: Record<MicroKey, MicroDefinition> = Object.fromEntries(
  MICROS.map((micro) => [micro.key, micro]),
) as Record<MicroKey, MicroDefinition>;

/** แปลงรหัส USDA → คีย์ของเรา (ใช้ตอน import) */
export const USDA_NUMBER_TO_MICRO: Record<string, MicroKey> = Object.fromEntries(
  MICROS.map((micro) => [micro.usdaNumber, micro.key]),
);

export type MicroProgress = {
  definition: MicroDefinition;
  amount: number;
  /** สัดส่วนเทียบค่าอ้างอิง 0–1 (เกินเป้าแล้วยังโตต่อได้ ใช้ตัดสินสีในหน้าจอ) */
  ratio: number;
  /** เกินค่าที่ไม่ควรเกิน — ใช้เฉพาะ kind = limit */
  exceeded: boolean;
};

/**
 * เทียบยอดไมโครที่กินไปกับค่าอ้างอิง
 *
 * ไมโครที่ไม่มีคีย์ในยอดรวม = อาหารที่กินไม่มีข้อมูลตัวนั้น ไม่ใช่กินได้ศูนย์
 * จึงไม่คืนออกมาเลย เพื่อให้หน้าจอแยกได้ระหว่าง "ยังไม่ได้กิน" กับ "ไม่รู้"
 */
export function microProgress(totals: Partial<Record<MicroKey, number>>): MicroProgress[] {
  const result: MicroProgress[] = [];
  for (const definition of MICROS) {
    const amount = totals[definition.key];
    if (amount === undefined) continue;
    const ratio = definition.reference > 0 ? amount / definition.reference : 0;
    result.push({
      definition,
      amount,
      ratio,
      exceeded: definition.kind === "limit" && amount > definition.reference,
    });
  }
  return result;
}
