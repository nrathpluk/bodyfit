import type { MetadataRoute } from "next";

/**
 * ไฟล์นี้ถูก Next สร้างเป็น /manifest.webmanifest ให้อัตโนมัติ
 *
 * display: standalone = เปิดจากโฮมสกรีนแล้วไม่มีแถบที่อยู่ของเบราว์เซอร์
 * ซึ่งเป็นเหตุผลหลักที่ทำ PWA — ให้รู้สึกเหมือนแอปจริงโดยไม่ต้องผ่าน App Store
 *
 * ไอคอนประกาศทั้ง any และ maskable: Android ครอบไอคอนตามรูปทรงของเครื่อง
 * ถ้าไม่มี maskable ระบบจะใส่กรอบขาวรอบไอคอนให้เอง ซึ่งดูเหมือนของที่ทำไม่เสร็จ
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bodymefit — นับแคลอรีและสารอาหาร",
    short_name: "Bodymefit",
    description: "บันทึกอาหารที่กิน ดูแคลอรี มาโคร และวิตามินเทียบกับเป้าหมายของคุณ",
    lang: "th",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9f9f7",
    theme_color: "#0b0b0b",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "บันทึกอาหารวันนี้", short_name: "บันทึก", url: "/diary" },
      { name: "สรุปวันนี้", short_name: "สรุป", url: "/dashboard" },
    ],
  };
}
