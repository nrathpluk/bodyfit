"use client";

import { useState, useTransition } from "react";
import { deleteExerciseHistoryAction } from "@/app/(app)/workouts/actions";
import { Trash, TrendDown, TrendFlat, TrendUp } from "@/components/icons";
import { Alert, Card, Eyebrow } from "@/components/ui";
import { ProgressChart } from "./progress-chart";
import { MIN_SESSIONS_FOR_TREND, type Progress, type SessionPoint } from "@/lib/strength";
import { formatThaiDate } from "@/lib/dates";

export type ExerciseView = {
  id: string;
  name: string;
  detail: string;
  sessions: SessionPoint[];
  progress: Progress | null;
  lastDate: string | null;
  bestEver: number;
};

/**
 * ป้ายบอกทิศทาง — สีมาพร้อมไอคอนและข้อความเสมอ
 * ตามกฎว่าสีสถานะห้ามบอกความหมายลำพัง (คนตาบอดสีต้องอ่านออกเหมือนกัน)
 */
function TrendBadge({ progress }: { progress: Progress }) {
  const config = {
    up: { Icon: TrendUp, label: "ก้าวหน้า", className: "text-good" },
    down: { Icon: TrendDown, label: "ถอยลง", className: "text-critical" },
    flat: { Icon: TrendFlat, label: "คงที่", className: "text-ink-3" },
  }[progress.direction];

  return (
    <span className={`flex items-center gap-1.5 text-xs ${config.className}`}>
      <config.Icon className="h-3.5 w-3.5" />
      {config.label}
      <span className="tnum">
        {progress.percentChange > 0 ? "+" : ""}
        {progress.percentChange}%
      </span>
    </span>
  );
}

export function ExerciseCard({ exercise }: { exercise: ExerciseView }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{exercise.name}</h2>
          {exercise.detail && (
            <p className="mt-0.5 truncate text-xs text-ink-3">{exercise.detail}</p>
          )}
          <p className="mt-0.5 text-xs text-ink-3">
            {exercise.lastDate
              ? `เล่นล่าสุด ${formatThaiDate(exercise.lastDate)} · ${exercise.sessions.length} ครั้ง`
              : "ยังไม่มีการบันทึก"}
          </p>
        </div>
        <button
          type="button"
          aria-label={`ลบประวัติของ ${exercise.name}`}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteExerciseHistoryAction(exercise.id);
              if (!result.ok) setError(result.message);
            })
          }
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-ink-3 transition-colors duration-200 hover:text-critical"
        >
          <Trash className="mx-auto h-4 w-4" />
        </button>
      </div>

      <div className="flex items-end justify-between gap-3 rounded-xl bg-sunken px-3.5 py-3">
        <div>
          <Eyebrow>แรงสูงสุดที่ประมาณได้</Eyebrow>
          <p className="tnum mt-1 text-lg font-medium">
            {Math.round(exercise.bestEver)}
            <span className="text-sm font-normal text-ink-3"> กก.</span>
          </p>
        </div>
        {exercise.progress ? (
          <TrendBadge progress={exercise.progress} />
        ) : (
          <span className="text-xs text-ink-3">
            บันทึกครบ {MIN_SESSIONS_FOR_TREND} ครั้งจะเริ่มบอกแนวโน้ม
          </span>
        )}
      </div>

      <ProgressChart sessions={exercise.sessions} />

      {exercise.progress && (
        <p className="text-xs text-ink-3">
          {exercise.progress.direction === "up"
            ? `กำลังไปได้ดี เพิ่มขึ้นราว ${exercise.progress.perWeekKg} กก./สัปดาห์`
            : exercise.progress.direction === "down"
              ? `ถอยลงราว ${Math.abs(exercise.progress.perWeekKg)} กก./สัปดาห์ — อาจถึงเวลาพัก หรือลดปริมาณลงสักช่วง`
              : "ยังไม่ขยับ ลองเพิ่มน้ำหนักหรือจำนวนครั้งขึ้นอีกนิด"}
        </p>
      )}

      {error && <Alert>{error}</Alert>}
    </Card>
  );
}
