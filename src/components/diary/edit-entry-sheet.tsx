"use client";

import { useEffect, useState, useTransition } from "react";
import { updateAmountAction, updateQuickEntryAction } from "@/app/(app)/diary/actions";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { localizeServingLabel } from "@/lib/servings";
import { SheetShell } from "./sheet-shell";

type Serving = { id: string; label: string; grams: number };

export type EditableEntry = {
  id: string;
  name: string;
  foodId: string | null;
  grams: number | null;
  servingLabel: string | null;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
};

/**
 * แก้รายการที่บันทึกไปแล้ว
 *
 * เดิมกรอกผิดต้องลบทิ้งแล้วเพิ่มใหม่ ซึ่งทำให้ลำดับในไดอารีสลับ
 * และเสี่ยงกดลบผิดรายการเมื่อมีอาหารชื่อคล้ายกันหลายอัน
 */
export function EditEntrySheet({
  entry,
  onClose,
}: {
  entry: EditableEntry;
  onClose: () => void;
}) {
  const [servings, setServings] = useState<Serving[]>([]);
  const [useServing, setUseServing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!entry.foodId) return;
    let cancelled = false;
    fetch(`/api/foods/${entry.foodId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setServings(data.food.servings ?? []);
      })
      .catch(() => {
        // ไม่มีหน่วยครัวก็ยังแก้เป็นกรัมได้ ไม่ต้องรบกวนผู้ใช้
      });
    return () => {
      cancelled = true;
    };
  }, [entry.foodId]);

  function submit(formData: FormData, action: typeof updateAmountAction) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) onClose();
      else setError(result.message);
    });
  }

  const isQuickEntry = entry.foodId === null;

  return (
    <SheetShell title={`แก้ไข ${entry.name}`} onClose={onClose}>
      {isQuickEntry ? (
        <form
          action={(formData) => submit(formData, updateQuickEntryAction)}
          className="space-y-5"
        >
          <input type="hidden" name="entryId" value={entry.id} />
          <Field label="ชื่ออาหาร">
            <Input name="name" defaultValue={entry.name} required maxLength={120} />
          </Field>
          <Field label="พลังงาน (kcal)">
            <Input
              type="number"
              name="kcal"
              defaultValue={entry.kcal}
              required
              min="0"
              step="1"
              inputMode="decimal"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="โปรตีน">
              <Input type="number" name="protein" defaultValue={entry.protein} min="0" step="0.1" />
            </Field>
            <Field label="คาร์บ">
              <Input type="number" name="carb" defaultValue={entry.carb} min="0" step="0.1" />
            </Field>
            <Field label="ไขมัน">
              <Input type="number" name="fat" defaultValue={entry.fat} min="0" step="0.1" />
            </Field>
          </div>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={pending}>
            {pending ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
          </Button>
        </form>
      ) : (
        <form action={(formData) => submit(formData, updateAmountAction)} className="space-y-5">
          <input type="hidden" name="entryId" value={entry.id} />

          <p className="text-sm text-ink-3">
            ตอนนี้บันทึกไว้ {entry.servingLabel ? localizeServingLabel(entry.servingLabel) : ""}
            {entry.grams ? ` (${Math.round(entry.grams)} กรัม)` : ""} · {Math.round(entry.kcal)} kcal
          </p>

          {servings.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseServing(true)}
                className={`min-h-[44px] cursor-pointer rounded-xl border text-sm transition-colors duration-200 ${useServing ? "border-ink bg-ink text-paper" : "border-line"}`}
              >
                หน่วยครัว
              </button>
              <button
                type="button"
                onClick={() => setUseServing(false)}
                className={`min-h-[44px] cursor-pointer rounded-xl border text-sm transition-colors duration-200 ${useServing ? "border-line" : "border-ink bg-ink text-paper"}`}
              >
                ชั่งเป็นกรัม
              </button>
            </div>
          )}

          {useServing && servings.length > 0 ? (
            <>
              <Field label="หน่วย">
                <Select name="servingId" defaultValue={servings[0].id}>
                  {servings.map((serving) => (
                    <option key={serving.id} value={serving.id}>
                      {localizeServingLabel(serving.label)} ({Math.round(serving.grams)} ก.)
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="จำนวน">
                <Input
                  type="number"
                  name="quantity"
                  defaultValue="1"
                  step="0.5"
                  min="0.5"
                  inputMode="decimal"
                />
              </Field>
            </>
          ) : (
            <Field label="น้ำหนักใหม่ (กรัม)">
              <Input
                type="number"
                name="grams"
                defaultValue={entry.grams ? Math.round(entry.grams) : 100}
                step="1"
                min="1"
                inputMode="decimal"
                required
                autoFocus
              />
            </Field>
          )}

          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={pending}>
            {pending ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
          </Button>
        </form>
      )}
    </SheetShell>
  );
}
