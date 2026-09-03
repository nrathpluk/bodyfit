import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchExercises } from "@/lib/workouts";

/** ค้นหาท่าจากคลังกลาง 876 ท่า + ท่าที่ผู้ใช้สร้างเอง */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const exercises = await searchExercises(query, user.id);
  return NextResponse.json({ exercises });
}
