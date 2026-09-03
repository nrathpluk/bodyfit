import { Card } from "@/components/ui";
import { AddEntrySheet } from "./add-entry-sheet";
import { EntryRow } from "./entry-row";
import type { DiaryEntry } from "@/lib/diary";
import type { Nutrients } from "@/lib/nutrition";
import { MEAL_LABELS, type MealSlot } from "@/lib/types";

export function MealSection({
  meal,
  date,
  entries,
  totals,
}: {
  meal: MealSlot;
  date: string;
  entries: DiaryEntry[];
  totals: Nutrients;
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">{MEAL_LABELS[meal]}</h2>
        <span className="text-sm tabular-nums text-muted">
          {Math.round(totals.kcal).toLocaleString("th-TH")} kcal
        </span>
      </div>

      {entries.length > 0 && (
        <ul className="divide-y divide-line">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={{
                id: entry.id,
                name: entry.name,
                foodId: entry.foodId,
                grams: entry.grams,
                servingLabel: entry.servingLabel,
                kcal: entry.kcal,
                protein: entry.protein,
                carb: entry.carb,
                fat: entry.fat,
              }}
            />
          ))}
        </ul>
      )}

      <AddEntrySheet meal={meal} date={date} />
    </Card>
  );
}
