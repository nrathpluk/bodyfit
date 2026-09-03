import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { ActivityLevel, FoodSource, Goal, MealSlot, Micros, Sex } from "@/lib/types";

/**
 * โปรไฟล์ผู้ใช้ — 1 แถวต่อ 1 คน
 * user_id คือ id จาก auth.users ของ Supabase (ไม่ตั้ง FK ข้าม schema ไว้ที่นี่
 * เพราะ drizzle-kit ไม่ได้จัดการ schema `auth` — migration แยกเป็นคนผูกให้)
 */
export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name"),
  sex: text("sex").$type<Sex>().notNull(),
  birthDate: date("birth_date").notNull(),
  heightCm: real("height_cm").notNull(),
  activityLevel: text("activity_level").$type<ActivityLevel>().notNull(),
  goal: text("goal").$type<Goal>().notNull(),
  /** อัตราที่ตั้งใจเปลี่ยนน้ำหนัก กก./สัปดาห์ (บวก = ขึ้น, ลบ = ลง) */
  rateKgPerWeek: real("rate_kg_per_week").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * คลังอาหาร — ค่าสารอาหาร "ต่อ 100 กรัม" เสมอ
 * created_by = null คือรายการกลางที่ import มา, ไม่ null คืออาหารที่ผู้ใช้สร้างเอง
 */
export const foods = pgTable(
  "foods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** ชื่อไทย — คลัง USDA เป็นอังกฤษล้วน ถ้าไม่มีคอลัมน์นี้ ผู้ใช้พิมพ์ "ไข่" จะไม่เจออะไรเลย */
    nameTh: text("name_th"),
    brand: text("brand"),
    barcode: text("barcode"),
    source: text("source").$type<FoodSource>().notNull(),
    /** รหัสอ้างอิงในแหล่งต้นทาง เช่น fdcId ของ USDA — ใช้กัน import ซ้ำ */
    sourceRef: text("source_ref"),
    createdBy: uuid("created_by"),
    kcalPer100g: real("kcal_per_100g").notNull(),
    proteinPer100g: real("protein_per_100g").notNull(),
    carbPer100g: real("carb_per_100g").notNull(),
    fatPer100g: real("fat_per_100g").notNull(),
    micros: jsonb("micros").$type<Micros>().default(sql`'{}'::jsonb`).notNull(),
    /** ตรวจสอบค่าแล้ว — ใช้จัดอันดับผลค้นหาให้รายการที่เชื่อถือได้ขึ้นก่อน */
    verified: boolean("verified").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("foods_name_idx").on(t.name),
    index("foods_created_by_idx").on(t.createdBy),
    uniqueIndex("foods_source_ref_idx").on(t.source, t.sourceRef),
  ],
);

/**
 * หน่วยที่ผู้ใช้เลือกได้ ("1 ถ้วย" = 200 ก.) แยกจาก foods เพราะอาหารหนึ่งรายการมีได้หลายหน่วย
 * จำนวนแตะตอนบันทึกลดลงมาก เมื่อไม่ต้องให้ผู้ใช้กรอกกรัมเอง
 */
export const foodServings = pgTable(
  "food_servings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    grams: real("grams").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
  },
  (t) => [
    index("food_servings_food_id_idx").on(t.foodId),
    uniqueIndex("food_servings_food_label_idx").on(t.foodId, t.label),
  ],
);

/**
 * บันทึกมื้ออาหาร — เก็บตัวเลขสารอาหารเป็น snapshot ตอนบันทึก
 *
 * ห้าม join สดจาก foods ตอนแสดงผล: ถ้าแก้ข้อมูลอาหารหนึ่งรายการ
 * ยอดย้อนหลังทุกวันที่เคยกินอาหารนั้นจะขยับตาม ผู้ใช้จะเห็นตัวเลขเมื่อวานเปลี่ยนเอง
 */
export const diaryEntries = pgTable(
  "diary_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    /** วันตามเขตเวลาไทย (lib/dates.ts) ไม่ใช่ UTC */
    entryDate: date("entry_date").notNull(),
    meal: text("meal").$type<MealSlot>().notNull(),
    /** null ได้ เมื่อเป็น quick add ที่ผู้ใช้กรอกแคลเอง */
    foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
    /** ชื่อที่แสดง — คัดลอกมาตอนบันทึก เผื่ออาหารต้นทางถูกลบ */
    name: text("name").notNull(),
    grams: real("grams"),
    servingLabel: text("serving_label"),
    kcal: real("kcal").notNull(),
    protein: real("protein").notNull(),
    carb: real("carb").notNull(),
    fat: real("fat").notNull(),
    micros: jsonb("micros").$type<Micros>().default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("diary_entries_user_date_idx").on(t.userId, t.entryDate)],
);

/**
 * เป้าหมายรายวัน — ตรึงไว้ครั้งเดียวต่อวัน พร้อม basis ที่ใช้คำนวณ
 *
 * ห้ามเปลี่ยนเป็นคำนวณสดจากโปรไฟล์: น้ำหนักตัวเปลี่ยนทุกสัปดาห์
 * ถ้าคำนวณสด กราฟ "กินเทียบเป้า" ย้อนหลังจะเพี้ยนทั้งแถบทุกครั้งที่ชั่งน้ำหนักใหม่
 */
export const dailyTargets = pgTable(
  "daily_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    targetDate: date("target_date").notNull(),
    kcal: real("kcal").notNull(),
    protein: real("protein").notNull(),
    carb: real("carb").notNull(),
    fat: real("fat").notNull(),
    /** ค่าที่ใช้คำนวณวันนั้น (น้ำหนัก อายุ ตัวคูณกิจกรรม สูตร) — ไว้ตรวจย้อนหลังและทำซ้ำได้ */
    basis: jsonb("basis").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("daily_targets_user_date_idx").on(t.userId, t.targetDate)],
);

/** น้ำหนักตัว — 1 ค่าต่อวัน (ชั่งซ้ำในวันเดียวกันคือ upsert ทับ) */
export const weightLogs = pgTable(
  "weight_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    logDate: date("log_date").notNull(),
    weightKg: real("weight_kg").notNull(),
    bodyFatPct: real("body_fat_pct"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("weight_logs_user_date_idx").on(t.userId, t.logDate)],
);

/**
 * สูตรของผู้ใช้ — ประกอบเมนูจากวัตถุดิบในคลังครั้งเดียว แล้วบันทึกทั้งจานในแตะเดียว
 *
 * นี่คือทางที่ทำให้บันทึกอาหารไทยได้โดยไม่ต้องรอฐานข้อมูลเมนูไทยจากใคร
 * ("กะเพราหมูสับ = หมูสับ 100 ก. + ข้าวสวย 200 ก. + น้ำมัน 15 ก.")
 *
 * เก็บเป็นส่วนประกอบ ไม่ใช่ snapshot เพราะสูตรถูกแก้ได้เรื่อย ๆ
 * ส่วนตอนบันทึกลงไดอารียังคำนวณแล้ว snapshot ตัวเลขตามกฎเดิม
 */
export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    /** สูตรนี้แบ่งได้กี่ที่ — ใช้หารสารอาหารรวมให้เป็นต่อหนึ่งที่ */
    servings: real("servings").default(1).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("recipes_user_idx").on(t.userId)],
);

export const recipeItems = pgTable(
  "recipe_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "restrict" }),
    grams: real("grams").notNull(),
    sortOrder: real("sort_order").default(0).notNull(),
  },
  (t) => [index("recipe_items_recipe_idx").on(t.recipeId)],
);
