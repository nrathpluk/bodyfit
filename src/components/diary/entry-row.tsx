"use client";

import { useState, useTransition } from "react";
import { deleteEntryAction } from "@/app/(app)/diary/actions";
import { Trash } from "@/components/icons";
import { localizeServingLabel } from "@/lib/servings";
import { EditEntrySheet, type EditableEntry } from "./edit-entry-sheet";

export function EntryRow({ entry }: { entry: EditableEntry }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const detail =
    (entry.servingLabel ? localizeServingLabel(entry.servingLabel) : null) ??
    (entry.grams ? `${Math.round(entry.grams)} กรัม` : null);

  return (
    <li className={`flex items-center gap-1 ${pending ? "opacity-40" : ""}`}>
      {/* แตะที่รายการเพื่อแก้ปริมาณ — เดิมกรอกผิดต้องลบแล้วเพิ่มใหม่ */}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex min-h-[52px] flex-1 items-center gap-3 rounded-lg py-2 text-left transition-colors duration-200 hover:bg-sunken"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{entry.name}</span>
          {detail && <span className="block truncate text-xs text-ink-3">{detail}</span>}
        </span>
        <span className="shrink-0 text-sm tabular-nums">
          {Math.round(entry.kcal).toLocaleString("th-TH")}
        </span>
      </button>

      <button
        type="button"
        aria-label={`ลบ ${entry.name}`}
        disabled={pending}
        onClick={() => startTransition(async () => void (await deleteEntryAction(entry.id)))}
        className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-ink-3 transition-colors duration-200 hover:text-critical"
      >
        <Trash className="mx-auto h-4 w-4" />
      </button>

      {editing && <EditEntrySheet entry={entry} onClose={() => setEditing(false)} />}
    </li>
  );
}
