"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireUser } from "@/lib/auth";
import { weightInputSchema } from "@/lib/validation";
import { logWeight } from "@/lib/weight-queries";

export type ActionResult = { ok: true } | { ok: false; message: string };

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
}

export async function logWeightAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  // ช่องเปอร์เซ็นต์ไขมันเว้นว่างได้ ต้องลบทิ้งไม่ใช่ส่งสตริงว่างให้ zod
  if (raw.bodyFatPct === "") delete raw.bodyFatPct;
  if (raw.logDate === "") delete raw.logDate;

  const parsed = weightInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

  await logWeight(user.id, parsed.data);

  // เป้าของวันถูกคำนวณจากน้ำหนักแนวโน้ม จึงต้องล้างแคชหน้าสรุปด้วย
  revalidatePath("/weight");
  revalidatePath("/dashboard");
  return { ok: true };
}
