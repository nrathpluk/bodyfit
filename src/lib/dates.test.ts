import { describe, expect, it } from "vitest";
import { addDays, ageOn, diffDays, formatThaiDate, toAppDate, today } from "./dates";

describe("การตัดวันตามเวลาไทย", () => {
  it("เที่ยงคืนครึ่งเวลาไทยยังนับเป็นวันใหม่ ไม่ใช่วันก่อนหน้าแบบ UTC", () => {
    // 2026-09-02 00:30 ไทย = 2026-09-01 17:30 UTC
    const instant = new Date("2026-09-01T17:30:00Z");
    expect(toAppDate(instant)).toBe("2026-09-02");
    expect(instant.toISOString().slice(0, 10)).toBe("2026-09-01"); // สิ่งที่ห้ามใช้
  });

  it("ห้าโมงเย็นเวลาไทยยังเป็นวันเดียวกัน", () => {
    expect(toAppDate(new Date("2026-09-02T10:00:00Z"))).toBe("2026-09-02");
  });

  it("23:59 เวลาไทยยังไม่ข้ามวัน", () => {
    expect(toAppDate(new Date("2026-09-02T16:59:00Z"))).toBe("2026-09-02");
  });

  it("today() ใช้ค่าเดียวกับ toAppDate()", () => {
    const now = new Date("2026-12-31T18:00:00Z"); // = 1 ม.ค. 2027 ไทย
    expect(today(now)).toBe("2027-01-01");
  });
});

describe("เลขคณิตของวัน", () => {
  it("บวกวันข้ามเดือนและข้ามปี", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("รองรับปีอธิกสุรทิน", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("นับส่วนต่างวันได้", () => {
    expect(diffDays("2026-09-01", "2026-09-08")).toBe(7);
    expect(diffDays("2026-09-08", "2026-09-01")).toBe(-7);
  });
});

describe("อายุ", () => {
  it("ยังไม่ถึงวันเกิดปีนี้ ให้ลบหนึ่งปี", () => {
    expect(ageOn("2000-12-31", "2026-09-02")).toBe(25);
  });

  it("วันเกิดพอดีนับเต็มปี", () => {
    expect(ageOn("2000-09-02", "2026-09-02")).toBe(26);
  });
});

describe("การแสดงผลแบบไทย", () => {
  it("แปลงเป็น พ.ศ. และเดือนย่อภาษาไทย", () => {
    expect(formatThaiDate("2026-09-02")).toBe("2 ก.ย. 2569");
  });
});
