"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await createBrowserSupabase().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="text-sm text-muted underline underline-offset-4 disabled:opacity-50"
    >
      {pending ? "กำลังออก…" : "ออกจากระบบ"}
    </button>
  );
}
