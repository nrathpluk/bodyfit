import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limit";

describe("การจำกัดอัตราการเรียก", () => {
  it("ปล่อยผ่านจนครบเพดานแล้วค่อยปฏิเสธ", () => {
    const limiter = new RateLimiter(3, 60_000);
    const now = 1_000_000;

    expect(limiter.check("u1", now).allowed).toBe(true);
    expect(limiter.check("u1", now).allowed).toBe(true);
    expect(limiter.check("u1", now).allowed).toBe(true);

    const blocked = limiter.check("u1", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("นับแยกกันแต่ละผู้ใช้ — คนหนึ่งยิงรัวต้องไม่กระทบอีกคน", () => {
    const limiter = new RateLimiter(1, 60_000);
    const now = 1_000_000;

    expect(limiter.check("u1", now).allowed).toBe(true);
    expect(limiter.check("u1", now).allowed).toBe(false);
    expect(limiter.check("u2", now).allowed).toBe(true);
  });

  it("เริ่มนับใหม่เมื่อพ้นหน้าต่างเวลา", () => {
    const limiter = new RateLimiter(1, 60_000);
    const now = 1_000_000;

    expect(limiter.check("u1", now).allowed).toBe(true);
    expect(limiter.check("u1", now).allowed).toBe(false);
    expect(limiter.check("u1", now + 60_001).allowed).toBe(true);
  });

  it("บอกจำนวนวินาทีที่ต้องรอ", () => {
    const limiter = new RateLimiter(1, 60_000);
    const now = 1_000_000;
    limiter.check("u1", now);
    expect(limiter.check("u1", now + 10_000).retryAfterSeconds).toBe(50);
  });

  it("บอกจำนวนครั้งที่เหลือ", () => {
    const limiter = new RateLimiter(3, 60_000);
    const now = 1_000_000;
    expect(limiter.check("u1", now).remaining).toBe(2);
    expect(limiter.check("u1", now).remaining).toBe(1);
    expect(limiter.check("u1", now).remaining).toBe(0);
  });
});
