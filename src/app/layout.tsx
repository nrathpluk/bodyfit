import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

/**
 * IBM Plex Sans Thai — เลือกเพราะรูปอักษรไทยถูกออกแบบมาพร้อมกับละติน
 * ไม่ใช่ฟอนต์ฝรั่งที่เอาไทยมาแปะทีหลัง ตัวเลขจึงกลมกลืนกับข้อความไทยในบรรทัดเดียวกัน
 * และมีน้ำหนัก 600 ให้ใช้ทำลำดับความสำคัญโดยไม่ต้องพึ่งขนาดอย่างเดียว
 */
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-thai",
  display: "swap",
});

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
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
