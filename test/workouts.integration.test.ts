import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, createTestUser } from "./db-harness";

const testDb = await createTestDb();
vi.mock("@/db", () => ({ db: testDb }));

const {
  addWorkoutSet,
  deleteExercise,
  deleteWorkoutSet,
  findOrCreateExercise,
  getDaySets,
  getExerciseSummaries,
  getRecentExerciseNames,
  listExercises,
} = await import("@/lib/workouts");

const TODAY = "2026-10-20";
let userId: string;

beforeAll(async () => {
  userId = await createTestUser(testDb, "lift@bodymefit.app");
});

describe("ท่าออกกำลังกาย", () => {
  it("ชื่อเดิมไม่สร้างซ้ำ ไม่งั้นกราฟจะถูกแยกเป็นสองเส้น", async () => {
    const first = await findOrCreateExercise(userId, "เบนช์เพรส");
    const again = await findOrCreateExercise(userId, "เบนช์เพรส");
    expect(again.id).toBe(first.id);
    expect(await listExercises(userId)).toHaveLength(1);
  });

  it("ตัดช่องว่างหัวท้ายก่อนเทียบชื่อ", async () => {
    const spaced = await findOrCreateExercise(userId, "  เบนช์เพรส  ");
    expect(await listExercises(userId)).toHaveLength(1);
    expect(spaced.name).toBe("เบนช์เพรส");
  });

  it("ผู้ใช้คนละคนมีท่าชื่อเดียวกันได้", async () => {
    const other = await createTestUser(testDb, "lift2@bodymefit.app");
    await findOrCreateExercise(other, "เบนช์เพรส");
    expect(await listExercises(other)).toHaveLength(1);
  });
});

describe("การบันทึกเซ็ต", () => {
  it("บันทึกหลายเซ็ตในวันเดียวแล้วจัดกลุ่มตามท่าให้", async () => {
    await addWorkoutSet(userId, {
      exerciseName: "เบนช์เพรส",
      logDate: TODAY,
      weightKg: 60,
      reps: 10,
    });
    await addWorkoutSet(userId, {
      exerciseName: "เบนช์เพรส",
      logDate: TODAY,
      weightKg: 70,
      reps: 6,
    });
    await addWorkoutSet(userId, { exerciseName: "สควอท", logDate: TODAY, weightKg: 90, reps: 5 });

    const groups = await getDaySets(userId, TODAY);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.name === "เบนช์เพรส")!.sets).toHaveLength(2);
  });

  it("ลบเซ็ตของคนอื่นไม่ได้ และตอบเหมือนกรณีไม่มีเซ็ตนั้น", async () => {
    const intruder = await createTestUser(testDb, "lift-thief@bodymefit.app");
    const groups = await getDaySets(userId, TODAY);
    const bench = groups.find((g) => g.name === "เบนช์เพรส")!;

    expect(await deleteWorkoutSet(intruder, bench.sets[0].id)).toBe(false);
    expect(await deleteWorkoutSet(intruder, crypto.randomUUID())).toBe(false);

    const after = await getDaySets(userId, TODAY);
    expect(after.find((g) => g.name === "เบนช์เพรส")!.sets).toHaveLength(2);
  });

  it("ท่าที่เพิ่งเล่นเรียงของใหม่ก่อนและไม่ซ้ำ", async () => {
    const names = await getRecentExerciseNames(userId);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("เบนช์เพรส");
  });
});

describe("สรุปความก้าวหน้า", () => {
  async function seedProgress(email: string, values: [string, number, number][]) {
    const owner = await createTestUser(testDb, email);
    for (const [date, weight, reps] of values) {
      await addWorkoutSet(owner, { exerciseName: "เดดลิฟต์", logDate: date, weightKg: weight, reps });
    }
    return owner;
  }

  it("ยุบทุกเซ็ตของวันให้เหลือจุดเดียว คือเพดานของวันนั้น", async () => {
    const owner = await createTestUser(testDb, "peak@bodymefit.app");
    await addWorkoutSet(owner, { exerciseName: "สควอท", logDate: TODAY, weightKg: 60, reps: 10 });
    await addWorkoutSet(owner, { exerciseName: "สควอท", logDate: TODAY, weightKg: 100, reps: 3 });

    const [summary] = await getExerciseSummaries(owner, 180, TODAY);
    expect(summary.sessions).toHaveLength(1);
    // 100 × (1 + 3/30) = 110 ซึ่งสูงกว่า 60 × (1 + 10/30) = 80
    expect(summary.sessions[0].oneRepMax).toBeCloseTo(110, 1);
    expect(summary.sessions[0].sets).toBe(2);
  });

  it("ยกหนักขึ้นเรื่อย ๆ ให้ทิศทางก้าวหน้า", async () => {
    const owner = await seedProgress("up@bodymefit.app", [
      ["2026-10-01", 100, 5],
      ["2026-10-08", 105, 5],
      ["2026-10-15", 110, 5],
    ]);
    const [summary] = await getExerciseSummaries(owner, 180, TODAY);
    expect(summary.progress?.direction).toBe("up");
    expect(summary.progress!.percentChange).toBeGreaterThan(0);
  });

  it("ยกได้น้อยลงให้ทิศทางถอย", async () => {
    const owner = await seedProgress("down@bodymefit.app", [
      ["2026-10-01", 120, 5],
      ["2026-10-08", 112, 5],
      ["2026-10-15", 105, 5],
    ]);
    const [summary] = await getExerciseSummaries(owner, 180, TODAY);
    expect(summary.progress?.direction).toBe("down");
  });

  it("ลดน้ำหนักแต่เพิ่มจำนวนครั้งไม่ถือว่าถอย เพราะเทียบด้วย 1RM", async () => {
    const owner = await seedProgress("swap@bodymefit.app", [
      ["2026-10-01", 100, 3],
      ["2026-10-08", 95, 5],
      ["2026-10-15", 90, 8],
    ]);
    const [summary] = await getExerciseSummaries(owner, 180, TODAY);
    // 110 / 110.8 / 114 — น้ำหนักดิบลดลงทุกครั้ง แต่ความแข็งแรงเพิ่ม
    expect(summary.progress?.direction).toBe("up");
  });

  it("บันทึกไม่ถึงสามครั้งยังไม่สรุปแนวโน้ม", async () => {
    const owner = await seedProgress("few@bodymefit.app", [
      ["2026-10-01", 100, 5],
      ["2026-10-08", 105, 5],
    ]);
    const [summary] = await getExerciseSummaries(owner, 180, TODAY);
    expect(summary.progress).toBeNull();
    expect(summary.sessions).toHaveLength(2);
  });

  it("ลบท่าแล้วเซ็ตทั้งหมดของท่านั้นหายตาม", async () => {
    const owner = await seedProgress("cascade-lift@bodymefit.app", [["2026-10-01", 80, 5]]);
    const [summary] = await getExerciseSummaries(owner, 180, TODAY);

    expect(await deleteExercise(owner, summary.id)).toBe(true);
    expect(await getExerciseSummaries(owner, 180, TODAY)).toHaveLength(0);
    expect(await getDaySets(owner, "2026-10-01")).toHaveLength(0);
  });

  it("ลบท่าของคนอื่นไม่ได้", async () => {
    const owner = await seedProgress("owner-lift@bodymefit.app", [["2026-10-01", 80, 5]]);
    const intruder = await createTestUser(testDb, "lift-thief2@bodymefit.app");
    const [summary] = await getExerciseSummaries(owner, 180, TODAY);
    expect(await deleteExercise(intruder, summary.id)).toBe(false);
  });
});
