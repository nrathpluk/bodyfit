import { Card, Eyebrow } from "@/components/ui";
import { WeightChart } from "@/components/weight/weight-chart";
import { WeightForm } from "@/components/weight/weight-form";
import { requireUser } from "@/lib/auth";
import { today } from "@/lib/dates";
import { getIntakeStats } from "@/lib/diary";
import { ensureDailyTarget } from "@/lib/profile";
import { MIN_POINTS_FOR_TREND, latestTrend, weeklyChangeKg } from "@/lib/weight";
import { getLastWeightLog, getWeightTrend } from "@/lib/weight-queries";
import { MIN_LOGGED_DAYS } from "@/lib/adaptive";

export default async function WeightPage() {
  const user = await requireUser();
  const date = today();

  const [trend, lastLog, target, intake] = await Promise.all([
    getWeightTrend(user.id, 90, date),
    getLastWeightLog(user.id),
    ensureDailyTarget(user.id, date),
    getIntakeStats(user.id, 28, date),
  ]);

  const current = latestTrend(trend);
  const weekly = weeklyChangeKg(trend);
  const basis = target?.basis;

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-6 md:max-w-2xl">
      <header className="space-y-1.5 pt-2">
        <Eyebrow>น้ำหนัก</Eyebrow>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
          {current !== null ? `${current.toFixed(1)} กก.` : "ยังไม่มีข้อมูล"}
        </h1>
        {current !== null && (
          <p className="text-sm text-ink-2">
            เป็นน้ำหนักแนวโน้ม ไม่ใช่ตัวเลขบนตาชั่งของวันนี้
          </p>
        )}
      </header>

      <Card className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>90 วันล่าสุด</Eyebrow>
          {weekly !== null && (
            <span className="tnum text-sm text-ink-2">
              {weekly > 0 ? "+" : ""}
              {weekly.toFixed(2)}
              <span className="text-ink-3"> กก./สัปดาห์</span>
            </span>
          )}
        </div>
        <WeightChart points={trend} />
        {weekly === null && trend.length > 0 && (
          <p className="text-xs text-ink-3">
            ชั่งให้ครบ {MIN_POINTS_FOR_TREND} ครั้งแล้วระบบจะเริ่มบอกอัตราการเปลี่ยนต่อสัปดาห์
          </p>
        )}
      </Card>

      <Card>
        <Eyebrow>ชั่งวันนี้</Eyebrow>
        <div className="mt-4">
          <WeightForm defaultWeight={lastLog?.weightKg} />
        </div>
      </Card>

      {basis && (
        <Card className="space-y-2">
          <Eyebrow>เป้าพลังงานของคุณ</Eyebrow>
          <p className="tnum text-lg font-medium">
            {basis.tdee.toLocaleString("th-TH")}
            <span className="text-sm font-normal text-ink-3"> kcal ที่ใช้จริงต่อวัน</span>
          </p>
          <p className="text-sm leading-relaxed text-ink-2">
            {basis.tdeeSource === "blended"
              ? "คำนวณจากอาหารที่คุณบันทึกเทียบกับน้ำหนักจริง ไม่ใช่จากสูตรอย่างเดียว"
              : `ตอนนี้ใช้ค่าจากสูตร — บันทึกอาหารและชั่งน้ำหนักให้ครบ ${MIN_LOGGED_DAYS} วัน แล้วระบบจะปรับเป้าตามร่างกายจริงของคุณ`}
          </p>
          <p className="text-xs text-ink-3">
            28 วันที่ผ่านมา บันทึกอาหารไป {intake.loggedDays} วัน
            {intake.loggedDays > 0 && ` เฉลี่ยวันละ ${intake.avgIntakeKcal.toLocaleString("th-TH")} kcal`}
          </p>
        </Card>
      )}
    </main>
  );
}
