import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bodymefit — นับแคลอรีและสารอาหาร",
  description: "บันทึกอาหารที่กิน ดูแคลอรี มาโคร และวิตามินเทียบกับเป้าหมายของคุณ",
  applicationName: "Bodymefit",
  // iOS ไม่อ่าน manifest สำหรับสามอย่างนี้ ต้องบอกผ่าน meta tag ของ Apple เอง
  appleWebApp: {
    capable: true,
    title: "Bodymefit",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // ผู้ใช้หลักอยู่บนมือถือ — ล็อกความกว้างไว้ที่จอจริง แต่ยังให้ซูมได้เพื่อการเข้าถึง
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1210" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
