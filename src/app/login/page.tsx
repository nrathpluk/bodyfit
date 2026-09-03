import { LoginForm } from "@/components/auth/login-form";
import { safeInternalPath } from "@/lib/redirects";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Next.js 16: searchParams เป็น Promise ต้อง await
  const params = await searchParams;
  const next = safeInternalPath(params.next, "/dashboard");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-10 px-6 py-12">
      <header className="space-y-3">
        {/* เครื่องหมายของแอปเป็นแท่งสามแท่งชุดเดียวกับไอคอน ใช้สีของสารอาหารสามตัว */}
        <span aria-hidden className="flex items-end gap-1">
          <span className="h-4 w-2 rounded-[2px] bg-protein" />
          <span className="h-6 w-2 rounded-[2px] bg-carb" />
          <span className="h-9 w-2 rounded-[2px] bg-fat" />
        </span>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Bodymefit</h1>
        <p className="text-sm leading-relaxed text-ink-2">
          บันทึกอาหารที่กิน ดูแคลอรี มาโคร และวิตามินเทียบกับเป้าหมายของคุณ
        </p>
      </header>
      <LoginForm next={next} />
    </main>
  );
}
