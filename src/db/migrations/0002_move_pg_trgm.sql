-- ย้าย pg_trgm ออกจาก schema public ไปไว้ที่ extensions
--
-- ของที่อยู่ใน public จะถูก PostgREST เปิดออกมาเป็น API สาธารณะไปด้วย
-- (database linter ของ Supabase เตือนข้อ 0014) ส่วน index ที่ใช้ gin_trgm_ops
-- ยังทำงานเหมือนเดิม เพราะ operator class ถูกอ้างด้วย OID ไม่ใช่ชื่อ schema
CREATE SCHEMA IF NOT EXISTS extensions;--> statement-breakpoint
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
