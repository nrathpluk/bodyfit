"use client";

import { useActionState, useState } from "react";
import { saveProfileAction, type ProfileFormState } from "@/app/(app)/onboarding/actions";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { ACTIVITY_LABELS } from "@/lib/nutrition";
import type { ActivityLevel, Goal, Sex } from "@/lib/types";

const GOAL_LABELS: Record<Goal, string> = {
  lose: "ลดน้ำหนัก",
  maintain: "คงน้ำหนัก",
  gain: "เพิ่มน้ำหนัก",
};

const RATES = [0.25, 0.5, 0.75, 1];

export type ProfileDefaults = {
  displayName?: string;
  sex?: Sex;
  birthDate?: string;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  goal?: Goal;
  rateKgPerWeek?: number;
};

export function ProfileForm({ defaults = {} }: { defaults?: ProfileDefaults }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    saveProfileAction,
    {},
  );
  const [goal, setGoal] = useState<Goal>(defaults.goal ?? "lose");
  // เก็บเป็นค่าสัมบูรณ์ในฟอร์ม แล้วค่อยใส่เครื่องหมายตามเป้าหมายตอนส่ง
  const [rate, setRate] = useState(Math.abs(defaults.rateKgPerWeek ?? 0.5));

  const error = (field: string) => state.fieldErrors?.[field]?.[0];
  const signedRate = goal === "maintain" ? 0 : goal === "lose" ? -rate : rate;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="rateKgPerWeek" value={signedRate} />

      <Field label="ชื่อที่อยากให้เรียก" error={error("displayName")}>
        <Input name="displayName" defaultValue={defaults.displayName} maxLength={60} />
      </Field>

      <Field label="เพศ" hint="ใช้ในสูตรคำนวณพลังงานพื้นฐาน (BMR)" error={error("sex")}>
        <Select name="sex" defaultValue={defaults.sex ?? ""} required>
          <option value="" disabled>
            เลือกเพศ
          </option>
          <option value="male">ชาย</option>
          <option value="female">หญิง</option>
        </Select>
      </Field>

      <Field label="วันเกิด" error={error("birthDate")}>
        <Input type="date" name="birthDate" defaultValue={defaults.birthDate} required />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="ส่วนสูง (ซม.)" error={error("heightCm")}>
          <Input
            type="number"
            name="heightCm"
            inputMode="decimal"
            step="0.1"
            defaultValue={defaults.heightCm}
            required
          />
        </Field>
        <Field label="น้ำหนักตอนนี้ (กก.)" error={error("weightKg")}>
          <Input
            type="number"
            name="weightKg"
            inputMode="decimal"
            step="0.1"
            defaultValue={defaults.weightKg}
            required
          />
        </Field>
      </div>

      <Field label="ระดับกิจกรรม" error={error("activityLevel")}>
        <Select name="activityLevel" defaultValue={defaults.activityLevel ?? "light"} required>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
            <option key={level} value={level}>
              {ACTIVITY_LABELS[level]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="เป้าหมาย" error={error("goal")}>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(GOAL_LABELS) as Goal[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setGoal(option)}
              className={`min-h-[48px] rounded-xl border text-sm font-medium transition ${
                goal === option
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface text-foreground"
              }`}
            >
              {GOAL_LABELS[option]}
            </button>
          ))}
        </div>
        <input type="hidden" name="goal" value={goal} />
      </Field>

      {goal !== "maintain" && (
        <Field
          label={`ความเร็วที่ต้องการ (กก./สัปดาห์)`}
          hint="0.5 กก./สัปดาห์ คือจังหวะที่คนส่วนใหญ่ทำได้ต่อเนื่อง"
          error={error("rateKgPerWeek")}
        >
          <Select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
            {RATES.map((value) => (
              <option key={value} value={value}>
                {goal === "lose" ? "ลด" : "เพิ่ม"} {value} กก./สัปดาห์
              </option>
            ))}
          </Select>
        </Field>
      )}

      {state.message && <Alert>{state.message}</Alert>}

      <Button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึกและคำนวณเป้าหมาย"}
      </Button>
    </form>
  );
}
