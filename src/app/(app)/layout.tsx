import { AppNav } from "@/components/app-nav";

/**
 * เลย์เอาต์ของหน้าที่ต้องล็อกอิน
 *
 * มือถือและแท็บเล็ต: เว้นที่ท้ายหน้าให้แถบเมนูล่าง
 * จอใหญ่ (lg): เว้นที่ซ้ายให้แถบข้าง (กว้าง 14rem เท่ากับ lg:w-56 ใน AppNav)
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="pb-20 lg:pb-0 lg:pl-56">{children}</div>
      <AppNav />
    </>
  );
}
