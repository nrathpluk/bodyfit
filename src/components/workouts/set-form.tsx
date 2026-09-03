"use client";

import { useState, useTransition } from "react";
import { addSetAction } from "@/app/(app)/workouts/actions";
import { Alert, Button, Field, Input } from "@/components/ui";

/**
 * ฟอร์มบันทึกเซ็ต — สามช่องเท่านั้น ท่า / น้ำหนัก / ครั้ง
 *
 * ไม่มีช่องแคลอรีโดยตั้งใจ พลังงานที่เผาถูกคิดรวมในตัวคูณกิจกรรมของ TDEE
 * อยู่แล้ว ถ้าให้กรอกอีกจะนับซ้ำ และตัวเลขจากเครื่องออกกำลังกายก็คลาดเคลื่อนสูง
 *
 * ปุ่มลัดท่าที่เพิ่งเล่นอยู่เหนือช่องชื่อ เพราะคนเล่นเวทวนอยู่ไม่กี่ท่า
 * และต้องกรอกซ้ำหลายเซ็ตติดกันในหนึ่งวัน
 */
export function SetForm({ recentNames }: { recentNames: string[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await addSetAction(formData);
          if (!result.ok) setError(result.message);
        });
      }}
      className="space-y-4"
    >
      {recentNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recentNames.map((recent) => (
            <button
              key={recent}
              type="button"
              onClick={() => setName(recent)}
              className={`min-h-[36px] cursor-pointer rounded-full border px-3 text-xs transition-colors duration-200 ${
                name === recent ? "border-ink bg-ink text-paper" : "border-line text-ink-2"
              }`}
            >
              {recent}
            </button>
          ))}
        </div>
      )}

      <Field label="ท่า">
        <Input
          name="exerciseName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="เช่น เบนช์เพรส, สควอท"
          maxLength={80}
          required
        />
      </Field>

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
