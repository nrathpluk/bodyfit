import type { ComponentProps, ReactNode } from "react";

/** ชิ้นส่วน UI พื้นฐาน — ปุ่มและช่องกรอกสูงพอให้กดด้วยนิ้วโป้งบนมือถือ (≥ 44px) */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-strong disabled:opacity-50"
      : "border border-line text-foreground hover:bg-background";
  return (
    <button
      {...props}
      className={`min-h-[48px] w-full rounded-xl px-4 text-base font-medium transition disabled:cursor-not-allowed ${styles} ${className}`}
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
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const controlClass =
  "min-h-[48px] w-full rounded-xl border border-line bg-surface px-3 text-foreground outline-none focus:border-brand";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${controlClass} ${className}`} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${controlClass} ${className}`} />;
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" }) {
  const styles =
    tone === "error"
      ? "border-danger/40 bg-danger/10 text-danger"
      : "border-line bg-background text-muted";
  return <p className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</p>;
}
