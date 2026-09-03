-- บันทึกการออกกำลังกาย — แยกขาดจากระบบแคลอรีโดยตั้งใจ
-- พลังงานที่เผาถูกคิดรวมในตัวคูณกิจกรรมของ TDEE อยู่แล้ว เอามาบวกอีกจะนับซ้ำ
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"weight_kg" real NOT NULL,
	"reps" integer NOT NULL,
	"sort_order" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_fk"
  FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade;--> statement-breakpoint

-- ชื่อท่าห้ามซ้ำต่อผู้ใช้หนึ่งคน ไม่งั้นกราฟความก้าวหน้าจะถูกแยกเป็นสองเส้น
CREATE UNIQUE INDEX "exercises_user_name_idx" ON "exercises" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "workout_sets_user_date_idx" ON "workout_sets" USING btree ("user_id","log_date");--> statement-breakpoint
CREATE INDEX "workout_sets_exercise_idx" ON "workout_sets" USING btree ("exercise_id","log_date");--> statement-breakpoint

-- ตารางใหม่ต้องเปิด RLS ทุกครั้ง (ดู CLAUDE.md)
ALTER TABLE "exercises" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_sets" ENABLE ROW LEVEL SECURITY;
