/**
 * หน้าที่ service worker เอามาแสดงเมื่อเปิดแอปตอนไม่มีเน็ต
 * ต้องไม่แตะฐานข้อมูลและไม่ต้องล็อกอิน ไม่งั้นตอนออฟไลน์จะเรนเดอร์ไม่ได้
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
      <h1 className="text-xl font-semibold">ตอนนี้ไม่มีอินเทอร์เน็ต</h1>
      <p className="text-sm text-ink-3">
        Bodymefit ต้องต่อเน็ตเพื่อดึงข้อมูลอาหารและยอดของคุณ
        ลองเชื่อมต่อใหม่แล้วเปิดอีกครั้ง
      </p>
    </main>
  );
}
