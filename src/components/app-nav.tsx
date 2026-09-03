"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, ChartIcon, UserIcon } from "./icons";

/**
 * แถบเมนูล่าง — มาตรฐานของแอปมือถือ
 *
 * ก่อนหน้านี้สลับหน้าได้ด้วยลิงก์ตัวหนังสือท้ายหน้าเท่านั้น ซึ่งต้องเลื่อนลงไปหา
 * แถบล่างทำให้ทุกหน้าเข้าถึงได้ในแตะเดียวและนิ้วโป้งเอื้อมถึงเสมอ
 *
 * เผื่อ safe area ของ iPhone ไว้ด้วย ไม่งั้นแถบจะถูกขีดโฮมทับบนเครื่องที่ไม่มีปุ่มโฮม
 */
const TABS = [
  { href: "/dashboard", label: "สรุป", Icon: ChartIcon },
  { href: "/diary", label: "บันทึก", Icon: BookIcon },
  { href: "/onboarding", label: "ตั้งค่า", Icon: UserIcon },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-1 text-xs transition-colors duration-200 ${
                  active ? "text-brand" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
