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
    <main className="mx-auto w-full max-w-md space-y-4 px-5 pb-6">
      {/* ตรึงหัววันไว้ด้านบน เพื่อให้เลื่อนดูมื้อล่าง ๆ แล้วยังรู้ว่ากำลังดูวันไหนอยู่ */}
      <header className="sticky top-0 z-30 -mx-5 flex items-center justify-between gap-2 border-b border-line bg-background px-5 py-3">
        <Link
          href={`/diary?date=${addDays(date, -1)}`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:text-foreground"
          aria-label="วันก่อนหน้า"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="font-medium">{formatThaiDate(date)}</p>
          {date !== today() && (
            <Link href="/diary" className="text-xs text-brand underline underline-offset-4">
              กลับมาวันนี้
            </Link>
          )}
        </div>
        <Link
          href={`/diary?date=${addDays(date, 1)}`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:text-foreground"
          aria-label="วันถัดไป"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </header>

      <DaySummary totals={day.totals} target={day.target} />

      {MEAL_SLOTS.map((meal) => (
        <MealSection
          key={meal}
          meal={meal}
          date={date}
          entries={day.entriesByMeal[meal]}
          totals={day.mealTotals[meal]}
        />
      ))}

      <MicroList micros={day.totals.micros} />

      {isEmpty && (
        <div className="space-y-3 rounded-2xl border border-dashed border-line px-5 py-6 text-center">
          <p className="text-sm text-muted">วันนี้ยังไม่ได้บันทึกอะไร</p>
          <CopyYesterdayButton date={date} />
        </div>
      )}
    </main>
  );
}
