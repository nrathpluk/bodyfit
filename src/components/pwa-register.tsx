"use client";

import { useEffect } from "react";

/**
 * ลงทะเบียน service worker หลังหน้าโหลดเสร็จ
 *
 * รอ event load ก่อน เพื่อไม่ให้การโหลด sw.js ไปแย่งแบนด์วิดท์กับการเรนเดอร์หน้าแรก
 * ข้ามตอน dev เพราะ service worker จะแคชบันเดิลเก่าค้างไว้จน HMR ไม่ทำงาน
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // ติดตั้งไม่ได้ไม่ใช่เรื่องคอขาดบาดตาย — แอปยังใช้งานได้ปกติเมื่อออนไลน์
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
