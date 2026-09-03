"use client";

import { useState, useTransition } from "react";
import { createRecipeAction } from "@/app/(app)/recipes/actions";
import { Alert, Button, Field, Input } from "@/components/ui";

export function RecipeCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createRecipeAction(formData);
          if (!result.ok) setError(result.message);
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="ชื่อสูตร">
          <Input name="name" placeholder="เช่น กะเพราหมูสับ" required maxLength={120} />
        </Field>
        <Field label="แบ่งได้กี่ที่">
          <Input
            type="number"
            name="servings"
            defaultValue="1"
            step="0.5"
            min="0.5"
            max="50"
            inputMode="decimal"
            className="w-24"
          />
        </Field>
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" variant="ghost" disabled={pending}>
        {pending ? "กำลังสร้าง…" : "สร้างสูตรใหม่"}
      </Button>
    </form>
  );
}
