"use client";

import { useEffect, useState, useTransition } from "react";
import { addSetAction } from "@/app/(app)/workouts/actions";
import { Alert, Button, Field, Input } from "@/components/ui";
import { describeExercise } from "@/lib/exercise-catalog";

type ExerciseHit = {
  id: string;
  name: string;
  equipment: string | null;
  category: string | null;
  primaryMuscle: string | null;
  isCustom: boolean;
};

type RecentExercise = { id: string; name: string };

/**
 * ฟอร์มบันทึกเซ็ต — ค้นจากคลัง 876 ท่าก่อน ถ้าไม่มีค่อยพิมพ์ชื่อเอง
 *
 * ที่ต้องเป็นการค้นหาไม่ใช่ช่องพิมพ์เปล่า ๆ เพราะถ้าพิมพ์เองทุกครั้ง
 * "Bench Press" กับ "bench press" จะกลายเป็นสองท่าที่กราฟแยกกัน
 *
 * ไม่มีช่องแคลอรีโดยตั้งใจ — พลังงานที่เผาถูกคิดรวมในตัวคูณกิจกรรมของ TDEE แล้ว
 */
export function SetForm({ recent }: { recent: RecentExercise[] }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ExerciseHit[]>([]);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const results = query.trim().length < 2 ? [] : hits;

  useEffect(() => {
    if (picked || query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/exercises/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setHits(data.exercises ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, picked]);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await addSetAction(formData);
          if (result.ok) {
            setQuery("");
            setHits([]);
          } else {
            setError(result.message);
          }
        });
      }}
      className="space-y-4"
    >
      {picked ? (
        <input type="hidden" name="exerciseId" value={picked.id} />
      ) : (
        query.trim().length > 0 && <input type="hidden" name="exerciseName" value={query.trim()} />
      )}

      {recent.length > 0 && !picked && (
        <div className="flex flex-wrap gap-2">
          {recent.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPicked(item)}
              className="min-h-[36px] cursor-pointer rounded-full border border-line px-3 text-xs text-ink-2 transition-colors duration-200 hover:border-line-strong hover:text-ink"
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      {picked ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-sunken px-3.5 py-3">
          <span className="min-w-0 truncate text-sm font-medium">{picked.name}</span>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setQuery("");
            }}
            className="shrink-0 cursor-pointer text-xs text-ink-3 underline underline-offset-4"
          >
            เปลี่ยนท่า
          </button>
        </div>
      ) : (
        <>
          <Field label="ท่า" hint="พิมพ์ภาษาอังกฤษ เช่น bench, squat, curl">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาจากคลัง 876 ท่า"
              autoComplete="off"
              maxLength={80}
            />
          </Field>

          {searching && <p className="text-sm text-ink-3">กำลังค้นหา…</p>}

          {results.length > 0 && (
            <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {results.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(hit)}
                    className="flex min-h-[52px] w-full cursor-pointer flex-col justify-center gap-0.5 px-3 py-2 text-left transition-colors duration-200 hover:bg-sunken"
                  >
                    <span className="truncate text-sm">{hit.name}</span>
                    <span className="truncate text-xs text-ink-3">
                      {hit.isCustom ? "ท่าที่คุณสร้างเอง" : describeExercise(hit)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-ink-3">
              ไม่พบในคลัง — กดบันทึกได้เลย ระบบจะสร้างท่า “{query.trim()}” ให้เป็นท่าของคุณเอง
            </p>
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="น้ำหนัก (กก.)" hint="บอดี้เวทใส่ 0 ได้">
          <Input
            type="number"
            name="weightKg"
            step="0.5"
            min="0"
            max="1000"
            inputMode="decimal"
            required
          />
        </Field>
        <Field label="จำนวนครั้ง">
          <Input type="number" name="reps" step="1" min="1" max="100" inputMode="numeric" required />
        </Field>
      </div>

      {error && <Alert>{error}</Alert>}

      <Button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึกเซ็ต"}
      </Button>
    </form>
  );
}
