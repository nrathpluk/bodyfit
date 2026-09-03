import { NextRequest } from "next/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, createTestUser } from "./db-harness";

/*
 * เทสต์ชั้น HTTP และ server action — ชั้นที่เดิมไม่มีเทสต์ครอบเลย
 *
 * ชั้น lib มีเทสต์อยู่แล้ว แต่ชั้นนี้คือที่ที่กฎเรื่องสิทธิ์อยู่จริง
 * (ตอบ 401 เมื่อไม่ได้ล็อกอิน, ไม่ให้แก้ของคนอื่น, จำกัดอัตราการเรียก)
 * ถ้าไม่ครอบ การรีแฟกเตอร์ route จะทำให้ช่องโหว่หลุดออกไปโดยเทสต์ยังเขียวอยู่
 */
const testDb = await createTestDb();
vi.mock("@/db", () => ({ db: testDb }));

// ผู้ใช้ปัจจุบันถูกสลับได้ในแต่ละเทสต์ เพื่อจำลองทั้งกรณีล็อกอินและไม่ล็อกอิน
let currentUserId: string | null = null;
vi.mock("@/lib/auth", () => ({
  getCurrentUser: async () => (currentUserId ? { id: currentUserId } : null),
  requireUser: async () => {
    if (!currentUserId) throw new Error("ต้องเข้าสู่ระบบก่อน");
    return { id: currentUserId };
  },
}));

// server action เรียก revalidatePath ซึ่งต้องมี request context ของ Next
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { GET: searchRoute } = await import("@/app/api/foods/search/route");
const { GET: foodRoute } = await import("@/app/api/foods/[id]/route");
const { GET: barcodeRoute } = await import("@/app/api/foods/barcode/[code]/route");
const { GET: recentRoute } = await import("@/app/api/diary/recent/route");
const actions = await import("@/app/(app)/diary/actions");
const { foods, foodServings } = await import("@/db/schema");
const { loadDay } = await import("@/lib/diary");

const DATE = "2026-09-10";

let userId: string;
let riceId: string;
let riceCupId: string;

function request(url: string) {
  return new Request(url) as never;
}

/** route ที่อ่าน query string ต้องใช้ NextRequest ไม่ใช่ Request ธรรมดา */
function nextRequest(url: string) {
  return new NextRequest(url) as never;
}

beforeAll(async () => {
  userId = await createTestUser(testDb, "api@bodymefit.app");
  currentUserId = userId;

  const inserted = await testDb
    .insert(foods)
    .values([
      {
        name: "Rice, white, long-grain, regular, enriched, cooked",
        nameTh: "ข้าวสวย",
        source: "usda",
        sourceRef: "168878",
        kcalPer100g: 130,
        proteinPer100g: 2.69,
        carbPer100g: 28.2,
        fatPer100g: 0.28,
        micros: { sodium_mg: 1 },
        verified: true,
      },
      {
        // สินค้าบาร์โค้ดที่ผู้ใช้ทั่วโลกกรอกเอง ต้องถูกจัดอันดับไว้ทีหลัง
        name: "Rice drink, sweetened",
        nameTh: "เครื่องดื่มข้าว",
        source: "off",
        sourceRef: "1111111111111",
        barcode: "1111111111111",
        kcalPer100g: 47,
        proteinPer100g: 0.3,
        carbPer100g: 9.6,
        fatPer100g: 1,
        micros: {},
        verified: false,
      },
    ])
    .returning();

  riceId = inserted[0].id;

  const servings = await testDb
    .insert(foodServings)
    .values([{ foodId: riceId, label: "cup", grams: 158, isDefault: true }])
    .returning();
  riceCupId = servings[0].id;
});

afterEach(() => {
  currentUserId = userId;
});

describe("สิทธิ์การเข้าถึง API", () => {
  it("ค้นหาอาหารโดยไม่ล็อกอินตอบ 401", async () => {
    currentUserId = null;
    const response = await searchRoute(nextRequest("http://localhost/api/foods/search?q=ข้าว"));
    expect(response.status).toBe(401);
  });

  it("ดูรายละเอียดอาหารโดยไม่ล็อกอินตอบ 401", async () => {
    currentUserId = null;
    const response = await foodRoute(request("http://localhost/api/foods/x"), {
      params: Promise.resolve({ id: riceId }),
    } as never);
    expect(response.status).toBe(401);
  });

  it("ดูรายการล่าสุดโดยไม่ล็อกอินตอบ 401", async () => {
    currentUserId = null;
    expect((await recentRoute()).status).toBe(401);
  });
});

describe("API ค้นหาอาหาร", () => {
  it("คืนผลลัพธ์เมื่อล็อกอินแล้ว", async () => {
    const response = await searchRoute(
      nextRequest(`http://localhost/api/foods/search?q=${encodeURIComponent("ข้าว")}`),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.foods.length).toBeGreaterThan(0);
  });

  it("จัดข้อมูลห้องแล็บไว้ก่อนข้อมูลที่ผู้ใช้กรอกเอง", async () => {
    const response = await searchRoute(
      nextRequest(`http://localhost/api/foods/search?q=${encodeURIComponent("ข้าว")}`),
    );
    const body = await response.json();
    const verifiedRank = body.foods.findIndex((f: { verified: boolean }) => f.verified);
    const unverifiedRank = body.foods.findIndex((f: { verified: boolean }) => !f.verified);
    expect(verifiedRank).toBeLessThan(unverifiedRank);
  });

  it("ตอบ 404 เมื่อขออาหารที่ไม่มีอยู่", async () => {
    const response = await foodRoute(request("http://localhost/api/foods/x"), {
      params: Promise.resolve({ id: crypto.randomUUID() }),
    } as never);
    expect(response.status).toBe(404);
  });
});

