-- เปิด RLS แบบ deny-all ทุกตาราง (ไม่มี policy = ไม่มีใครอ่านได้ผ่าน API สาธารณะ)
--
-- แอปเข้าถึงฐานข้อมูลผ่าน server เท่านั้น ด้วย connection ที่เป็นเจ้าของตาราง
-- ซึ่ง bypass RLS อยู่แล้ว ชั้นนี้จึงเป็นตาข่ายกันพลาด เผื่อ publishable key หลุด
-- หรือมีคนเผลอเรียก PostgREST ตรง ๆ
-- ตารางใหม่ทุกตารางต้องเพิ่มบรรทัดแบบเดียวกันในไฟล์ migration ของตัวเอง
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "foods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "food_servings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "diary_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "daily_targets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "weight_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- ผูกข้อมูลผู้ใช้กับ auth.users ของ Supabase
-- ตั้ง FK ที่นี่แทนที่จะประกาศใน schema.ts เพราะ drizzle-kit ไม่จัดการ schema `auth`
-- ผลพลอยได้: ลบบัญชีทีเดียว ข้อมูลทุกตารางหายตาม ไม่ต้องไล่ลบเอง
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "daily_targets" ADD CONSTRAINT "daily_targets_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_created_by_fk"
  FOREIGN KEY ("created_by") REFERENCES auth.users("id") ON DELETE SET NULL;--> statement-breakpoint

-- ค้นหาอาหารด้วยคำที่อยู่กลางชื่อ ("ผัดกะเพรา" ควรเจอจาก "กะเพรา")
-- btree ธรรมดาช่วยได้เฉพาะ prefix จึงต้องใช้ trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "foods_name_trgm_idx" ON "foods" USING gin ("name" gin_trgm_ops);--> statement-breakpoint

-- บาร์โค้ดต้องไม่ซ้ำ แต่ยอมให้ว่างได้หลายแถว (อาหารส่วนใหญ่ไม่มีบาร์โค้ด)
CREATE UNIQUE INDEX "foods_barcode_idx" ON "foods" ("barcode") WHERE "barcode" IS NOT NULL;
