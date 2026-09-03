"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addRecipeEntry } from "@/lib/diary";
import {
  addRecipeItem,
  createRecipe,
  deleteRecipe,
  removeRecipeItem,
} from "@/lib/recipes";
import {
  diaryRecipeEntrySchema,
  recipeItemSchema,
  recipeSchema,
} from "@/lib/validation";

export type ActionResult = { ok: true } | { ok: false; message: string };

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
}

export async function createRecipeAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  if (raw.note === "") delete raw.note;

  const parsed = recipeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

  await createRecipe(user.id, parsed.data);
  revalidatePath("/recipes");
  return { ok: true };
}

export async function addRecipeItemAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = recipeItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

  const added = await addRecipeItem(user.id, parsed.data.recipeId, parsed.data);
  if (!added) return { ok: false, message: "ไม่พบสูตรนี้" };

  revalidatePath("/recipes");
  return { ok: true };
}

export async function removeRecipeItemAction(
  recipeId: string,
  itemId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const removed = await removeRecipeItem(user.id, recipeId, itemId);
  if (!removed) return { ok: false, message: "ไม่พบวัตถุดิบนี้" };

  revalidatePath("/recipes");
  return { ok: true };
}

export async function deleteRecipeAction(recipeId: string): Promise<ActionResult> {
  const user = await requireUser();
  const removed = await deleteRecipe(user.id, recipeId);
  if (!removed) return { ok: false, message: "ไม่พบสูตรนี้" };

  revalidatePath("/recipes");
  return { ok: true };
}

/** บันทึกสูตรลงไดอารี — เรียกจากแผ่นเพิ่มอาหาร */
export async function logRecipeAction(input: {
  recipeId: string;
  entryDate?: string;
  meal: string;
  servings: number;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = diaryRecipeEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

  const entry = await addRecipeEntry(user.id, parsed.data);
  if (!entry) return { ok: false, message: "สูตรนี้ยังไม่มีวัตถุดิบ เพิ่มก่อนแล้วค่อยบันทึก" };

  revalidatePath("/diary");
  return { ok: true };
}
