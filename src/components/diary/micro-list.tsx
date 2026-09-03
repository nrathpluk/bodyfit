import { Card } from "@/components/ui";
import { Bar } from "./day-summary";
import { microProgress, type MicroKey } from "@/lib/micros";
import type { Micros } from "@/lib/types";

/**
 * สารอาหารรอง — ใช้ <details> แทน state เพื่อให้ย่อ/ขยายได้โดยไม่ต้องส่ง JS ไปฝั่ง client
 *
 * แสดงเฉพาะตัวที่มีข้อมูลจริง ตัวที่อาหารไม่ประกาศค่าไว้จะไม่โผล่
 * เพราะ "ไม่รู้" กับ "ได้ศูนย์" คนละความหมาย และการโชว์ 0 จะทำให้ผู้ใช้เข้าใจผิด
 */
export function MicroList({ micros }: { micros: Micros }) {
  const rows = microProgress(micros as Partial<Record<MicroKey, number>>);

  return (
    <Card>
      <details>
        <summary className="cursor-pointer list-none text-sm font-medium">
          สารอาหารรอง
          <span className="ml-2 font-normal text-muted">
            {rows.length > 0 ? `${rows.length} รายการ` : "ยังไม่มีข้อมูล"}
          </span>
        </summary>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">บันทึกอาหารแล้วตัวเลขจะขึ้นที่นี่</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rows.map((row) => (
              <li key={row.definition.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">{row.definition.label}</span>
                  <span className={`tabular-nums ${row.exceeded ? "text-danger" : ""}`}>
                    {row.amount.toLocaleString("th-TH", { maximumFractionDigits: 1 })}
                    <span className="text-muted">
                      {" "}
                      / {row.definition.reference.toLocaleString("th-TH")} {row.definition.unit}
                    </span>
                  </span>
                </div>
                <Bar ratio={row.ratio} tone={row.exceeded ? "danger" : "brand"} />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-muted">
          นับเฉพาะอาหารที่มีข้อมูลสารอาหารตัวนั้น ยอดจริงอาจสูงกว่าที่แสดง
        </p>
      </details>
    </Card>
  );
}
