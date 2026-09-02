-- ชื่อไทยของอาหาร
--
-- คลัง USDA เป็นภาษาอังกฤษล้วน ผู้ใช้ไทยพิมพ์ "ไข่" หรือ "ข้าวสวย" จะไม่เจออะไรเลย
-- เก็บแยกคอลัมน์แทนที่จะทับ name เดิม เพื่อให้ยังอ้างกลับไปยังชื่อต้นทางได้
-- (ต้องใช้ตอนตรวจสอบข้อมูลและอ้างอิงในเอกสาร)
ALTER TABLE "foods" ADD COLUMN "name_th" text;--> statement-breakpoint
CREATE INDEX "foods_name_th_trgm_idx" ON "foods" USING gin ("name_th" extensions.gin_trgm_ops);
--> statement-breakpoint
-- หน่วยครัวห้ามซ้ำต่ออาหารหนึ่งรายการ เพื่อให้ import ซ้ำได้โดยไม่บวกแถวเพิ่มทุกรอบ
CREATE UNIQUE INDEX "food_servings_food_label_idx" ON "food_servings" ("food_id", "label");
