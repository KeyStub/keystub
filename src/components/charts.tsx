import { CATEGORIES, type Category } from "@/lib/calc";
import { DEFAULT_UNITS, makeFmt, type UnitPrefs } from "@/lib/units";

const COLORS: Record<Category, string> = { Fuel: "var(--s1)", Charging: "var(--s5)", Maintenance: "var(--s2)", Insurance: "var(--s3)", Other: "var(--s4)" };

export function CategoryBars({ totals, units = DEFAULT_UNITS }: { totals: Record<Category, number>; units?: UnitPrefs }) {
  const { money, moneyShort } = makeFmt(units);
  const cats = CATEGORIES.map((c) => ({ label: c, val: totals[c] })).filter((c) => c.val > 0);
  if (!cats.length) return <p className="muted">No spending recorded yet.</p>;
  const max = Math.max(...cats.map((c) => c.val));
  const w = 560, barH = 26, gap = 14, padL = 92, padR = 70;
  const h = cats.length * (barH + gap) + gap;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="bar-chart" role="img" aria-label="Spending by category">
      {cats.map((c, i) => {
        const y = gap + i * (barH + gap);
        const bw = Math.max(2, (c.val / max) * (w - padL - padR));
        return (
          <g key={c.label}>
            <text x={padL - 10} y={y + barH / 2 + 4} textAnchor="end">
              {c.label}
            </text>
            <rect x={padL} y={y} width={w - padL - padR} height={barH} rx={4} fill="var(--surface-2)" />
            <rect x={padL} y={y} width={bw} height={barH} rx={4} fill={COLORS[c.label]}>
              <title>{`${c.label}: ${money(c.val)}`}</title>
            </rect>
            <text x={padL + bw + 8} y={y + barH / 2 + 4} className="tabular">
              {moneyShort(c.val)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MonthlyTrend({ months, units = DEFAULT_UNITS }: { months: ({ month: string } & Record<Category, number>)[]; units?: UnitPrefs }) {
  const { money, moneyShort } = makeFmt(units);
  if (!months.length) return <p className="muted">Not enough data in this range.</p>;
  const max = Math.max(1, ...months.map((m) => CATEGORIES.reduce((s, c) => s + m[c], 0)));
  const w = 640, h = 220, padL = 52, padB = 24, padT = 10;
  const plotW = w - padL - 16, plotH = h - padB - padT;
  const slot = plotW / months.length;
  const bw = slot * 0.62;
  const label = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en-CA", { month: "short" }) + (months.length > 6 ? "" : ` ${y.slice(2)}`);
  };
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} className="bar-chart" role="img" aria-label="Monthly spending trend">
        {[0, 0.5, 1].map((f) => {
          const y = padT + plotH * (1 - f);
          return (
            <g key={f}>
              <line x1={padL} x2={w - 16} y1={y} y2={y} className="grid-line" />
              <text x={padL - 6} y={y + 3} textAnchor="end">
                {moneyShort(max * f)}
              </text>
            </g>
          );
        })}
        {months.map((m, i) => {
          let y0 = padT + plotH;
          const x = padL + i * slot + (slot - bw) / 2;
          return (
            <g key={m.month}>
              {CATEGORIES.map((c) => {
                const v = m[c];
                if (v <= 0) return null;
                const bh = (v / max) * plotH;
                y0 -= bh;
                return (
                  <rect key={c} x={x} y={y0} width={bw} height={bh} fill={COLORS[c]}>
                    <title>{`${c} ${m.month}: ${money(v)}`}</title>
                  </rect>
                );
              })}
              <text x={x + bw / 2} y={h - 6} textAnchor="middle">
                {label(m.month)}
              </text>
            </g>
          );
        })}
        <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} className="axis-line" />
      </svg>
      <div className="legend">
        {CATEGORIES.map((c) => (
          <div key={c} className="legend-item">
            <span className="legend-swatch" style={{ background: COLORS[c] }} />
            {c}
          </div>
        ))}
      </div>
    </>
  );
}
