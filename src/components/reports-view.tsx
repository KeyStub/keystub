"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CATEGORIES,
  monthlyTrend,
  totalsByCategory,
  type Category,
  type DatedAmount,
} from "@/lib/calc";
import { fmtDate } from "@/lib/format";
import {
  REPORT_CATS,
  REPORT_SECTIONS,
  type ReportPrefs,
  type ReportSection,
} from "@/lib/prefs";
import { savePrefs } from "@/server/actions";
import { useToast } from "./ui";
import { useFmt } from "./units-provider";
import { MonthlyTrend } from "./charts";

const RANGE_LABELS: Record<string, string> = {
  all: "All time",
  ytd: "Year to date",
  lastyear: "Last calendar year",
  "3m": "Last 3 months",
  "12m": "Last 12 months",
};

function shift(today: string, months: number) {
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(y, m - 1 - months, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export type ReportRecord = {
  date: string;
  cat: Category;
  title: string;
  cents: number;
};

const CAT_LABEL: Record<string, string> = {
  Insurance: "Insurance",
  Other: "Registration & other",
};

export function ReportsView({
  rows,
  records,
  today,
  currentMonthly,
  vehicleLabel,
  vehicleId,
  prefs,
}: {
  rows: DatedAmount[];
  records: ReportRecord[];
  today: string;
  currentMonthly: number;
  vehicleLabel: string;
  vehicleId: string;
  prefs: ReportPrefs;
}) {
  const u = useFmt();
  const { money, moneyShort } = u;
  const toast = useToast();
  const router = useRouter();
  const [range, setRange] = useState("all");
  const [sections, setSections] = useState<ReportSection[]>(prefs.sections);
  const [cats, setCats] = useState<Category[]>(prefs.cats as Category[]);
  const isDefault =
    JSON.stringify({ s: [...sections].sort(), c: [...cats].sort() }) ===
    JSON.stringify({
      s: [...prefs.sections].sort(),
      c: [...prefs.cats].sort(),
    });
  const [price, setPrice] = useState("");
  const [monthly, setMonthly] = useState("");

  const from =
    range === "ytd"
      ? today.slice(0, 4) + "-01-01"
      : range === "3m"
        ? shift(today, 3)
        : range === "12m"
          ? shift(today, 12)
          : range === "lastyear"
            ? `${Number(today.slice(0, 4)) - 1}-01-01`
            : "0000-01-01";
  const to =
    range === "lastyear"
      ? `${Number(today.slice(0, 4)) - 1}-12-31`
      : "9999-12-31";
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => r.date >= from && r.date <= to && cats.includes(r.cat),
      ),
    [rows, from, to, cats],
  );
  const items = useMemo(
    () =>
      records
        .filter((r) => r.date >= from && r.date <= to && cats.includes(r.cat))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records, from, to, cats],
  );
  const byCat = totalsByCategory(filtered);
  const shownCats = CATEGORIES.filter((c) => cats.includes(c));
  const grand = shownCats.reduce((s, c) => s + byCat[c], 0);
  const csv = new URLSearchParams({ format: "csv", vehicle: vehicleId });
  if (from !== "0000-01-01") csv.set("from", from);
  if (to !== "9999-12-31") csv.set("to", to);
  if (cats.length < REPORT_CATS.length) csv.set("cats", cats.join(","));
  const has = (s: ReportSection) => sections.includes(s);
  const trend = monthlyTrend(filtered, 12);

  const p = parseFloat(price),
    m = parseFloat(monthly);
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
        <select
          className="select inline"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          aria-label="Date range"
        >
          <option value="all">All time</option>
          <option value="ytd">Year to date</option>
          <option value="lastyear">Last calendar year</option>
          <option value="3m">Last 3 months</option>
          <option value="12m">Last 12 months</option>
        </select>
        <button className="btn" onClick={() => window.print()}>
          Print / save as PDF
        </button>
        <a className="btn" href={`/api/export?${csv}`}>
          Download spreadsheet
        </a>
      </div>
      <details className="card no-print report-opts">
        <summary>
          <b>Customize report</b>
          <span className="muted">
            {" "}
            · {sections.length} section{sections.length === 1 ? "" : "s"},{" "}
            {cats.length === REPORT_CATS.length
              ? "all categories"
              : `${cats.length} of ${REPORT_CATS.length} categories`}
          </span>
        </summary>
        <div className="report-opts-body">
          <div>
            <div className="label">Show</div>
            {REPORT_SECTIONS.map((s) => (
              <label key={s.id} className="check-line compact">
                <input
                  type="checkbox"
                  checked={has(s.id)}
                  onChange={(e) =>
                    setSections(
                      e.target.checked
                        ? [...sections, s.id]
                        : sections.filter((x) => x !== s.id),
                    )
                  }
                />
                {s.label}
              </label>
            ))}
          </div>
          <div>
            <div className="label">Categories</div>
            {REPORT_CATS.map((c) => (
              <label key={c} className="check-line compact">
                <input
                  type="checkbox"
                  checked={cats.includes(c)}
                  onChange={(e) =>
                    setCats(
                      e.target.checked
                        ? [...cats, c]
                        : cats.filter((x) => x !== c),
                    )
                  }
                />
                {CAT_LABEL[c] ?? c}
              </label>
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn sm"
            disabled={isDefault || !cats.length}
            onClick={async () => {
              const res = await savePrefs("reports", { sections, cats });
              if (!res.ok) return toast("Couldn't save.", true);
              toast("Saved as your default report.");
              router.refresh();
            }}
          >
            Save as my default
          </button>
          <span className="muted" style={{ fontSize: 12.5 }}>
            Applies to the page, the printout and the spreadsheet.
          </span>
        </div>
      </details>
      <div className="print-only" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: "0 0 2px", fontSize: 20 }}>Cost report</h2>
        <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
          {RANGE_LABELS[range]} · Generated {fmtDate(today)}
        </div>
      </div>
      {!cats.length && (
        <div className="note">
          Pick at least one category under Customize report.
        </div>
      )}
      {has("totals") && (
        <>
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
                {shownCats.map((c) => (
                  <tr key={c}>
                    <td>{CAT_LABEL[c] ?? c}</td>
                    <td className="num tabular">{money(byCat[c])}</td>
                    <td className="num tabular">
                      {grand
                        ? ((byCat[c] / grand) * 100).toFixed(0) + "%"
                        : "—"}
                    </td>
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
        </>
      )}
      {has("trend") && (
        <>
          <h3 className="section-title">Monthly trend</h3>
          <div className="card">
            <MonthlyTrend units={u.prefs} months={trend} />
          </div>
        </>
      )}
      {has("records") && (
        <>
          <h3 className="section-title">Every entry ({items.length})</h3>
          <div className="card table-wrap">
            {items.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No entries in this range.
              </p>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Details</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDate(r.date)}
                      </td>
                      <td>{CAT_LABEL[r.cat] ?? r.cat}</td>
                      <td>{r.title}</td>
                      <td className="num tabular">{money(r.cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
      <h3 className="section-title no-print">Keep vs. replace</h3>
      <div className="card no-print">
        <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>
          Enter a candidate replacement&apos;s purchase price and estimated
          monthly running cost (fuel + insurance + maintenance) to compare
          against what you&apos;re really paying now. Uses only the numbers you
          enter.
        </p>
        <div className="row2">
          <div className="field">
            <label htmlFor="cmp-price">
              Candidate purchase price ({u.symbol})
            </label>
            <input
              className="input"
              id="cmp-price"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="cmp-monthly">
              Candidate est. monthly cost ({u.symbol})
            </label>
            <input
              className="input"
              id="cmp-monthly"
              type="number"
              min={0}
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
            />
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Your current avg. monthly ownership cost:{" "}
          <b>{moneyShort(currentMonthly)}</b>
        </p>
        {comparison && (
          <p style={{ fontWeight: 600, marginBottom: 0 }}>{comparison}</p>
        )}
      </div>
    </>
  );
}
