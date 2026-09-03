import Link from "next/link";

/** หน้าที่แสดงเมื่อเปิด URL ที่ไม่มีอยู่ — ของเดิมเป็นหน้า 404 ภาษาอังกฤษของ Next */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">404</p>
      <h1 className="text-lg font-semibold">ไม่พบหน้าที่คุณเปิด</h1>
      <p className="text-sm leading-relaxed text-ink-2">
        ลิงก์อาจพิมพ์ผิดหรือหน้านั้นถูกย้ายไปแล้ว
      </p>
      <Link
        href="/dashboard"
        className="mt-2 min-h-[48px] rounded-xl bg-ink px-5 py-3.5 text-[15px] font-medium text-paper"
      >
        กลับหน้าสรุป
      </Link>
    </main>
  );
}
