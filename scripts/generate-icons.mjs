/**
 * สร้างไอคอน PNG ของ PWA จากโค้ด ไม่ต้องพึ่งไฟล์ภาพหรือไลบรารีภายนอก
 *
 * รันด้วย: npm run icons
 * เขียนทับไฟล์ใน public/ ทุกครั้ง ผลลัพธ์เหมือนเดิมเสมอเมื่อพารามิเตอร์เท่าเดิม
 *
 * เขียน PNG เองด้วย zlib ที่มากับ Node เพราะไอคอนเป็นรูปเรขาคณิตล้วน
 * การลง sharp หรือ canvas เพื่องานเท่านี้ไม่คุ้มกับน้ำหนักที่เพิ่มใน CI
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import path from "node:path";

/*
 * พื้นหมึกกับแท่งสามสีของสารอาหาร (โปรตีน/คาร์บ/ไขมัน) ชุดเดียวกับที่ใช้ในแอป
 * ไอคอนจึงเป็นตัวอย่างย่อของภาษาสีที่ผู้ใช้จะเจอข้างใน ไม่ใช่โลโก้ที่ไม่เกี่ยวกับอะไรเลย
 */
const BG = [11, 11, 11];
const BARS = [
  [42, 120, 214], // โปรตีน #2a78d6
  [235, 104, 52], // คาร์บ #eb6834
  [27, 175, 122], // ไขมัน #1baf7a
];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  // แต่ละบรรทัดต้องมีไบต์บอกชนิด filter นำหน้า ใช้ 0 (ไม่กรอง) เพราะภาพเล็กและบีบอัดดีอยู่แล้ว
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ระยะจากจุดถึงสี่เหลี่ยมมุมมน — ติดลบแปลว่าอยู่ข้างใน ใช้ทำขอบเนียน (anti-alias) */
function roundedRectDistance(px, py, x, y, w, h, radius) {
  const dx = Math.max(x - px, px - (x + w), 0);
  const dy = Math.max(y - py, py - (y + h), 0);
  const inside =
    px > x + radius && px < x + w - radius && py > y + radius && py < y + h - radius;
  if (inside) return -1;
  const cx = Math.min(Math.max(px, x + radius), x + w - radius);
  const cy = Math.min(Math.max(py, y + radius), y + h - radius);
  if (dx === 0 && dy === 0) return Math.hypot(px - cx, py - cy) - radius;
  return Math.hypot(dx, dy) + Math.hypot(px - cx, py - cy) - radius;
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const s = size / 512; // ออกแบบบนผืน 512 แล้วย่อ/ขยายตามขนาดที่ขอ

  /*
   * แท่งสามแท่งไล่ระดับ = ความคืบหน้าของแต่ละวัน ชุดเดียวกับไอคอน "สรุป" ในแอป
   * วางไว้ในกรอบกลาง 60% เพื่อให้รอดจากการครอบของ maskable icon
   * (Android ครอบเป็นวงกลมได้ ของที่อยู่ริมจะโดนตัด)
   */
  const bars = [
    { x: 150, y: 300, w: 60, h: 110 },
    { x: 226, y: 220, w: 60, h: 190 },
    { x: 302, y: 140, w: 60, h: 270 },
  ];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const px = (x + 0.5) / s;
      const py = (y + 0.5) / s;

      let color = BG;
      const alpha = 255;

      bars.forEach((bar, index) => {
        if (color !== BG) return;
        const d = roundedRectDistance(px, py, bar.x, bar.y, bar.w, bar.h, 18);
        if (d < 0.5) {
          // ไล่ความทึบตรงขอบ 1 px เพื่อไม่ให้เห็นรอยหยัก
          const coverage = Math.min(1, Math.max(0, 0.5 - d));
          const fill = BARS[index];
          color = [
            Math.round(BG[0] + (fill[0] - BG[0]) * coverage),
            Math.round(BG[1] + (fill[1] - BG[1]) * coverage),
            Math.round(BG[2] + (fill[2] - BG[2]) * coverage),
          ];
        }
      });

      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = alpha;
    }
  }

  return encodePng(size, size, rgba);
}

const OUT = path.resolve(import.meta.dirname, "../public");
for (const [file, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(path.join(OUT, file), drawIcon(size));
  console.log(`เขียน public/${file} (${size}×${size})`);
}