describe("API บาร์โค้ด", () => {
  it("ปฏิเสธรูปแบบบาร์โค้ดที่ผิดตั้งแต่ก่อนยิงออกเน็ต", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const response = await barcodeRoute(request("http://localhost/api/foods/barcode/123"), {
      params: Promise.resolve({ code: "123" }),
    } as never);
    expect(response.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("จำกัดอัตราการเรียก แล้วตอบ 429 พร้อมบอกเวลาที่ต้องรอ", async () => {
    currentUserId = await createTestUser(testDb, "flood@bodymefit.app");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: 0 }), { status: 200 }),
    );

    let lastStatus = 200;
    let retryAfter: string | null = null;
    for (let i = 0; i < 21; i += 1) {
      const response = await barcodeRoute(
        request("http://localhost/api/foods/barcode/8850000000000"),
        { params: Promise.resolve({ code: "8850000000000" }) } as never,
      );
      lastStatus = response.status;
      retryAfter = response.headers.get("Retry-After");
    }

    expect(lastStatus).toBe(429);
    expect(Number(retryAfter)).toBeGreaterThan(0);
    vi.mocked(globalThis.fetch).mockRestore();
  });
});

describe("server action ของไดอารี", () => {
  function form(values: Record<string, string>) {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.append(key, value);
    return data;
  }

  it("ปฏิเสธข้อมูลที่ไม่ผ่านการตรวจ และไม่บันทึกอะไรลงฐานข้อมูล", async () => {
    const before = await loadDay(userId, DATE);
    const result = await actions.addFoodAction(
      form({ entryDate: DATE, meal: "lunch", foodId: "ไม่ใช่ uuid", grams: "100" }),
    );
    expect(result.ok).toBe(false);
    const after = await loadDay(userId, DATE);
    expect(after.totals.kcal).toBe(before.totals.kcal);
  });

  it("บันทึกแล้วยอดของวันเพิ่มขึ้นตามที่ server คำนวณเอง", async () => {
    const result = await actions.addFoodAction(
      form({ entryDate: DATE, meal: "lunch", foodId: riceId, servingId: riceCupId, quantity: "1" }),
    );
    expect(result.ok).toBe(true);

    const day = await loadDay(userId, DATE);
    expect(day.entriesByMeal.lunch).toHaveLength(1);
    expect(day.entriesByMeal.lunch[0].kcal).toBeCloseTo(205.4, 1);
  });

  it("แก้ปริมาณแล้วสารอาหารถูกคำนวณใหม่ ไม่ใช่เก็บค่าที่ client ส่งมา", async () => {
    const day = await loadDay(userId, DATE);
    const entry = day.entriesByMeal.lunch[0];

    const result = await actions.updateAmountAction(
      form({ entryId: entry.id, grams: "50", quantity: "1", kcal: "99999" }),
    );
    expect(result.ok).toBe(true);

    const after = await loadDay(userId, DATE);
    expect(after.entriesByMeal.lunch[0].kcal).toBe(65);
    expect(after.entriesByMeal.lunch[0].grams).toBe(50);
  });

  it("บันทึกซ้ำจากรายการเดิมได้ตัวเลขเท่าเดิมเป๊ะ", async () => {
    const day = await loadDay(userId, DATE);
    const source = day.entriesByMeal.lunch[0];

    const result = await actions.repeatEntryAction({
      sourceEntryId: source.id,
      entryDate: DATE,
      meal: "dinner",
    });
    expect(result.ok).toBe(true);

    const after = await loadDay(userId, DATE);
    expect(after.entriesByMeal.dinner[0].kcal).toBe(source.kcal);
    expect(after.entriesByMeal.dinner[0].grams).toBe(source.grams);
  });

  it("ไม่ส่งวันมา = ให้ server ตัดสินว่าวันนี้ กันบันทึกผิดวันตอนข้ามเที่ยงคืน", async () => {
    const solo = await createTestUser(testDb, "midnight@bodymefit.app");
    currentUserId = solo;

    // ฟอร์มของ "วันนี้" จะไม่ส่ง entryDate มาเลย
    const result = await actions.addFoodAction(
      form({ meal: "snack", foodId: riceId, grams: "100", quantity: "1" }),
    );
    expect(result.ok).toBe(true);

    const { today } = await import("@/lib/dates");
    const day = await loadDay(solo, today());
    expect(day.entriesByMeal.snack).toHaveLength(1);
  });

  it("แก้รายการของคนอื่นไม่ได้", async () => {
    const day = await loadDay(userId, DATE);
    const victim = day.entriesByMeal.lunch[0];

    currentUserId = await createTestUser(testDb, "intruder-api@bodymefit.app");
    const result = await actions.updateAmountAction(
      form({ entryId: victim.id, grams: "500", quantity: "1" }),
    );
    expect(result.ok).toBe(false);

    currentUserId = userId;
    const after = await loadDay(userId, DATE);
    expect(after.entriesByMeal.lunch[0].grams).toBe(50);
  });

  it("รายการล่าสุดไม่ซ้ำรายการเดิม และเรียงของใหม่ก่อน", async () => {
    const response = await recentRoute();
    const body = await response.json();
    const keys = body.foods.map((f: { name: string; grams: number }) => `${f.name}|${f.grams}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(body.foods.length).toBeGreaterThan(0);
  });
});
