"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { saveProfile } from "@/lib/profile";
import { profileInputSchema } from "@/lib/validation";

export type ProfileFormState = {
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

/**
 * บันทึกโปรไฟล์ — ตรวจซ้ำที่ฝั่ง server ด้วย schema ตัวเดียวกับที่ client ใช้
 * ห้ามเชื่อค่าที่ส่งมาจากฟอร์ม แม้ฟอร์มจะตรวจมาแล้ว
 */
export async function saveProfileAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();

  const parsed = profileInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { message: "ข้อมูลบางช่องยังไม่ถูกต้อง", fieldErrors: flat.fieldErrors };
  }

  await saveProfile(user.id, parsed.data);
  redirect("/dashboard");
}
