import { LoginForm } from "@/components/auth/login-form";
import { safeInternalPath } from "@/lib/redirects";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Next.js 16: searchParams เป็น Promise ต้อง await
  const params = await searchParams;
  const next = safeInternalPath(params.next, "/dashboard");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Bodymefit</h1>
        <p className="text-sm text-muted">
          บันทึกอาหารที่กิน ดูแคลอรี มาโคร และวิตามินเทียบกับเป้าหมายของคุณ
        </p>
      </header>
      <LoginForm next={next} />
    </main>
  );
}
