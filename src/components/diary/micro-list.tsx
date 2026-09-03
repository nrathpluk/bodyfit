import { Card, Eyebrow } from "@/components/ui";
import { Meter } from "./day-summary";
import { microProgress, type MicroKey } from "@/lib/micros";
import type { Micros } from "@/lib/types";

/**
 * สารอาหารรอง — ใช้ <details> แทน state เพื่อให้ย่อ/ขยายได้โดยไม่ต้องส่ง JS ไปฝั่ง client
 *
 * แถบที่นี่เป็นสีหมึก ไม่ใช่สีสด เพราะสิบสี่ตัวนี้ไม่ใช่หมวดที่ต้องแยกจากกันด้วยสี
 * (ชื่อกำกับอยู่แล้วทุกบรรทัด) ให้สีทั้งสิบสี่แถบจะกลายเป็นรุ้งที่ไม่มีความหมาย
 * สีแดงใช้เฉพาะตอนเกินเพดาน ซึ่งเป็นสถานะ ไม่ใช่หมวด
 *
 * แสดงเฉพาะตัวที่มีข้อมูลจริง — "ไม่รู้ค่า" กับ "ได้ศูนย์" คนละความหมาย
 */
export function MicroList({ micros }: { micros: Micros }) {
  const rows = microProgress(micros as Partial<Record<MicroKey, number>>);

  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="min-w-0 flex-1">
            <Eyebrow>สารอาหารรอง</Eyebrow>
            <span className="mt-1 block text-sm text-ink-2">
              {rows.length > 0 ? `มีข้อมูล ${rows.length} จาก 14 ตัว` : "ยังไม่มีข้อมูล"}
            </span>
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-2">
            <span className="group-open:hidden">ดูทั้งหมด</span>
            <span className="hidden group-open:inline">ย่อ</span>
          </span>
        </summary>

        {rows.length === 0 ? (
          <p className="mt-5 text-sm text-ink-3">บันทึกอาหารแล้วตัวเลขจะขึ้นที่นี่</p>
        ) : (
          <ul className="mt-5 space-y-3.5">
            {rows.map((row) => (
              <li key={row.definition.key} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="text-ink-2">{row.definition.label}</span>
                  <span className={`tnum ${row.exceeded ? "text-critical" : "text-ink"}`}>
                    {row.amount.toLocaleString("th-TH", { maximumFractionDigits: 1 })}
                    <span className="text-ink-3">
                      {" "}
                      / {row.definition.reference.toLocaleString("th-TH")} {row.definition.unit}
                    </span>
                  </span>
                </div>
                <Meter ratio={row.ratio} tone={row.exceeded ? "critical" : "ink"} />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 border-t border-line pt-4 text-xs text-ink-3">
          นับเฉพาะอาหารที่มีข้อมูลสารอาหารตัวนั้น ยอดจริงอาจสูงกว่าที่แสดง
        </p>
      </details>
    </Card>
  );
}
