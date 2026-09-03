import { Card } from "@/components/ui";
import type { DailyTarget, Nutrients } from "@/lib/nutrition";

/** แถบความคืบหน้า — ใช้ทั้งมาโครและไมโคร */
export function Bar({ ratio, tone = "brand" }: { ratio: number; tone?: "brand" | "danger" }) {
  const width = Math.min(100, Math.max(0, ratio * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-background">
      <div
        className={`h-full rounded-full ${tone === "danger" ? "bg-danger" : "bg-brand"}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function MacroRow({
  label,
  eaten,
  target,
}: {
  label: string;
  eaten: number;
  target: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          {Math.round(eaten)}
          <span className="text-muted"> / {Math.round(target)} ก.</span>
        </span>
      </div>
      <Bar ratio={target > 0 ? eaten / target : 0} />
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
    <Card className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted">{over ? "เกินเป้าไปแล้ว" : "กินได้อีก"}</p>
          <p className="text-4xl font-semibold tabular-nums">
            {Math.abs(Math.round(remaining)).toLocaleString("th-TH")}
            <span className="ml-1 text-base font-normal text-muted">kcal</span>
          </p>
        </div>
        <p className="text-right text-sm text-muted">
          กินแล้ว {Math.round(totals.kcal).toLocaleString("th-TH")}
          <br />
          เป้า {target.kcal.toLocaleString("th-TH")}
        </p>
      </div>

      <Bar ratio={totals.kcal / target.kcal} tone={over ? "danger" : "brand"} />

      <div className="space-y-3">
        <MacroRow label="โปรตีน" eaten={totals.protein} target={target.protein} />
        <MacroRow label="คาร์บ" eaten={totals.carb} target={target.carb} />
        <MacroRow label="ไขมัน" eaten={totals.fat} target={target.fat} />
      </div>
    </Card>
  );
}
