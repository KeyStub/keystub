"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, monthlyTrend, totalsByCategory, type DatedAmount } from "@/lib/calc";
import { money, moneyShort } from "@/lib/format";
import { MonthlyTrend } from "./charts";

function shift(today: string, months: number) {
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(y, m - 1 - months, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function ReportsView({
  rows,
  today,
  currentMonthly,
  vehicleLabel,
}: {
  rows: DatedAmount[];
  today: string;
  currentMonthly: number;
  vehicleLabel: string;
}) {
  const [range, setRange] = useState("all");
  const [price, setPrice] = useState("");
  const [monthly, setMonthly] = useState("");

  const from = range === "ytd" ? today.slice(0, 4) + "-01-01" : range === "3m" ? shift(today, 3) : range === "12m" ? shift(today, 12) : range === "lastyear" ? `${Number(today.slice(0, 4)) - 1}-01-01` : "0000-01-01";
  const to = range === "lastyear" ? `${Number(today.slice(0, 4)) - 1}-12-31` : "9999-12-31";
  const filtered = useMemo(() => rows.filter((r) => r.date >= from && r.date <= to), [rows, from, to]);
  const byCat = totalsByCategory(filtered);
  const grand = CATEGORIES.reduce((s, c) => s + byCat[c], 0);
  const trend = monthlyTrend(filtered, 12);

  const p = parseFloat(price), m = parseFloat(monthly);
  const diff = currentMonthly / 100 - m;
  let comparison = "";
  if (p >= 0 && m >= 0)
    comparison =
      diff > 0
        ? `Keeping the ${vehicleLabel} currently costs about ${money(diff * 100)}/month more to run than the candidate — plus the ${money(p * 100)} purchase price to switch. Break-even on running costs alone: ${Math.ceil(p / diff)} months.`
        : `The candidate would cost about ${money(-diff * 100)}/month more to run than the ${vehicleLabel} does now — before its ${money(p * 100)} purchase price.`;

  return (
    <>
      <div className="toolbar">
        <select className="select inline" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
          <option value="all">All time</option>
          <option value="ytd">Year to date</option>
          <option value="lastyear">Last calendar year</option>
          <option value="3m">Last 3 months</option>
          <option value="12m">Last 12 months</option>
        </select>
        <button className="btn" onClick={() => window.print()}>
          Print / save as PDF
        </button>
      </div>
      <h3 className="section-title">Totals by category</h3>
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Category</th>
              <th className="num">Total</th>
              <th className="num">Share</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c}>
                <td>{c}</td>
                <td className="num tabular">{money(byCat[c])}</td>
                <td className="num tabular">{grand ? ((byCat[c] / grand) * 100).toFixed(0) + "%" : "—"}</td>
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: 700 }}>Total</td>
              <td className="num tabular" style={{ fontWeight: 700 }}>
                {money(grand)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <h3 className="section-title">Monthly trend</h3>
      <div className="card">
        <MonthlyTrend months={trend} />
      </div>
      <h3 className="section-title">Keep vs. replace</h3>
      <div className="card no-print">
        <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>
          Enter a candidate replacement&apos;s purchase price and estimated monthly running cost (fuel + insurance + maintenance) to compare against what you&apos;re
          really paying now. Uses only the numbers you enter.
        </p>
        <div className="row2">
          <div className="field">
            <label htmlFor="cmp-price">Candidate purchase price ($)</label>
            <input className="input" id="cmp-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cmp-monthly">Candidate est. monthly cost ($)</label>
            <input className="input" id="cmp-monthly" type="number" min={0} value={monthly} onChange={(e) => setMonthly(e.target.value)} />
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Your current avg. monthly ownership cost: <b>{moneyShort(currentMonthly)}</b>
        </p>
        {comparison && <p style={{ fontWeight: 600, marginBottom: 0 }}>{comparison}</p>}
      </div>
    </>
  );
}
