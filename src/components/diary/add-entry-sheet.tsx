"use client";

import { useEffect, useState, useTransition } from "react";
import { addFoodAction, addQuickAction, repeatEntryAction } from "@/app/(app)/diary/actions";
import { Alert, Button, Eyebrow, Field, Input, Select } from "@/components/ui";
import { Plus, ScanIcon } from "@/components/icons";
import { localizeServingLabel } from "@/lib/servings";
import type { MealSlot } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";
import { BarcodeScanner, type ScannedFood } from "./barcode-scanner";
import { SheetShell } from "./sheet-shell";

type FoodHit = {
  id: string;
  name: string;
  nameTh: string | null;
  kcalPer100g: number;
  verified?: boolean;
};

type Serving = { id: string; label: string; grams: number; isDefault: boolean };
type FoodDetail = FoodHit & { servings: Serving[] };

type RecentFood = {
  sourceEntryId: string;
  name: string;
  servingLabel: string | null;
  grams: number | null;
  kcal: number;
};

/**
 * แผ่นบันทึกอาหาร — เปิดมาเจอ "ล่าสุด" ก่อน แล้วค่อยค้นหาถ้าไม่มีในนั้น
 *
 * คนส่วนใหญ่กินวนอยู่ไม่กี่อย่าง การบังคับให้พิมพ์ค้นใหม่ทุกมื้อคือความฝืดที่ใหญ่ที่สุด
 * ของแอปนับแคล รายการล่าสุดจึงบันทึกซ้ำได้ในแตะเดียว
 */
export function AddEntrySheet({ meal, date }: { meal: MealSlot; date: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-sm text-ink-3 transition-colors duration-200 hover:border-line-strong hover:text-ink"
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
  date: string | null;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [recents, setRecents] = useState<RecentFood[]>([]);
  const [selected, setSelected] = useState<FoodDetail | null>(null);
  const [searching, setSearching] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // คำค้นสั้นเกินไปให้ถือว่าไม่มีผลลัพธ์ คำนวณตอน render ไม่ต้องล้าง state ใน effect
  const results = query.trim().length < 2 ? [] : hits;
  const showRecents = query.trim().length < 2 && recents.length > 0;

  useEffect(() => {
    fetch("/api/diary/recent")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setRecents(data.foods ?? []))
      .catch(() => {
        // ไม่มีรายการล่าสุดก็ยังค้นหาได้ตามปกติ
      });
  }, []);

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

  function repeat(recent: RecentFood) {
    setError(null);
    startTransition(async () => {
      const result = await repeatEntryAction({
        sourceEntryId: recent.sourceEntryId,
        // ไม่ส่งวันเมื่อเป็นวันนี้ ให้ server เติมเอง กันบันทึกผิดวันตอนข้ามเที่ยงคืน
        ...(date ? { entryDate: date } : {}),
        meal,
      });
      if (result.ok) onClose();
      else setError(result.message);
    });
  }

  return (
    <SheetShell title={`เพิ่มลง${MEAL_LABELS[meal]}`} onClose={onClose}>
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
              className="flex min-h-[48px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-line px-4 text-sm transition-colors duration-200 hover:border-line-strong hover:text-ink"
            >
              <ScanIcon className="h-4 w-4" />
              สแกน
            </button>
          </div>

          {showRecents && (
            <section>
              <div className="mb-1.5">
                <Eyebrow>กินล่าสุด</Eyebrow>
                <p className="mt-0.5 text-xs text-ink-3">แตะรายการเพื่อบันทึกซ้ำได้เลย</p>
              </div>
              <ul className="divide-y divide-line">
                {recents.map((recent) => (
                  <li key={recent.sourceEntryId}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => repeat(recent)}
                      className="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 py-3 text-left transition-colors duration-200 hover:bg-sunken disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{recent.name}</span>
                        <span className="block truncate text-xs text-ink-3">
                          {recent.servingLabel
                            ? localizeServingLabel(recent.servingLabel)
                            : recent.grams
                              ? `${Math.round(recent.grams)} กรัม`
                              : "กรอกเอง"}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-ink-3">
                        {Math.round(recent.kcal).toLocaleString("th-TH")} kcal
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {searching && <p className="text-sm text-ink-3">กำลังค้นหา…</p>}

          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-ink-3">ไม่พบอาหารที่ค้นหา</p>
          )}

          <ul className="divide-y divide-line">
            {results.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => selectFood(food)}
                  className="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 py-3 text-left transition-colors duration-200 hover:bg-sunken"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">
                      {food.nameTh ?? food.name}
                      {food.verified === false && (
                        <span className="ml-1.5 align-middle text-[10px] text-ink-3">
                          ข้อมูลจากผู้ใช้
                        </span>
                      )}
                    </span>
                    {food.nameTh && (
                      <span className="block truncate text-xs text-ink-3">{food.name}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-ink-3">
                    {Math.round(food.kcalPer100g)} kcal/100ก.
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setQuickMode(true)}
            className="cursor-pointer text-sm text-ink underline underline-offset-4"
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
    </SheetShell>
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
  date: string | null;
  pending: boolean;
  onBack: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [useServing, setUseServing] = useState(food.servings.length > 0);

  return (
    <form action={onSubmit} className="space-y-5">
      {date && <input type="hidden" name="entryDate" value={date} />}
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="foodId" value={food.id} />

      <div>
        <button type="button" onClick={onBack} className="cursor-pointer text-sm text-ink-3">
          ← เลือกอาหารอื่น
        </button>
        <h3 className="mt-2 text-lg font-medium">{food.nameTh ?? food.name}</h3>
        <p className="text-sm text-ink-3">{Math.round(food.kcalPer100g)} kcal ต่อ 100 กรัม</p>
      </div>

      {food.servings.length > 0 && (
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
        <Field label="น้ำหนัก (กรัม)">
          <Input
            type="number"
            name="grams"
            defaultValue="100"
            step="1"
            min="1"
            inputMode="decimal"
            required
          />
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
  date: string | null;
  pending: boolean;
  onBack: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="space-y-5">
      {date && <input type="hidden" name="entryDate" value={date} />}
      <input type="hidden" name="meal" value={meal} />

      <button type="button" onClick={onBack} className="cursor-pointer text-sm text-ink-3">
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
          <Input type="number" name="protein" defaultValue="0" min="0" step="0.1" />
        </Field>
        <Field label="คาร์บ">
          <Input type="number" name="carb" defaultValue="0" min="0" step="0.1" />
        </Field>
        <Field label="ไขมัน">
          <Input type="number" name="fat" defaultValue="0" min="0" step="0.1" />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึก"}
      </Button>
    </form>
  );
}
