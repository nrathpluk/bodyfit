import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findByBarcode, isValidBarcode } from "@/lib/barcode";
import { barcodeLimiter } from "@/lib/rate-limit";

const MESSAGES = {
  not_found: "ไม่พบสินค้านี้ในฐานข้อมูล ลองกรอกเองได้",
  unreliable: "สินค้านี้มีข้อมูลโภชนาการไม่ครบ ลองกรอกเองได้",
  unavailable: "ตอนนี้ค้นข้อมูลสินค้าไม่ได้ ลองใหม่อีกครั้งหรือกรอกเอง",
} as const;

export async function GET(_request: Request, { params }: RouteContext<"/api/foods/barcode/[code]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });

  // Next.js 16: params เป็น Promise ต้อง await
  const { code } = await params;
  if (!isValidBarcode(code)) {
    return NextResponse.json({ error: "รูปแบบบาร์โค้ดไม่ถูกต้อง" }, { status: 400 });
  }

  /*
   * ปลายทางนี้ยิงต่อไปยัง Open Food Facts ซึ่งเป็นบริการฟรีของคนอื่น
   * ถ้าปล่อยให้ผู้ใช้ที่ล็อกอินแล้วยิงรัวได้ไม่จำกัด จะกลายเป็นเราไปถล่มเขาในนามแอปเรา
   * และเสี่ยงโดนแบนทั้งแอป — จำกัดก่อนเรียกออก ไม่ใช่หลังเรียก
   */
  const limit = barcodeLimiter.check(user.id);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `ค้นหาบาร์โค้ดถี่เกินไป ลองใหม่ในอีก ${limit.retryAfterSeconds} วินาที` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const result = await findByBarcode(code, user.id);
  if (result.status !== "found") {
    // 404 ทุกกรณีที่ใช้ของไม่ได้ เพื่อให้ฝั่งหน้าจอจัดการทางเดียว
    return NextResponse.json({ error: MESSAGES[result.status] }, { status: 404 });
  }

  return NextResponse.json({ food: result.food, fromCache: result.fromCache });
}
