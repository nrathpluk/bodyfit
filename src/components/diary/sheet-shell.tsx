"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Close } from "@/components/icons";

/**
 * กรอบของแผ่น/โมดัลที่ใช้ร่วมกันทุกที่ในไดอารี
 *
 * รวมไว้ที่เดียวเพราะเรื่อง accessibility ของโมดัลทำผิดง่ายและต้องทำเหมือนกันทุกอัน:
 * ปิดด้วย Escape, บอก screen reader ว่าเป็น dialog, และล็อกไม่ให้หน้าข้างหลังเลื่อน
 * (ไม่ล็อกแล้วบนมือถือจะเลื่อนหน้าหลังทะลุแผ่นออกไป ซึ่งสับสนมาก)
 *
 * มือถือเต็มจอ จอใหญ่เป็นกล่องกลางจอ
 */
export function SheetShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // ย้ายโฟกัสเข้ามาในแผ่น ไม่งั้นผู้ใช้คีย์บอร์ดจะยังอยู่กับปุ่มที่อยู่ข้างหลัง
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:items-center md:justify-center md:bg-black/50 md:p-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="flex h-full w-full flex-col bg-background outline-none md:h-auto md:max-h-[85vh] md:max-w-lg md:overflow-hidden md:rounded-2xl md:border md:border-line md:shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="truncate text-base font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg px-2 text-muted transition-colors duration-200 hover:text-foreground"
          >
            <Close className="mx-auto h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
