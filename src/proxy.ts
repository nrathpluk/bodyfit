import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 เปลี่ยนชื่อ middleware เป็น proxy — ไฟล์นี้คือตัวเดียวกัน
 *
 * หน้าที่: ต่ออายุ token ของ Supabase ในทุก request (Server Component เขียน cookie เองไม่ได้)
 * และกันหน้าที่ต้องล็อกอินก่อนถึงจะ render
 *
 * เพิ่มหน้าที่ต้องล็อกอิน ต้องเติมทั้ง PROTECTED และ config.matcher ข้างล่าง
 */
const PROTECTED = ["/dashboard", "/onboarding", "/diary", "/weight", "/recipes", "/workouts", "/settings"];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // ต้องเรียก getUser() ตรงนี้ ไม่ใช่ getSession() — เป็นจังหวะเดียวที่ token ถูกต่ออายุ
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && PROTECTED.some((prefix) => path.startsWith(prefix))) {
    const loginUrl = new URL("/login", request.url);
    // จำปลายทางไว้ พาผู้ใช้กลับมาที่เดิมหลังล็อกอิน
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/diary/:path*",
    "/weight/:path*",
    "/recipes/:path*",
    "/workouts/:path*",
    "/settings/:path*",
  ],
};
