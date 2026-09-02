import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./redirects";

describe("การกรองปลายทาง redirect", () => {
  it("ยอมรับ path ภายในแอป", () => {
    expect(safeInternalPath("/diary", "/dashboard")).toBe("/diary");
  });

  it("ปฏิเสธ URL ข้ามโดเมน", () => {
    expect(safeInternalPath("https://evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("//evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/\\evil.example", "/dashboard")).toBe("/dashboard");
  });

  it("ใช้ค่าตั้งต้นเมื่อไม่ได้ส่งมา", () => {
    expect(safeInternalPath(undefined, "/dashboard")).toBe("/dashboard");
  });

  it("รับ array จาก searchParams โดยใช้ค่าแรก", () => {
    expect(safeInternalPath(["/settings", "/x"], "/dashboard")).toBe("/settings");
  });
});
