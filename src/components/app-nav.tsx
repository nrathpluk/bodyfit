"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, ChartIcon, UserIcon } from "./icons";

/**
 * เมนูหลัก — เปลี่ยนรูปตามขนาดจอ
 *
 * มือถือและแท็บเล็ต: แถบล่าง เพราะนิ้วโป้งเอื้อมถึงง่ายที่สุด และเผื่อ safe area ของ iPhone
 *         ไม่งั้นแถบจะถูกขีดโฮมทับบนเครื่องที่ไม่มีปุ่มโฮม
 * จอใหญ่ (lg ขึ้นไป): แถบข้างซ้าย เพราะแถบล่างบนจอกว้างทำให้ต้องลากเมาส์ทั้งจอ
 *         และเสียพื้นที่แนวตั้งซึ่งเป็นทรัพยากรที่หายากกว่าบนเดสก์ท็อป
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:inset-y-0 lg:right-auto lg:w-56 lg:border-t-0 lg:border-r lg:bg-surface lg:backdrop-blur-none lg:pb-0"
    >
      <p className="hidden px-5 py-7 text-[17px] font-semibold tracking-tight lg:block">
        Bodymefit
      </p>

      <ul className="mx-auto flex max-w-md lg:mx-0 lg:max-w-none lg:flex-col lg:gap-1 lg:px-3">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1 lg:flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-200 lg:min-h-[46px] lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:text-sm ${
                  active
                    ? "font-medium text-ink lg:bg-sunken"
                    : "text-ink-3 hover:text-ink lg:hover:bg-sunken"
                }`}
              >
                {/* ขีดบนหัวแท็บบอกตำแหน่งซ้ำอีกชั้น ไม่ให้ความหมายอยู่ที่สีอย่างเดียว */}
                {active && (
                  <span className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-ink lg:hidden" />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
