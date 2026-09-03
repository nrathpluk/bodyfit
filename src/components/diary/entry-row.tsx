"use client";

import { useTransition } from "react";
import { deleteEntryAction } from "@/app/diary/actions";

export function EntryRow({
  id,
  name,
  detail,
  kcal,
}: {
  id: string;
  name: string;
  detail: string | null;
  kcal: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className={`flex items-center gap-3 py-3 ${pending ? "opacity-40" : ""}`}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{name}</span>
        {detail && <span className="block truncate text-xs text-muted">{detail}</span>}
      </span>
      <span className="shrink-0 text-sm tabular-nums">{Math.round(kcal).toLocaleString("th-TH")}</span>
      <button
        type="button"
        aria-label={`ลบ ${name}`}
        disabled={pending}
        onClick={() => startTransition(async () => void (await deleteEntryAction(id)))}
        className="min-h-[44px] shrink-0 px-2 text-muted"
      >
        ✕
      </button>
    </li>
  );
}
