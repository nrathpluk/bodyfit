"use client";

import { useEffect, useState, useTransition } from "react";
import { addFoodAction, addQuickAction } from "@/app/(app)/diary/actions";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { Close, Plus, ScanIcon } from "@/components/icons";
import { BarcodeScanner, type ScannedFood } from "./barcode-scanner";
import type { MealSlot } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";
import { localizeServingLabel } from "@/lib/servings";

type FoodHit = {
  id: string;
  name: string;
  nameTh: string | null;
  kcalPer100g: number;
};

type Serving = { id: string; label: string; grams: number; isDefault: boolean };
type FoodDetail = FoodHit & { servings: Serving[] };

/**
 * แผ่นบันทึกอาหาร — ค้นหา → เลือก → ระบุปริมาณ
 *
 * ออกแบบให้จบใน 3 แตะ เพราะถ้าบันทึกมื้อหนึ่งใช้เวลาเกิน 15 วินาที
 * ผู้ใช้จะเลิกใช้ภายในสัปดาห์เดียว (บทเรียนจากแอปนับแคลทุกตัว)
 */
export function AddEntrySheet({ meal, date }: { meal: MealSlot; date: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-sm text-muted transition-colors duration-200 hover:border-brand hover:text-brand"
      >
        <Plus className="h-4 w-4" />
        เพิ่มอาหาร
      </button>
      {open && <Sheet meal={meal} date={date} onClose={() => setOpen(false)} />}
    </>
  );
}

function Sheet({
  meal,
  date,
  onClose,
}: {
  meal: MealSlot;
  date: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [selected, setSelected] = useState<FoodDetail | null>(null);
  const [searching, setSearching] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // คำค้นสั้นเกินไปให้ถือว่าไม่มีผลลัพธ์ คำนวณตอน render ไม่ต้องล้าง state ใน effect
  const results = query.trim().length < 2 ? [] : hits;

  // หน่วงก่อนยิงค้นหา ไม่งั้นพิมพ์คำเดียวยิงฐานข้อมูลสิบครั้ง
  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/foods/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setHits(data.foods ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function selectFood(food: FoodHit) {
    const response = await fetch(`/api/foods/${food.id}`);
    if (!response.ok) return setError("เปิดรายการนี้ไม่ได้");
    const data = await response.json();
    setSelected({ ...food, servings: data.food.servings ?? [] });
  }

  function submit(formData: FormData, action: typeof addFoodAction) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) onClose();
      else setError(result.message);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-base font-medium">
          เพิ่มลง{MEAL_LABELS[meal]}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="min-h-[44px] min-w-[44px] rounded-lg px-2 text-muted transition-colors duration-200 hover:text-foreground"
        >
          <Close className="mx-auto h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {selected ? (
          <QuantityForm
            food={selected}
            meal={meal}
            date={date}
            pending={pending}
            onBack={() => setSelected(null)}
            onSubmit={(formData) => submit(formData, addFoodAction)}
          />
        ) : scanMode ? (
          <BarcodeScanner
            onCancel={() => setScanMode(false)}
            onFound={(food: ScannedFood) => {
              setScanMode(false);
              setSelected(food);
            }}
          />
        ) : quickMode ? (
          <QuickForm
            meal={meal}
            date={date}
            pending={pending}
            onBack={() => setQuickMode(false)}
            onSubmit={(formData) => submit(formData, addQuickAction)}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาอาหาร เช่น ข้าวสวย, egg"
                enterKeyHint="search"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setScanMode(true)}
                aria-label="สแกนบาร์โค้ด"
                className="flex min-h-[48px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-line px-4 text-sm transition-colors duration-200 hover:border-brand hover:text-brand"
              >
                <ScanIcon className="h-4 w-4" />
                สแกน
              </button>
            </div>

            {searching && <p className="text-sm text-muted">กำลังค้นหา…</p>}

            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <p className="text-sm text-muted">ไม่พบอาหารที่ค้นหา</p>
            )}

            <ul className="divide-y divide-line">
              {results.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    onClick={() => selectFood(food)}
                    className="flex min-h-[56px] w-full items-center justify-between gap-3 py-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{food.nameTh ?? food.name}</span>
                      {food.nameTh && (
                        <span className="block truncate text-xs text-muted">{food.name}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted">
                      {Math.round(food.kcalPer100g)} kcal/100ก.
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setQuickMode(true)}
              className="text-sm text-brand underline underline-offset-4"
            >
              ไม่มีในคลัง — กรอกแคลเอง
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}
      </div>
    </div>
  );
}

