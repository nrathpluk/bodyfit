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

## ขั้นตอน

1. เข้า https://vercel.com/new แล้วเลือก repo `nrathpluk/bodyfit`
2. Framework จะถูกตรวจเป็น Next.js เอง ไม่ต้องแก้ Build Command หรือ Output Directory
3. ใส่ Environment Variables ทั้งสามตัว (เลือกทั้ง Production, Preview, Development)

   | ชื่อ | ค่า |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://qskjjobaflbpmqadmdqh.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_EauSCdILGWapYz0QnCfo0A_6fLc6I2u` |
   | `DATABASE_URL` | connection string ของ transaction pooler (port **6543**) จาก `.env.local` |

   `DIRECT_URL` **ไม่ต้องใส่** — ใช้เฉพาะตอนรัน migration จากเครื่องตัวเอง
   ตัวแอปบน Vercel ไม่ได้รัน migration

4. กด Deploy

## หลัง deploy เสร็จ

- เอา URL ที่ได้ไปใส่ใน Supabase Dashboard → Authentication → URL Configuration → **Site URL**
  ถ้าวันหลังเปิด "ยืนยันอีเมล" กลับมา ลิงก์ในอีเมลจะได้ชี้มาที่โดเมนจริงไม่ใช่ localhost
- เปิดเว็บบนมือถือแล้วกด "เพิ่มไปยังหน้าจอโฮม" เพื่อทดสอบ PWA
  (service worker ทำงานเฉพาะบน HTTPS กับ localhost เท่านั้น)

## deploy ครั้งถัดไป

Vercel ผูกกับ GitHub ไว้แล้ว ทุกครั้งที่ push ขึ้น `main` จะ deploy ให้เอง
ส่วน branch อื่นจะได้ URL พรีวิวแยกของตัวเอง
