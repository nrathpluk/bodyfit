"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireUser } from "@/lib/auth";
import { workoutSetSchema } from "@/lib/validation";
import { addWorkoutSet, deleteExercise, deleteWorkoutSet } from "@/lib/workouts";

export type ActionResult = { ok: true } | { ok: false; message: string };

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
}

export async function addSetAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  if (raw.logDate === "") delete raw.logDate;

  const parsed = workoutSetSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

  await addWorkoutSet(user.id, parsed.data);
  revalidatePath("/workouts");
  return { ok: true };
}

export async function deleteSetAction(setId: string): Promise<ActionResult> {
  const user = await requireUser();
  const removed = await deleteWorkoutSet(user.id, setId);
  if (!removed) return { ok: false, message: "ไม่พบเซ็ตนี้" };

  revalidatePath("/workouts");
  return { ok: true };
}

export async function deleteExerciseAction(exerciseId: string): Promise<ActionResult> {
  const user = await requireUser();
  const removed = await deleteExercise(user.id, exerciseId);
  if (!removed) return { ok: false, message: "ไม่พบท่านี้" };

  revalidatePath("/workouts");
  return { ok: true };
}
