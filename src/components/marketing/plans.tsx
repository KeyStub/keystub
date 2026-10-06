import Link from "next/link";
import { COMPARISON, PLANS, TRIAL_DAYS } from "@/lib/plans";
import { IconCheck } from "./icons";

const Soon = () => <span className="mk-soon">Coming soon</span>;

export function PlanCardsMk() {
  return (
    <div className="mk-price-grid">
      <div className="mk-plan rv">
        <h3>{PLANS.free.name}</h3>
        <div className="amt">$0</div>
        <p className="blurb">{PLANS.free.blurb}</p>
        <ul>
          {PLANS.free.features.map((f) => (
            <li key={f.text}>
              <IconCheck size={18} />
              <span>
                {f.text} {f.soon && <Soon />}
              </span>
            </li>
          ))}
        </ul>
        <div className="cta">
          <Link href="/sign-up" className="mk-btn ghost">
            Get started
          </Link>
        </div>
      </div>
      <div className="mk-plan pro rv">
        <span className="tag">{TRIAL_DAYS} days free</span>
        <h3>{PLANS.pro.name}</h3>
        <div className="amt">
          {PLANS.pro.priceYearly}
          <small>/year</small>
        </div>
        <p className="blurb">
          or {PLANS.pro.priceMonthly}/month, CAD. {PLANS.pro.blurb}
        </p>
        <ul>
          {PLANS.pro.features.map((f) => (
            <li key={f.text}>
              <IconCheck size={18} />
              <span>
                {f.text} {f.soon && <Soon />}
              </span>
            </li>
          ))}
        </ul>
        <div className="cta">
          <Link href="/sign-up" className="mk-btn navy">
            Start {TRIAL_DAYS}-day free trial <span className="arrow">→</span>
          </Link>
          <span className="note">No card needed. After {TRIAL_DAYS} days you move to Free and keep all your data, unless you upgrade.</span>
        </div>
      </div>
    </div>
  );
}

const cell = (v: boolean | string) =>
  v === true ? (
    <span style={{ color: "var(--mk-good)" }} aria-label="Included">
      <IconCheck size={20} />
    </span>
  ) : v === false ? (
    <span style={{ color: "var(--mk-ink-3)" }} aria-label="Not included">
      –
    </span>
  ) : (
    <b style={{ fontWeight: 600 }}>{v}</b>
  );

export function CompareTableMk() {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="mk-compare">
        <thead>
          <tr>
            <th>Feature</th>
            <th className="c">Free</th>
            <th className="c">Pro</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON.map((r) => (
            <tr key={r.label}>
              <td>
                {r.label} {r.soon && <Soon />}
              </td>
              <td className="c">{cell(r.free)}</td>
              <td className="c">{cell(r.pro)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
