import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFoodWithServings } from "@/lib/foods";

/** อาหารหนึ่งรายการพร้อมหน่วยครัว — ใช้ตอนผู้ใช้เลือกอาหารแล้วจะระบุปริมาณ */
export async function GET(_request: Request, { params }: RouteContext<"/api/foods/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });

  // Next.js 16: params เป็น Promise ต้อง await
  const { id } = await params;
  const food = await getFoodWithServings(id, user.id);
  if (!food) return NextResponse.json({ error: "ไม่พบอาหารรายการนี้" }, { status: 404 });

  return NextResponse.json({ food });
}
