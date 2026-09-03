/*
 * Service worker แบบเล็กที่สุดที่ทำให้ติดตั้งเป็นแอปได้และเปิดตอนเน็ตหลุดแล้วไม่ขาว
 *
 * กฎที่ห้ามแก้: **ห้ามแคชหน้าที่ต้องล็อกอินหรือคำตอบของ API**
 * เครื่องเดียวอาจมีคนใช้หลายคน ถ้าแคชหน้าที่มีข้อมูลส่วนตัวไว้
 * คนถัดไปที่เปิดแอปจะเห็นข้อมูลของคนก่อนหน้าโดยที่เซิร์ฟเวอร์ไม่รู้เรื่องด้วย
 *
 * จึงแคชเฉพาะไฟล์สแตติกที่ไม่มีข้อมูลผู้ใช้ (ไอคอน หน้าออฟไลน์ บันเดิลของ Next)
 */
const VERSION = "v1";
const SHELL_CACHE = `bodymefit-shell-${VERSION}`;
const ASSET_CACHE = `bodymefit-assets-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // การเปิดหน้า: ต่อเน็ตก่อนเสมอ ไม่แคชคำตอบ เพราะหน้าเหล่านี้มีข้อมูลผู้ใช้
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // ไฟล์บันเดิลของ Next มีแฮชในชื่อ เปลี่ยนเนื้อหาเมื่อไรชื่อก็เปลี่ยน แคชถาวรได้
  if (url.pathname.startsWith("/_next/static/") || url.pathname.endsWith(".png")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }

  // ที่เหลือ (เช่น /api) ปล่อยผ่านไปหาเซิร์ฟเวอร์ตามปกติ ไม่แตะ
});
