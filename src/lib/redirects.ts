/**
 * กรองปลายทาง redirect ที่รับมาจาก query string
 *
 * ถ้าปล่อยผ่านตรง ๆ จะเปิดช่อง open redirect: ส่งลิงก์ /login?next=https://evil.example
 * ให้เหยื่อกด แล้วพาไปหน้าปลอมหลังล็อกอินสำเร็จ
 * รับเฉพาะ path ภายในแอปที่ขึ้นต้นด้วย "/" เดียว ("//host" คือ URL ข้ามโดเมน)
 */
export function safeInternalPath(
  candidate: string | string[] | undefined,
  fallback: string,
): string {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
