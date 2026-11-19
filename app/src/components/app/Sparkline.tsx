import { pathFor } from "@/lib/darwin/navHistory";

/** A tiny line chart that always stays inside its box. */
export function Sparkline({ values, height = 44 }: { values: number[]; height?: number }) {
  if (values.length < 2) return <div style={{ height }} aria-hidden />;
  const { line, area } = pathFor(values, 200, height, 3);
  const up = values.at(-1)! >= values[0];
  const color = up ? "#2f7d5c" : "#bf3b30";
  return (
    <svg viewBox={`0 0 200 ${height}`} preserveAspectRatio="none" width="100%" height={height} style={{ display: "block", marginTop: 8 }} aria-hidden>
      <path d={area} fill={color} opacity={0.08} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
