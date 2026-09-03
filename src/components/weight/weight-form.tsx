"use client";

import { useState, useTransition } from "react";
import { logWeightAction } from "@/app/(app)/weight/actions";
import { Alert, Button, Field, Input } from "@/components/ui";

/**
 * ฟอร์มชั่งน้ำหนัก — ตั้งใจให้สั้นที่สุด เพราะต้องกรอกเกือบทุกวัน
 * ช่องเดียวที่จำเป็นคือน้ำหนัก ส่วนเปอร์เซ็นต์ไขมันเว้นว่างได้
 */
export function WeightForm({ defaultWeight }: { defaultWeight?: number }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await logWeightAction(formData);
          if (result.ok) setSaved(true);
          else setError(result.message);
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="น้ำหนักวันนี้ (กก.)">
          <Input
            type="number"
            name="weightKg"
            step="0.1"
            min="25"
            max="400"
            inputMode="decimal"
            defaultValue={defaultWeight}
            required
          />
        </Field>
        <Field label="ไขมัน (%)" hint="ไม่ใส่ก็ได้">
          <Input type="number" name="bodyFatPct" step="0.1" min="1" max="70" inputMode="decimal" />
        </Field>
      </div>

      {error && <Alert>{error}</Alert>}
      {saved && !error && <Alert tone="info">บันทึกน้ำหนักแล้ว</Alert>}

      <Button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึกน้ำหนัก"}
      </Button>
    </form>
  );
}
