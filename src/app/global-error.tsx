"use client";

/**
 * ตาข่ายชั้นสุดท้าย — ใช้เมื่อ layout ราก (รวมถึงฟอนต์และธีม) เรนเดอร์ไม่ได้
 * ไฟล์นี้ต้องมี html/body ของตัวเอง และห้ามพึ่งอะไรจาก layout ราก
 * จึงเขียนสไตล์ไว้ในไฟล์ตรง ๆ ไม่ใช้คลาสของ Tailwind
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#f9f9f7",
          color: "#0b0b0b",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "24rem" }}>
          <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>แอปเกิดข้อผิดพลาด</h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#52514e", marginBottom: "20px" }}>
            ลองโหลดใหม่อีกครั้ง ถ้ายังไม่หายให้ปิดแล้วเปิดแอปใหม่
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "48px",
              width: "100%",
              borderRadius: "12px",
              border: "none",
              background: "#0b0b0b",
              color: "#f9f9f7",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            โหลดใหม่
          </button>
        </div>
      </body>
    </html>
  );
}
