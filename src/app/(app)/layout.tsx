import { AppNav } from "@/components/app-nav";

/**
 * เลย์เอาต์ของหน้าที่ต้องล็อกอิน — มีแถบเมนูล่างร่วมกันทุกหน้า
 * pb-20 กันไม่ให้เนื้อหาท้ายหน้าถูกแถบเมนูบัง
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="pb-20">{children}</div>
      <AppNav />
    </>
  );
}
