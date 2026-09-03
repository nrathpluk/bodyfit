import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatThaiDate, today } from "@/lib/dates";
import { ensureDailyTarget, getProfile } from "@/lib/profile";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");

  const date = today();
  const target = await ensureDailyTarget(user.id, date);
  // มีโปรไฟล์แต่ยังไม่เคยชั่งน้ำหนัก = ทำ onboarding ไม่จบ
  if (!target) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-md space-y-5 px-5 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{formatThaiDate(date)}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile.displayName ? `สวัสดี ${profile.displayName}` : "วันนี้กินอะไรบ้าง"}
          </h1>
        </div>
        <SignOutButton />
      </header>

      <Card>
        <p className="text-sm text-muted">เป้าหมายวันนี้</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums">
          {target.kcal.toLocaleString("th-TH")}
          <span className="ml-1 text-base font-normal text-muted">kcal</span>
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          <Macro label="โปรตีน" grams={target.protein} />
          <Macro label="คาร์บ" grams={target.carb} />
          <Macro label="ไขมัน" grams={target.fat} />
        </dl>

        {target.basis.floored && (
          <p className="mt-4 rounded-xl bg-background px-3 py-2 text-xs text-muted">
            เป้าที่ขอต่ำกว่าขั้นต่ำที่ปลอดภัย ระบบปรับขึ้นมาที่ {target.kcal.toLocaleString("th-TH")} kcal ให้แล้ว
          </p>
        )}
      </Card>

      <Card>
        <p className="text-sm text-muted">
          พลังงานพื้นฐาน (BMR) {target.basis.bmr.toLocaleString("th-TH")} kcal ·
          ใช้จริงต่อวัน (TDEE) {target.basis.tdee.toLocaleString("th-TH")} kcal
        </p>
        <Link
          href="/onboarding"
          className="mt-3 inline-block text-sm text-brand underline underline-offset-4"
        >
          แก้ไขข้อมูลและเป้าหมาย
        </Link>
      </Card>

      <Link
        href="/diary"
        className="block min-h-[52px] rounded-2xl bg-brand px-4 py-4 text-center font-medium text-white"
      >
        บันทึกอาหารวันนี้
      </Link>
    </main>
  );
}

function Macro({ label, grams }: { label: string; grams: number }) {
  return (
    <div className="rounded-xl bg-background py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-medium tabular-nums">{Math.round(grams)} ก.</dd>
    </div>
  );
}
