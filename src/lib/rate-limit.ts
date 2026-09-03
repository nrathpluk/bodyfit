/**
 * ตัวจำกัดอัตราการเรียกแบบง่าย เก็บสถานะในหน่วยความจำของ process
 *
 * ใช้กับปลายทางที่ยิงต่อไปยังบริการภายนอก (Open Food Facts) เพราะผู้ใช้ที่ล็อกอินแล้ว
 * ยิงรัว ๆ ได้ไม่จำกัด จะกลายเป็นเราไปถล่มบริการของคนอื่นในนามแอปเรา
 * และอาจโดนแบนทั้งแอป
 *
 * **ข้อจำกัดที่ต้องรู้**: บน Vercel แต่ละ instance มีหน่วยความจำของตัวเอง
 * ตัวเลขจึงเป็นเพดาน "ต่อ instance" ไม่ใช่ทั้งระบบ ถ้าวันหลังต้องการเพดานที่แม่นจริง
 * ต้องย้ายไปเก็บใน Postgres หรือ Redis — แต่สำหรับกันคนกดรัวคนเดียว เท่านี้พอ
 * และไม่ต้องแลกด้วย round trip เพิ่มทุกครั้งที่สแกน
 */
export type RateLimitResult = {
  allowed: boolean;
  /** จำนวนครั้งที่เหลือในหน้าต่างเวลานี้ */
  remaining: number;
  /** วินาทีที่ต้องรอก่อนลองใหม่ — 0 เมื่อยังไม่ถูกจำกัด */
  retryAfterSeconds: number;
};

type Bucket = { count: number; resetAt: number };

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    this.sweep(now);

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.limit - 1, retryAfterSeconds: 0 };
    }

    if (bucket.count >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }

    bucket.count += 1;
    return { allowed: true, remaining: this.limit - bucket.count, retryAfterSeconds: 0 };
  }

  /** ทิ้งถังที่หมดอายุ ไม่งั้นแมปจะโตขึ้นเรื่อย ๆ ตามจำนวนผู้ใช้ที่เคยเข้ามา */
  private sweep(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

/**
 * เพดานการค้นบาร์โค้ด: 20 ครั้งต่อ 5 นาทีต่อผู้ใช้
 * คนสแกนของจริงในตู้เย็นรอบหนึ่งไม่เกินสิบกว่าชิ้น เลขนี้จึงไม่ขวางการใช้งานปกติ
 */
export const barcodeLimiter = new RateLimiter(20, 5 * 60 * 1000);