function QuantityForm({
  food,
  meal,
  date,
  pending,
  onBack,
  onSubmit,
}: {
  food: FoodDetail;
  meal: MealSlot;
  date: string;
  pending: boolean;
  onBack: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [useServing, setUseServing] = useState(food.servings.length > 0);

  return (
    <form action={onSubmit} className="space-y-5">
      <input type="hidden" name="entryDate" value={date} />
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="foodId" value={food.id} />

      <div>
        <button type="button" onClick={onBack} className="text-sm text-muted">
          ← เลือกอาหารอื่น
        </button>
        <h3 className="mt-2 text-lg font-medium">{food.nameTh ?? food.name}</h3>
        <p className="text-sm text-muted">{Math.round(food.kcalPer100g)} kcal ต่อ 100 กรัม</p>
      </div>

      {food.servings.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setUseServing(true)}
            className={`min-h-[44px] rounded-xl border text-sm ${useServing ? "border-brand bg-brand text-white" : "border-line"}`}
          >
            หน่วยครัว
          </button>
          <button
            type="button"
            onClick={() => setUseServing(false)}
            className={`min-h-[44px] rounded-xl border text-sm ${useServing ? "border-line" : "border-brand bg-brand text-white"}`}
          >
            ชั่งเป็นกรัม
          </button>
        </div>
      )}

      {useServing && food.servings.length > 0 ? (
        <>
          <Field label="หน่วย">
            <Select name="servingId" defaultValue={food.servings[0].id}>
              {food.servings.map((serving) => (
                <option key={serving.id} value={serving.id}>
                  {localizeServingLabel(serving.label)} ({Math.round(serving.grams)} ก.)
                </option>
              ))}
            </Select>
          </Field>
          <Field label="จำนวน">
            <Input type="number" name="quantity" defaultValue="1" step="0.5" min="0.5" inputMode="decimal" />
          </Field>
        </>
      ) : (
        <Field label="น้ำหนัก (กรัม)">
          <Input type="number" name="grams" defaultValue="100" step="1" min="1" inputMode="decimal" required />
        </Field>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึก"}
      </Button>
    </form>
  );
}

function QuickForm({
  meal,
  date,
  pending,
  onBack,
  onSubmit,
}: {
  meal: MealSlot;
  date: string;
  pending: boolean;
  onBack: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="space-y-5">
      <input type="hidden" name="entryDate" value={date} />
      <input type="hidden" name="meal" value={meal} />

      <button type="button" onClick={onBack} className="text-sm text-muted">
        ← กลับไปค้นหา
      </button>

      <Field label="ชื่ออาหาร">
        <Input name="name" required maxLength={120} autoFocus />
      </Field>
      <Field label="พลังงาน (kcal)" hint="ใส่เท่าที่รู้ มาโครเว้นว่างได้">
        <Input type="number" name="kcal" required min="0" step="1" inputMode="decimal" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="โปรตีน">
          <Input type="number" name="protein" defaultValue="0" min="0" step="0.1" inputMode="decimal" />
        </Field>
        <Field label="คาร์บ">
          <Input type="number" name="carb" defaultValue="0" min="0" step="0.1" inputMode="decimal" />
        </Field>
        <Field label="ไขมัน">
          <Input type="number" name="fat" defaultValue="0" min="0" step="0.1" inputMode="decimal" />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึก"}
      </Button>
    </form>
  );
}
