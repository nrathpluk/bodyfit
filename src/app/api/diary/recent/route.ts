import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRecentFoods } from "@/lib/diary";

/** อาหารที่เพิ่งกิน — แสดงทันทีที่เปิดแผ่นเพิ่มอาหาร ก่อนผู้ใช้พิมพ์อะไร */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });

  const foods = await getRecentFoods(user.id);
  return NextResponse.json({ foods });
}
