import Link from "next/link";
import { redirect } from "next/navigation";
import { DaySummary } from "@/components/diary/day-summary";
import { MicroList } from "@/components/diary/micro-list";
import { Card, Eyebrow } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatThaiDate, today } from "@/lib/dates";
import { getLoggingStreak, loadDay } from "@/lib/diary";
import { getProfile } from "@/lib/profile";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");

  const date = today();
  const [day, streak] = await Promise.all([
    loadDay(user.id, date),
    getLoggingStreak(user.id, 7, date),
  ]);
  // มีโปรไฟล์แต่ยังไม่เคยชั่งน้ำหนัก = ทำ onboarding ไม่จบ
  if (!day.target) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-6 md:max-w-2xl xl:max-w-5xl">
      <header className="space-y-1.5 pt-2">
        <Eyebrow>{formatThaiDate(date)}</Eyebrow>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
          {profile.displayName ? `สวัสดี ${profile.displayName}` : "วันนี้กินอะไรบ้าง"}
        </h1>
      </header>

      {/* หน้านี้ตอบคำถามเดียว: วันนี้เหลือกินได้อีกเท่าไร ไม่ใช่แค่แสดงเป้าที่ตั้งไว้ */}
      <div className="gap-4 xl:grid xl:grid-cols-2 xl:items-start xl:space-y-0">
        <div className="space-y-4">
          <DaySummary totals={day.totals} target={day.target} />

          <Link
            href="/diary"
            className="block min-h-[52px] cursor-pointer rounded-2xl bg-ink px-4 py-4 text-center text-[15px] font-medium text-paper transition-opacity duration-200 hover:opacity-90"
          >
            บันทึกอาหารวันนี้
          </Link>
        </div>

        <div className="mt-4 space-y-4 xl:mt-0">
          <MicroList micros={day.totals.micros} />
          {/*
            รายงานเป็น "x จาก 7 วัน" ไม่ใช่ streak ที่ขาดแล้วรีเซ็ตเป็นศูนย์
            งานวิจัยเรื่องการติดตามอาหารชี้ว่าการบันทึกต่อเนื่องแบบหยาบ ๆ
            ได้ผลกว่าบันทึกละเอียดแล้วเลิก และ streak ที่ขาดคือจุดที่คนเลิกใช้แอป
          */}
          <Card className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <Eyebrow>ความสม่ำเสมอ</Eyebrow>
              <span className="tnum text-sm text-ink-2">
                {streak.loggedDays}
                <span className="text-ink-3"> / {streak.windowDays} วัน</span>
              </span>
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {Array.from({ length: streak.windowDays }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 flex-1 rounded-[2px] ${
                    index < streak.loggedDays ? "bg-ink" : "bg-sunken"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-ink-3">
              บันทึกได้บ้างไม่ได้บ้างก็ยังนับ — ความต่อเนื่องสำคัญกว่าความครบถ้วน
            </p>
          </Card>

          <Card>
            <p className="text-sm text-ink-3">
              พลังงานพื้นฐาน (BMR) {day.target.basis.bmr.toLocaleString("th-TH")} kcal ·
              ใช้จริงต่อวัน (TDEE) {day.target.basis.tdee.toLocaleString("th-TH")} kcal
            </p>
            <p className="mt-2 text-xs text-ink-3">
              คิดจากน้ำหนัก {day.target.basis.weightKg} กก. อายุ {day.target.basis.ageYears} ปี
              ด้วยสูตร Mifflin-St Jeor
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
