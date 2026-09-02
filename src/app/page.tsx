import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** หน้าแรกเป็นทางแยกเฉย ๆ — ยังไม่มีหน้า landing สำหรับคนที่ยังไม่ล็อกอิน */
export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
