import { DaySets } from "@/components/workouts/day-sets";
import { ExerciseCard } from "@/components/workouts/exercise-card";
import { SetForm } from "@/components/workouts/set-form";
import { Card, Eyebrow } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatThaiDate, today } from "@/lib/dates";
import { getDaySets, getExerciseSummaries, getRecentExerciseNames } from "@/lib/workouts";

export default async function WorkoutsPage() {
  const user = await requireUser();
  const date = today();

  const [daySets, summaries, recentNames] = await Promise.all([
    getDaySets(user.id, date),
    getExerciseSummaries(user.id, 180, date),
    getRecentExerciseNames(user.id),
  ]);

  const withSessions = summaries.filter((exercise) => exercise.sessions.length > 0);

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-6 md:max-w-2xl">
      <header className="space-y-1.5 pt-2">
        <Eyebrow>{formatThaiDate(date)}</Eyebrow>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">ออกกำลังกาย</h1>
        <p className="text-sm leading-relaxed text-ink-2">
          จดท่าที่เล่นกับน้ำหนักที่ยก ไว้ดูว่าแข็งแรงขึ้นหรือเปล่า —
          ไม่นับรวมกับแคลอรีในหน้าอาหาร
        </p>
      </header>

      <Card>
        <Eyebrow>บันทึกเซ็ต</Eyebrow>
        <div className="mt-4">
          <SetForm recentNames={recentNames} />
        </div>
      </Card>

      <Card className="space-y-4">
        <Eyebrow>วันนี้</Eyebrow>
        <DaySets groups={daySets} />
      </Card>

      {withSessions.length === 0 ? (
        <Card className="text-center text-sm text-ink-3">
          บันทึกสักสองสามครั้งแล้วกราฟความก้าวหน้าจะขึ้นที่นี่
        </Card>
      ) : (
        withSessions.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={{
              id: exercise.id,
              name: exercise.name,
              sessions: exercise.sessions,
              progress: exercise.progress,
              lastDate: exercise.lastDate,
              bestEver: exercise.bestEver,
            }}
          />
        ))
      )}
    </main>
  );
}
