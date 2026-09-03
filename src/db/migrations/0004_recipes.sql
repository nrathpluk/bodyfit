CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"servings" real DEFAULT 1 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "recipe_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"grams" real NOT NULL,
	"sort_order" real DEFAULT 0 NOT NULL
);--> statement-breakpoint

ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_fk"
  FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade;--> statement-breakpoint
-- ห้ามลบอาหารที่ยังถูกใช้ในสูตร ไม่งั้นสูตรจะคำนวณไม่ได้ทั้งสูตร
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_food_id_fk"
  FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users("id") ON DELETE CASCADE;--> statement-breakpoint

CREATE INDEX "recipes_user_idx" ON "recipes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_items_recipe_idx" ON "recipe_items" USING btree ("recipe_id");--> statement-breakpoint

-- ตารางใหม่ต้องเปิด RLS ทุกครั้ง (ดู CLAUDE.md)
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recipe_items" ENABLE ROW LEVEL SECURITY;
