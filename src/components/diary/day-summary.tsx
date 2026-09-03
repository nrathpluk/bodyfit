import { Card } from "@/components/ui";
import type { DailyTarget, Nutrients } from "@/lib/nutrition";

/**
 * ยอดของวัน — วงแหวนพลังงานเป็นตัวเอกของหน้าจอ
 *
 * ตัวเลขเดียวที่ผู้ใช้อยากรู้ตอนเปิดแอปคือ "วันนี้กินได้อีกเท่าไร" จึงทำเป็น
 * hero number กลางวงแหวน ไม่ใช่แถบยาว ๆ ปนกับตัวอื่น
 *
 * วงแหวนใช้สีหมึก ไม่ใช่สีสด เพราะพลังงานรวมไม่ใช่ "หมวดหนึ่งในหลายหมวด"
 * ถ้าให้สีมันด้วย จะแข่งกับสีของสารอาหารสามตัวข้างล่างที่สีมีความหมายจริง
 * ยกเว้นตอนเกินเป้า ซึ่งเปลี่ยนเป็นสีเตือน พร้อมข้อความกำกับ ไม่ใช้สีลอย ๆ
 */

const RADIUS = 68;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Ring({ ratio, over }: { ratio: number; over: boolean }) {
  const filled = Math.min(1, Math.max(0, ratio));
  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90" aria-hidden="true">
      <circle
        cx="80"
        cy="80"
        r={RADIUS}
        fill="none"
        stroke="var(--sunken)"
        strokeWidth="12"
      />
      <circle
        cx="80"
        cy="80"
        r={RADIUS}
        fill="none"
        stroke={over ? "var(--critical)" : "var(--ink)"}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - filled)}
      />
    </svg>
  );
}

function MacroMeter({
  label,
  eaten,
  target,
  color,
}: {
  label: string;
  eaten: number;
  target: number;
  color: string;
}) {
  const ratio = target > 0 ? Math.min(1, eaten / target) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="flex items-center gap-2 text-ink-2">
          {/* จุดสีคู่กับชื่อเสมอ — ห้ามให้สีเป็นตัวบอกความหมายเพียงลำพัง */}
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="tnum text-ink">
          {Math.round(eaten)}
          <span className="text-ink-3"> / {Math.round(target)} ก.</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-[2px] bg-sunken">
        <div
          className="h-full rounded-r-[4px]"
          style={{ width: `${ratio * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function DaySummary({ totals, target }: { totals: Nutrients; target: DailyTarget | null }) {
  if (!target) {
    return <Card>ยังไม่ได้ตั้งเป้าหมาย — ไปที่หน้าตั้งค่าก่อน</Card>;
  }

  const remaining = target.kcal - totals.kcal;
  const over = remaining < 0;

  return (
    <Card className="space-y-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <div className="relative shrink-0">
          <Ring ratio={totals.kcal / target.kcal} over={over} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`tnum text-[34px] font-semibold leading-none ${over ? "text-critical" : "text-ink"}`}>
              {Math.abs(Math.round(remaining)).toLocaleString("th-TH")}
            </span>
            <span className="mt-1.5 text-[11px] text-ink-3">
              {over ? "kcal ที่เกินเป้า" : "kcal ที่กินได้อีก"}
            </span>
          </div>
        </div>

        <dl className="grid w-full grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl bg-sunken px-3 py-2.5">
            <dt className="text-[11px] text-ink-3">กินแล้ว</dt>
            <dd className="tnum mt-0.5 text-lg font-medium">
              {Math.round(totals.kcal).toLocaleString("th-TH")}
            </dd>
          </div>
          <div className="rounded-xl bg-sunken px-3 py-2.5">
            <dt className="text-[11px] text-ink-3">เป้าวันนี้</dt>
            <dd className="tnum mt-0.5 text-lg font-medium">
              {target.kcal.toLocaleString("th-TH")}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3.5">
        <MacroMeter
          label="โปรตีน"
          eaten={totals.protein}
          target={target.protein}
          color="var(--protein)"
        />
        <MacroMeter label="คาร์บ" eaten={totals.carb} target={target.carb} color="var(--carb)" />
        <MacroMeter label="ไขมัน" eaten={totals.fat} target={target.fat} color="var(--fat)" />
      </div>
    </Card>
  );
}

/** แถบวัดบาง ๆ ใช้ซ้ำในรายการสารอาหารรอง */
export function Meter({ ratio, tone = "ink" }: { ratio: number; tone?: "ink" | "critical" }) {
  const width = Math.min(100, Math.max(0, ratio * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-[2px] bg-sunken">
      <div
        className={`h-full rounded-r-[4px] ${tone === "critical" ? "bg-critical" : "bg-ink-2"}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
