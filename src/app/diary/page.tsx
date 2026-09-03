import Link from "next/link";
import { CopyYesterdayButton } from "@/components/diary/copy-yesterday-button";
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
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-6 pb-16">
      <header className="flex items-center justify-between gap-2">
        <Link
          href={`/diary?date=${addDays(date, -1)}`}
          className="min-h-[44px] px-2 py-2 text-muted"
          aria-label="วันก่อนหน้า"
        >
          ←
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
          className="min-h-[44px] px-2 py-2 text-muted"
          aria-label="วันถัดไป"
        >
          →
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

      {isEmpty && <CopyYesterdayButton date={date} />}

      <nav className="pt-2 text-center text-sm">
        <Link href="/dashboard" className="text-muted underline underline-offset-4">
          กลับหน้าสรุป
        </Link>
      </nav>
    </main>
  );
}
