"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

/**
 * หน้าที่แสดงเมื่อ server พังระหว่างเรนเดอร์หน้าที่ต้องล็อกอิน
 *
 * ของเดิมไม่มีไฟล์นี้ ผู้ใช้จึงเห็นหน้า error ภาษาอังกฤษของ Next
 * ซึ่งขัดกับกฎที่ว่าทุกข้อความในแอปเป็นภาษาไทย และดูเหมือนแอปพังทั้งระบบ
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // digest คือรหัสที่ Next ใช้จับคู่กับ log ฝั่ง server — โยนขึ้น console ไว้ให้ตามได้
    console.error("เกิดข้อผิดพลาดในหน้านี้", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <Card className="space-y-4 text-center">
        <h1 className="text-lg font-semibold">หน้านี้โหลดไม่สำเร็จ</h1>
        <p className="text-sm leading-relaxed text-ink-2">
          อาจเป็นปัญหาชั่วคราวของการเชื่อมต่อ ลองใหม่อีกครั้งได้เลย
          ถ้ายังไม่หายให้ลองปิดแล้วเปิดแอปใหม่
        </p>
        {error.digest && (
          <p className="text-xs text-ink-3">รหัสอ้างอิงสำหรับแจ้งปัญหา: {error.digest}</p>
        )}
        <Button type="button" onClick={reset}>
          ลองใหม่อีกครั้ง
        </Button>
      </Card>
    </main>
  );
}
