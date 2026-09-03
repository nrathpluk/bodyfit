import type { ComponentProps, ReactNode } from "react";

/**
 * ชิ้นส่วน UI พื้นฐาน
 *
 * ปุ่มหลักเป็นสีหมึก ไม่ใช่สีแบรนด์สดใส — สีสดในแอปนี้สงวนไว้ให้ข้อมูลเท่านั้น
 * (ดูเหตุผลเต็มใน globals.css) ปุ่มหมึกยังได้เปรียบเรื่องคอนทราสต์
 * เพราะขาวบนหมึกผ่านเกณฑ์ WCAG สบาย ๆ ต่างจากขาวบนสีสดที่มักไม่ผ่าน
 *
 * ทุกชิ้นสูงอย่างน้อย 44 px ให้กดด้วยนิ้วโป้งบนมือถือได้
 */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-ink text-paper hover:opacity-90 disabled:opacity-40"
      : "border border-line text-ink hover:bg-sunken disabled:opacity-40";
  return (
    <button
      {...props}
      className={`min-h-[48px] w-full rounded-xl px-4 text-[15px] font-medium transition-opacity duration-200 disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-critical">{error}</span>}
    </label>
  );
}

// พื้นช่องกรอกเป็นสีจม ไม่ใช่สีพื้นการ์ด เพื่อให้เห็นว่าเป็นที่ให้กรอกโดยไม่ต้องใช้เงา
const controlClass =
  "min-h-[48px] w-full rounded-xl border border-line bg-sunken px-3.5 text-ink transition-colors duration-200 focus:border-line-strong";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${controlClass} ${className}`} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${controlClass} ${className}`} />;
}

export function Alert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "info";
}) {
  const styles =
    tone === "error"
      ? "border-critical/30 bg-critical/8 text-critical"
      : "border-line bg-sunken text-ink-2";
  return <p className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</p>;
}

/** ป้ายกำกับเล็ก ๆ เหนือหัวข้อ ใช้สร้างลำดับชั้นโดยไม่ต้องเพิ่มขนาดตัวอักษร */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">{children}</p>
  );
}
