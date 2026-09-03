import Link from "next/link";
import { redirect } from "next/navigation";
import { DaySummary } from "@/components/diary/day-summary";
import { MicroList } from "@/components/diary/micro-list";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatThaiDate, today } from "@/lib/dates";
import { loadDay } from "@/lib/diary";
import { getProfile } from "@/lib/profile";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");

  const date = today();
  const day = await loadDay(user.id, date);
  // มีโปรไฟล์แต่ยังไม่เคยชั่งน้ำหนัก = ทำ onboarding ไม่จบ
  if (!day.target) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-6">
      <header>
        <p className="text-sm text-muted">{formatThaiDate(date)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile.displayName ? `สวัสดี ${profile.displayName}` : "วันนี้กินอะไรบ้าง"}
        </h1>
      </header>

      {/* หน้านี้ตอบคำถามเดียว: วันนี้เหลือกินได้อีกเท่าไร ไม่ใช่แค่แสดงเป้าที่ตั้งไว้ */}
      <DaySummary totals={day.totals} target={day.target} />

      <Link
        href="/diary"
        className="block min-h-[52px] cursor-pointer rounded-2xl bg-brand px-4 py-4 text-center font-medium text-white transition-colors duration-200 hover:bg-brand-strong"
      >
        บันทึกอาหารวันนี้
      </Link>

      <MicroList micros={day.totals.micros} />

      <Card>
        <p className="text-sm text-muted">
          พลังงานพื้นฐาน (BMR) {day.target.basis.bmr.toLocaleString("th-TH")} kcal ·
          ใช้จริงต่อวัน (TDEE) {day.target.basis.tdee.toLocaleString("th-TH")} kcal
        </p>
        <p className="mt-2 text-xs text-muted">
          คิดจากน้ำหนัก {day.target.basis.weightKg} กก. อายุ {day.target.basis.ageYears} ปี
          ด้วยสูตร Mifflin-St Jeor
        </p>
      </Card>
    </main>
  );
}
