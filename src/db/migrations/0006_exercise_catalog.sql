-- เปิดทางให้มีคลังท่ากลางที่ทุกคนใช้ร่วมกัน
--
-- เดิมท่าต้องเป็นของผู้ใช้คนใดคนหนึ่งเสมอ แปลว่าทุกคนต้องพิมพ์ชื่อท่าเองตั้งแต่ต้น
-- ซึ่งทำให้สะกดไม่ตรงกันและกราฟถูกแยกเป็นหลายเส้น
-- user_id = null คือท่าจากคลังกลาง แนวเดียวกับ foods.created_by
ALTER TABLE "exercises" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "equipment" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "primary_muscle" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "level" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "source" text DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "source_ref" text;--> statement-breakpoint

-- ดัชนีเดิมกันชื่อซ้ำต่อผู้ใช้ แต่ Postgres ถือว่า NULL แต่ละตัวไม่เท่ากัน
-- ถ้าปล่อยไว้ ท่าในคลังกลางจะซ้ำกันได้ ต้องแยกเป็นสองดัชนีแบบมีเงื่อนไข
DROP INDEX IF EXISTS "exercises_user_name_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_user_name_idx" ON "exercises" ("user_id", "name")
  WHERE "user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_shared_name_idx" ON "exercises" ("name")
  WHERE "user_id" IS NULL;--> statement-breakpoint
-- กัน import ซ้ำ
CREATE UNIQUE INDEX "exercises_source_ref_idx" ON "exercises" ("source", "source_ref")
  WHERE "source_ref" IS NOT NULL;--> statement-breakpoint

CREATE INDEX "exercises_name_idx" ON "exercises" USING btree ("name");--> statement-breakpoint
CREATE INDEX "exercises_user_idx" ON "exercises" USING btree ("user_id");--> statement-breakpoint
-- ค้นด้วยคำที่อยู่กลางชื่อ ("bench" ต้องเจอ "Barbell Bench Press")
CREATE INDEX "exercises_name_trgm_idx" ON "exercises" USING gin ("name" extensions.gin_trgm_ops);
