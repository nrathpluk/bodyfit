"use client";

import { useTransition } from "react";
import { deleteSetAction } from "@/app/(app)/workouts/actions";
import { Trash } from "@/components/icons";
import { estimateOneRepMax } from "@/lib/strength";

type SetRow = { id: string; weightKg: number; reps: number };
export type DayGroup = { exerciseId: string; name: string; sets: SetRow[] };

export function DaySets({ groups }: { groups: DayGroup[] }) {
  const [pending, startTransition] = useTransition();

  if (groups.length === 0) {
    return <p className="text-sm text-ink-3">วันนี้ยังไม่ได้บันทึกเซ็ตไหนเลย</p>;
  }

  return (
    <div className={`space-y-5 ${pending ? "opacity-60" : ""}`}>
      {groups.map((group) => (
        <section key={group.exerciseId}>
          <h3 className="text-sm font-medium">{group.name}</h3>
          <ul className="mt-1.5 divide-y divide-line">
            {group.sets.map((set, index) => (
              <li key={set.id} className="flex items-center gap-2 py-2">
                <span className="w-6 shrink-0 text-xs text-ink-3">{index + 1}</span>
                <span className="tnum min-w-0 flex-1 text-sm">
                  {set.weightKg} กก. × {set.reps} ครั้ง
                </span>
                <span className="tnum shrink-0 text-xs text-ink-3">
                  ≈ {Math.round(estimateOneRepMax(set))} กก.
                </span>
                <button
                  type="button"
                  aria-label={`ลบเซ็ตที่ ${index + 1} ของ ${group.name}`}
                  disabled={pending}
                  onClick={() => startTransition(async () => void (await deleteSetAction(set.id)))}
                  className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-ink-3 transition-colors duration-200 hover:text-critical"
                >
                  <Trash className="mx-auto h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
