"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addRecipeItemAction,
  deleteRecipeAction,
  removeRecipeItemAction,
} from "@/app/(app)/recipes/actions";
import { Plus, Trash } from "@/components/icons";
import { Alert, Card, Eyebrow, Input } from "@/components/ui";

type Ingredient = { itemId: string; foodId: string; name: string; grams: number };
type FoodHit = { id: string; name: string; nameTh: string | null; kcalPer100g: number };

export type RecipeView = {
  id: string;
  name: string;
  servings: number;
  ingredients: Ingredient[];
  perServing: { kcal: number; protein: number; carb: number; fat: number };
  totalGrams: number;
};

/**
 * การ์ดสูตรหนึ่งสูตร — แก้วัตถุดิบได้ในที่เดียวกับที่เห็นผลลัพธ์
 * ตัวเลขต่อหนึ่งที่อัปเดตทันทีที่เพิ่มหรือลบวัตถุดิบ เพราะคำนวณสดจากส่วนประกอบ
 */
export function RecipeCard({ recipe }: { recipe: RecipeView }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{recipe.name}</h2>
          <p className="mt-0.5 text-xs text-ink-3">
            แบ่งได้ {recipe.servings} ที่ · รวม {Math.round(recipe.totalGrams)} กรัม
          </p>
        </div>
        <button
          type="button"
          aria-label={`ลบสูตร ${recipe.name}`}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteRecipeAction(recipe.id);
              if (!result.ok) setError(result.message);
            })
          }
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-ink-3 transition-colors duration-200 hover:text-critical"
        >
          <Trash className="mx-auto h-4 w-4" />
        </button>
      </div>

      <div className="rounded-xl bg-sunken px-3.5 py-3">
        <Eyebrow>ต่อหนึ่งที่</Eyebrow>
        <p className="tnum mt-1 text-lg font-medium">
          {Math.round(recipe.perServing.kcal).toLocaleString("th-TH")}
          <span className="text-sm font-normal text-ink-3"> kcal</span>
        </p>
        <p className="tnum mt-0.5 text-xs text-ink-3">
          โปรตีน {Math.round(recipe.perServing.protein)} · คาร์บ{" "}
          {Math.round(recipe.perServing.carb)} · ไขมัน {Math.round(recipe.perServing.fat)} ก.
        </p>
      </div>

      {recipe.ingredients.length > 0 ? (
        <ul className="divide-y divide-line">
          {recipe.ingredients.map((item) => (
            <li key={item.itemId} className="flex items-center gap-2 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
              <span className="tnum shrink-0 text-sm text-ink-3">
                {Math.round(item.grams)} ก.
              </span>
              <button
                type="button"
                aria-label={`เอา ${item.name} ออก`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await removeRecipeItemAction(recipe.id, item.itemId);
                    if (!result.ok) setError(result.message);
                  })
                }
                className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-ink-3 transition-colors duration-200 hover:text-critical"
              >
                <Trash className="mx-auto h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">ยังไม่มีวัตถุดิบ เพิ่มอย่างน้อยหนึ่งอย่างก่อนถึงจะบันทึกได้</p>
      )}

      {adding ? (
        <IngredientPicker
          recipeId={recipe.id}
          onDone={() => setAdding(false)}
          onError={setError}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-sm text-ink-3 transition-colors duration-200 hover:border-line-strong hover:text-ink"
        >
          <Plus className="h-4 w-4" />
          เพิ่มวัตถุดิบ
        </button>
      )}

      {error && <Alert>{error}</Alert>}
    </Card>
  );
}

function IngredientPicker({
  recipeId,
  onDone,
  onError,
}: {
  recipeId: string;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [picked, setPicked] = useState<FoodHit | null>(null);
  const [pending, startTransition] = useTransition();

  const results = query.trim().length < 2 ? [] : hits;

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      const response = await fetch(`/api/foods/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setHits(data.foods ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (picked) {
    return (
      <form
        action={(formData) => {
          startTransition(async () => {
            const result = await addRecipeItemAction(formData);
            if (result.ok) onDone();
            else onError(result.message);
          });
        }}
        className="space-y-3 rounded-xl border border-line p-3"
      >
        <input type="hidden" name="recipeId" value={recipeId} />
        <input type="hidden" name="foodId" value={picked.id} />
        <p className="text-sm">{picked.nameTh ?? picked.name}</p>
        <div className="flex gap-2">
          <Input
            type="number"
            name="grams"
            defaultValue="100"
            step="1"
            min="1"
            inputMode="decimal"
            required
            autoFocus
            aria-label="น้ำหนักเป็นกรัม"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-[48px] shrink-0 cursor-pointer rounded-xl bg-ink px-4 text-sm font-medium text-paper disabled:opacity-40"
          >
            {pending ? "…" : "เพิ่ม"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setPicked(null)}
          className="cursor-pointer text-xs text-ink-3"
        >
          ← เลือกวัตถุดิบอื่น
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-line p-3">
      <Input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ค้นวัตถุดิบ เช่น หมูสับ, ข้าวสวย"
        aria-label="ค้นหาวัตถุดิบ"
      />
      <ul className="divide-y divide-line">
        {results.slice(0, 6).map((food) => (
          <li key={food.id}>
            <button
              type="button"
              onClick={() => setPicked(food)}
              className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 py-2 text-left text-sm"
            >
              <span className="min-w-0 truncate">{food.nameTh ?? food.name}</span>
              <span className="tnum shrink-0 text-xs text-ink-3">
                {Math.round(food.kcalPer100g)} kcal/100ก.
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onDone} className="cursor-pointer text-xs text-ink-3">
        ปิด
      </button>
    </div>
  );
}
