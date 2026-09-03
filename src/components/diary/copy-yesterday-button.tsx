"use client";

import { useState, useTransition } from "react";
import { copyYesterdayAction } from "@/app/(app)/diary/actions";

/** ทางลัดสำหรับคนกินเมนูซ้ำ ๆ — บันทึกทั้งวันในแตะเดียว */
export function CopyYesterdayButton({ date }: { date: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2 text-center">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await copyYesterdayAction(date);
            setMessage(result.ok ? null : result.message);
          })
        }
        className="min-h-[44px] text-sm text-ink underline underline-offset-4 disabled:opacity-50"
      >
        {pending ? "กำลังคัดลอก…" : "คัดลอกทุกมื้อจากเมื่อวาน"}
      </button>
      {message && <p className="text-xs text-ink-3">{message}</p>}
    </div>
  );
}
