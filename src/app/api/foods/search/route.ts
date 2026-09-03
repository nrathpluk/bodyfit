import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchFoods } from "@/lib/foods";

/** ค้นหาอาหารระหว่างพิมพ์ — client เรียกถี่ จึงตอบเฉพาะฟิลด์ที่หน้าจอใช้จริง */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const foods = await searchFoods(query, user.id);
  return NextResponse.json({ foods });
}
