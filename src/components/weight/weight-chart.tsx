import { formatThaiDate } from "@/lib/dates";
import type { TrendPoint } from "@/lib/weight";

/**
 * กราฟน้ำหนัก — เส้นแนวโน้มเป็นตัวหลัก จุดที่ชั่งจริงเป็นตัวประกอบ
 *
 * ที่ให้เส้นแนวโน้มเด่นกว่าจุดดิบ เพราะจุดดิบคือสิ่งที่ทำให้คนท้อ
 * (ขึ้น 0.8 กก. ในวันเดียวจากน้ำ) ส่วนเส้นแนวโน้มคือสิ่งที่บอกความจริง
 *
 * ตามกฎการแสดงผลข้อมูล: เส้นหนา 2px, จุดรัศมี 4px, เส้นตารางบางและจาง,
 * มีคำอธิบายสัญลักษณ์เพราะมีสองชุดข้อมูล และติดป้ายค่าล่าสุดไว้ตรง ๆ
 */
const WIDTH = 320;
const HEIGHT = 140;
const PAD = { top: 12, right: 14, bottom: 22, left: 34 };

export function WeightChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-sm text-ink-3">
        ชั่งน้ำหนักอย่างน้อยสองวันแล้วกราฟจะขึ้นที่นี่
      </p>
    );
  }

  const values = points.flatMap((p) => [p.weightKg, p.trendKg]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // เผื่อขอบบนล่างเล็กน้อย และกันกรณีน้ำหนักนิ่งสนิทจนช่วงเป็นศูนย์
  const span = Math.max(0.8, max - min);
  const low = min - span * 0.15;
  const high = max + span * 0.15;

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const x = (index: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const y = (value: number) => PAD.top + innerH - ((value - low) / (high - low)) * innerH;

  const trendPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.trendKg)}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];

  const ticks = [high, (high + low) / 2, low];

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`กราฟน้ำหนักตั้งแต่ ${formatThaiDate(first.date)} ถึง ${formatThaiDate(last.date)} แนวโน้มล่าสุด ${last.trendKg} กิโลกรัม`}
      >
        {ticks.map((value, index) => (
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
              {value.toFixed(1)}
            </text>
          </g>
        ))}

        {/* จุดที่ชั่งจริง — จางกว่าเส้นแนวโน้มเพราะเป็นข้อมูลดิบที่มี noise */}
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.weightKg)} r="2.5" fill="var(--ink-3)" />
        ))}

        <path
          d={trendPath}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={x(points.length - 1)} cy={y(last.trendKg)} r="4" fill="var(--ink)" />

        <text
          x={PAD.left}
          y={HEIGHT - 6}
          fill="var(--ink-3)"
          fontSize="9"
        >
          {formatThaiDate(first.date)}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 6}
          textAnchor="end"
          fill="var(--ink-3)"
          fontSize="9"
        >
          {formatThaiDate(last.date)}
        </text>
      </svg>

      <figcaption className="flex items-center justify-center gap-4 text-[11px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-ink" />
          แนวโน้ม
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
          น้ำหนักที่ชั่ง
        </span>
      </figcaption>
    </figure>
  );
}
