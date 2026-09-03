"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { addFoodEntry, addQuickEntry, copyDay, deleteEntry } from "@/lib/diary";
import { diaryFoodEntrySchema, diaryQuickEntrySchema } from "@/lib/validation";

export type ActionResult = { ok: true } | { ok: false; message: string };

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
}

export async function addFoodAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  // ช่องที่ไม่ได้เลือกมาเป็นสตริงว่าง ซึ่ง zod ตีความว่า "ค่าผิด" แทนที่จะเป็น "ไม่ได้ส่ง"
  for (const key of ["grams", "servingId"]) if (raw[key] === "") delete raw[key];

  const parsed = diaryFoodEntrySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

  const entry = await addFoodEntry(user.id, parsed.data);
  if (!entry) return { ok: false, message: "บันทึกไม่สำเร็จ ลองเลือกอาหารใหม่อีกครั้ง" };

  revalidatePath("/diary");
  return { ok: true };
}

export async function addQuickAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = diaryQuickEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

  await addQuickEntry(user.id, parsed.data);
  revalidatePath("/diary");
  return { ok: true };
}

export async function deleteEntryAction(entryId: string): Promise<ActionResult> {
  const user = await requireUser();
  const removed = await deleteEntry(user.id, entryId);
  if (!removed) return { ok: false, message: "ไม่พบรายการนี้" };

  revalidatePath("/diary");
  return { ok: true };
}

/** คัดลอกทั้งวันจากเมื่อวาน — ทางลัดสำหรับคนที่กินเมนูซ้ำ ๆ */
export async function copyYesterdayAction(date: string): Promise<ActionResult> {
  const user = await requireUser();
  const copied = await copyDay(user.id, addDays(date, -1), date);
  if (copied === 0) return { ok: false, message: "เมื่อวานไม่มีรายการให้คัดลอก" };

  revalidatePath("/diary");
  return { ok: true };
}
