import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/auth";
import { getLatestWeight, getProfile } from "@/lib/profile";

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const weight = await getLatestWeight(user.id);

  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile ? "แก้ไขข้อมูลของคุณ" : "ตั้งค่าเป้าหมาย"}
        </h1>
        <p className="text-sm text-ink-3">
          ใช้คำนวณแคลอรีและสารอาหารที่ควรได้รับต่อวัน แก้ทีหลังได้ตลอด
        </p>
      </header>

      <ProfileForm
        defaults={{
          displayName: profile?.displayName ?? undefined,
          sex: profile?.sex,
          birthDate: profile?.birthDate,
          heightCm: profile?.heightCm,
          weightKg: weight?.weightKg,
          activityLevel: profile?.activityLevel,
          goal: profile?.goal,
          rateKgPerWeek: profile?.rateKgPerWeek,
        }}
      />
      <div className="mt-10 border-t border-line pt-6 text-center">
        <SignOutButton />
      </div>
    </main>
  );
}
