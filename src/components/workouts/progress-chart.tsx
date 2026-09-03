import { formatThaiDate } from "@/lib/dates";
import type { SessionPoint } from "@/lib/strength";

/**
 * กราฟความก้าวหน้าของท่าหนึ่งท่า — แกนตั้งคือ 1RM ที่ประมาณได้
 *
 * ใช้ 1RM ไม่ใช่น้ำหนักที่ยกจริง เพราะน้ำหนักกับจำนวนครั้งแลกกันได้
 * ยก 80 กก. 5 ครั้ง กับ 70 กก. 10 ครั้ง แข็งแรงพอกัน แต่ถ้าพลอตน้ำหนักดิบ
 * กราฟจะดูเหมือนถอยหลังทั้งที่ไม่ได้ถอย
 *
 * ชุดข้อมูลเดียวจึงไม่ต้องมีคำอธิบายสัญลักษณ์ — หัวข้อของการ์ดบอกอยู่แล้วว่าคือท่าอะไร
 */
const WIDTH = 320;
const HEIGHT = 120;
const PAD = { top: 10, right: 12, bottom: 20, left: 34 };

export function ProgressChart({ sessions }: { sessions: SessionPoint[] }) {
  if (sessions.length < 2) {
    return (
      <p className="py-4 text-center text-sm text-ink-3">
        บันทึกอีกอย่างน้อยหนึ่งครั้งแล้วกราฟจะขึ้นที่นี่
      </p>
    );
  }

  const values = sessions.map((s) => s.oneRepMax);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(2, max - min);
  const low = min - span * 0.2;
  const high = max + span * 0.2;

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (sessions.length - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - ((v - low) / (high - low)) * innerH;

  const path = sessions.map((s, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(s.oneRepMax)}`).join(" ");
  const last = sessions[sessions.length - 1];
  const first = sessions[0];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`กราฟความแข็งแรงตั้งแต่ ${formatThaiDate(first.date)} ถึง ${formatThaiDate(last.date)} ล่าสุดประมาณ ${Math.round(last.oneRepMax)} กิโลกรัม`}
      >
        {[high, low].map((value, index) => (
          <g key={index}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={y(value) + 3}
              textAnchor="end"
              fill="var(--ink-3)"
              fontSize="9"
            >
              {Math.round(value)}
            </text>
          </g>
        ))}

        <path
          d={path}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {sessions.map((s, i) => (
          <circle key={s.date} cx={x(i)} cy={y(s.oneRepMax)} r="2.5" fill="var(--ink)" />
        ))}
        <circle cx={x(sessions.length - 1)} cy={y(last.oneRepMax)} r="4" fill="var(--ink)" />

        <text x={PAD.left} y={HEIGHT - 5} fill="var(--ink-3)" fontSize="9">
          {formatThaiDate(first.date)}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 5}
          textAnchor="end"
          fill="var(--ink-3)"
          fontSize="9"
        >
          {formatThaiDate(last.date)}
        </text>
      </svg>
    </figure>
  );
}
