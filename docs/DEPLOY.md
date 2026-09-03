# การ deploy ขึ้น Vercel

## ทำไมต้องตั้ง region เป็น `sin1`

ฐานข้อมูล Supabase อยู่ที่ `ap-southeast-1` (สิงคโปร์) และทุกหน้าในแอปนี้ query ฐานข้อมูล
ถ้าปล่อยให้ Vercel รันที่ค่าเริ่มต้น (`iad1` สหรัฐฯ) ทุกคำขอจะวิ่งข้ามมหาสมุทรไปกลับ
เพิ่มเวลาราว 200–250 มิลลิวินาที **ต่อหนึ่ง query** ซึ่งหน้าไดอารีมีหลาย query ต่อการโหลดหนึ่งครั้ง
ค่านี้ตั้งไว้แล้วใน `vercel.json` ไม่ต้องแก้อะไรเพิ่ม

## ทำไม `/sw.js` ต้องห้ามแคช

ถ้า CDN แคช service worker ไว้นาน ผู้ใช้ที่เคยเปิดแอปแล้วจะติดอยู่กับ service worker
ตัวเก่าต่อไปเรื่อย ๆ แม้ deploy ใหม่ไปแล้ว แก้บั๊กในนั้นไม่ถึงเครื่องผู้ใช้
`vercel.json` จึงบังคับ `must-revalidate` ไว้

## สถานะปัจจุบัน

deploy แล้วที่ **https://bodymefit.vercel.app** (โปรเจกต์ `bodymefit` ภายใต้บัญชี `jay-7344`)

Environment variables ที่ตั้งไว้บน Vercel แล้ว ทั้ง Production และ Preview

| ชื่อ | หมายเหตุ |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL ของโปรเจกต์ Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | คีย์สาธารณะ ปลอดภัยที่จะอยู่ในบันเดิลฝั่ง client |
| `DATABASE_URL` | transaction pooler port **6543** |

`DIRECT_URL` **ไม่ได้ใส่บน Vercel โดยตั้งใจ** — ใช้เฉพาะตอนรัน migration จากเครื่องตัวเอง
ตัวแอปไม่ได้รัน migration จึงไม่ควรเอารหัสผ่านขึ้นไปเก็บในที่ที่ไม่ได้ใช้

## deploy ด้วยมือ

```bash
vercel deploy --prod --yes
```

## ยังค้าง: ต่อ GitHub เพื่อให้ deploy อัตโนมัติ

`vercel git connect` ยังล้มเหลวเพราะ **Vercel GitHub App ยังไม่ได้ติดตั้งบนบัญชี GitHub**
Vercel จึงมองไม่เห็น repo แก้โดยเข้า

https://vercel.com/jay-7344/bodymefit/settings/git

แล้วกด Connect Git Repository → เลือก `nrathpluk/bodyfit` → GitHub จะขอให้ติดตั้งแอปให้ก่อน
เสร็จแล้วทุก push ขึ้น `main` จะ deploy เอง และ branch อื่นจะได้ URL พรีวิวของตัวเอง

## หลัง deploy เสร็จ

- ใส่ `https://bodymefit.vercel.app` ใน Supabase Dashboard → Authentication → URL Configuration → **Site URL**
  ถ้าวันหลังเปิด "ยืนยันอีเมล" กลับมา ลิงก์ในอีเมลจะได้ชี้มาที่โดเมนจริงไม่ใช่ localhost
- เปิดเว็บบนมือถือแล้วกด "เพิ่มไปยังหน้าจอโฮม" เพื่อทดสอบ PWA
  (service worker ทำงานเฉพาะบน HTTPS กับ localhost เท่านั้น)

## ข้อควรระวังเรื่อง connection string

รหัสผ่านฐานข้อมูลมีอักขระ `@` อยู่ข้างใน ซึ่งตามมาตรฐาน URL ต้องเข้ารหัสเป็น `%40`
ตอนนี้ใช้งานได้เพราะ `postgres.js` ตัดที่ `@` ตัวสุดท้าย แต่เครื่องมืออื่น
(psql, Prisma, ตัวตรวจ URL ทั่วไป) อาจตีความผิดว่าโฮสต์คือส่วนหลัง `@` ตัวแรก
ถ้าวันหลังเจอ error แปลก ๆ เรื่องต่อฐานข้อมูล ให้ลองเข้ารหัส `@` เป็น `%40`
และ `+` เป็น `%2B` ก่อนเป็นอันดับแรก
