import Link from "next/link";
import { CopyYesterdayButton } from "@/components/diary/copy-yesterday-button";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { DaySummary } from "@/components/diary/day-summary";
import { MealSection } from "@/components/diary/meal-section";
import { MicroList } from "@/components/diary/micro-list";
import { requireUser } from "@/lib/auth";
import { addDays, formatThaiDate, today } from "@/lib/dates";
import { loadDay } from "@/lib/diary";
import { MEAL_SLOTS } from "@/lib/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function DiaryPage({ searchParams }: PageProps<"/diary">) {
  const user = await requireUser();

  // Next.js 16: searchParams เป็น Promise ต้อง await
  const params = await searchParams;
  const raw = Array.isArray(params.date) ? params.date[0] : params.date;
  const date = raw && DATE_PATTERN.test(raw) ? raw : today();

  const day = await loadDay(user.id, date);
  const isEmpty = MEAL_SLOTS.every((meal) => day.entriesByMeal[meal].length === 0);

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-6 md:max-w-2xl xl:max-w-5xl">
      {/* ตรึงหัววันไว้ด้านบน เพื่อให้เลื่อนดูมื้อล่าง ๆ แล้วยังรู้ว่ากำลังดูวันไหนอยู่ */}
      <header className="sticky top-0 z-30 -mx-5 flex items-center justify-between gap-2 border-b border-line bg-paper px-5 py-3">
        <Link
          href={`/diary?date=${addDays(date, -1)}`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-ink-3 transition-colors duration-200 hover:text-ink"
          aria-label="วันก่อนหน้า"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="font-medium">{formatThaiDate(date)}</p>
          {date !== today() && (
            <Link href="/diary" className="text-xs text-ink underline underline-offset-4">
              กลับมาวันนี้
            </Link>
          )}
        </div>
        <Link
          href={`/diary?date=${addDays(date, 1)}`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-ink-3 transition-colors duration-200 hover:text-ink"
          aria-label="วันถัดไป"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </header>

      {/*
        จอกว้าง (xl ขึ้นไป) แยกเป็นสองคอลัมน์ — ยอดรวมอยู่ขวาแบบตรึงไว้
        จะได้เห็นว่าเหลือกินได้อีกเท่าไรตลอดเวลาที่ไล่เพิ่มอาหารในคอลัมน์ซ้าย
        บนมือถือยังเรียงบนลงล่างเหมือนเดิม โดยให้ยอดรวมมาก่อน
      */}
      <div className="gap-6 pt-4 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="space-y-4 xl:order-2 xl:sticky xl:top-20">
          <DaySummary totals={day.totals} target={day.target} />
          <MicroList micros={day.totals.micros} />
        </div>

        <div className="mt-4 space-y-4 xl:order-1 xl:mt-0">
          {MEAL_SLOTS.map((meal) => (
            <MealSection
              key={meal}
              meal={meal}
              date={date}
              entries={day.entriesByMeal[meal]}
              totals={day.mealTotals[meal]}
            />
          ))}

          {isEmpty && (
            <div className="space-y-3 rounded-2xl border border-dashed border-line px-5 py-6 text-center">
              <p className="text-sm text-ink-3">วันนี้ยังไม่ได้บันทึกอะไร</p>
              <CopyYesterdayButton date={date} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
