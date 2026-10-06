import Link from "next/link";
import { DashboardUI, KeyBadge, Phone, RemindersUI } from "@/components/marketing/app-screens";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { IconCheck, IconDownload, IconGauge, IconPump, IconScale, IconShield, IconWarn, IconWrench } from "@/components/marketing/icons";
import { Odometer } from "@/components/marketing/odometer";
import { PlanCardsMk } from "@/components/marketing/plans";

export default function Home() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="mk-hero">
        <div className="mk-wrap mk-hero-grid">
          <div>
            <div className="mk-eyebrow">Car cost tracker · Made in Canada</div>
            <h1 style={{ marginTop: 16 }}>
              Know what your car <span className="mk-mark">really</span> costs.
            </h1>
            <p className="lede">
              KeyStub keeps the tab on everything you spend on your vehicles (fuel, repairs, insurance, registration, etc.) and turns it into the
              numbers that matter: cost per kilometre, cost per month, and what&apos;s due next.
            </p>
            <div className="mk-hero-ctas">
              <Link href="/sign-up" className="mk-btn yellow">
                Start free <span className="arrow">→</span>
              </Link>
              <Link href="#how" className="mk-btn ghost">
                See how it works
              </Link>
            </div>
            <div className="mk-checks">
              <span>
                <IconCheck size={16} /> Free for 2 vehicles
              </span>
              <span>
                <IconCheck size={16} /> 30 days of Pro on us
              </span>
              <span>
                <IconCheck size={16} /> No card needed
              </span>
            </div>
          </div>
          <div className="mk-hero-visual">
            <div className="mk-float one">
              <span className="k">Cost per km</span>
              <b>$1.57</b>
            </div>
            <Phone label="KeyStub dashboard showing real data from the founder's vehicle">
              <DashboardUI className="on" />
            </Phone>
            <div className="mk-float two">
              <span className="k">Logged since 2024</span>
              <b>90 records</b>
            </div>
            <div className="mk-float three">
              <KeyBadge />
              <span>
                <span className="k">Registration</span>
                <br />
                <b style={{ fontSize: 15 }}>Due in 15 days</b>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Odometer: real total ---------------- */}
      <section className="mk-dark mk-odo">
        <div className="mk-wrap">
          <div className="mk-eyebrow">Real data, one real car</div>
          <h2 className="mk-h2" style={{ maxWidth: 760 }}>
            Two years. One SUV. Every dollar, counted.
          </h2>
          <div className="odo-row">
            <Odometer value={19269} />
          </div>
          <div className="odo-stats">
            <div>
              <b>$741</b>
              <span>average per month</span>
            </div>
            <div>
              <b>$1.57</b>
              <span>per kilometre driven</span>
            </div>
            <div>
              <b>54%</b>
              <span>of it was insurance</span>
            </div>
          </div>
          <p className="mk-foot-note">*Based on real data: the founder&apos;s own SUV, every fill-up, repair and insurance payment since 2024.</p>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="how" id="how">
        <div className="mk-wrap">
          <div className="rv">
            <div className="mk-eyebrow">How it works</div>
            <h2 className="mk-h2">Three steps. The numbers keep themselves up to date.</h2>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* ---------------- Features (bento) ---------------- */}
      <section style={{ paddingBlock: "40px 110px" }} id="features">
        <div className="mk-wrap">
          <div className="rv">
            <div className="mk-eyebrow">Features</div>
            <h2 className="mk-h2">Everything your car costs, in one place.</h2>
            <p className="mk-sub">
              Fuel, EV charging, maintenance, insurance and registration are built in, plus parking, tolls, roadside assistance, seasonal tires and more. Custom
              categories and miles / gallons / MPG are <Link href="/coming-soon">coming soon</Link>.
            </p>
          </div>
          <div className="bento">
            <article className="b w4 navy rv">
              <span className="icon">
                <IconGauge />
              </span>
              <h3>True cost of ownership</h3>
              <p>Purchase price, fuel, repairs, insurance, registration and everything else in one number, plus cost per km and average monthly cost.</p>
              <div className="demo">
                <div className="demo-box" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, textAlign: "center" }}>
                  {[
                    ["$19,269", "running costs"],
                    ["+ $9,200", "purchase"],
                    ["$28,469", "total so far"],
                  ].map(([v, k]) => (
                    <div key={k}>
                      <b style={{ fontFamily: "var(--font-display-stack)", fontSize: 22, color: "#f4c430", display: "block" }}>{v}</b>
                      <span style={{ fontSize: 12.5, color: "#b9c4d8" }}>{k}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
            <article className="b w2 rv">
              <span className="icon">
                <IconPump />
              </span>
              <h3>A fill-up in 10 seconds</h3>
              <p>Total, litres, odometer. Done. Fuel economy is worked out between full tanks.</p>
              <div className="demo">
                <div className="demo-box">
                  {[
                    ["Sep 16", "46.9 L · full tank", "$77.81"],
                    ["Aug 26", "Fill-up", "$83.21"],
                    ["Aug 21", "Fill-up", "$94.32"],
                  ].map(([d, m, a]) => (
                    <div key={d} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }} className="mk-rowline">
                      <span>
                        <b>{d}</b> <span className="mk-muted">{m}</span>
                      </span>
                      <b>{a}</b>
                    </div>
                  ))}
                </div>
              </div>
            </article>
            <article className="b w3 rv">
              <span className="icon">
                <IconWrench />
              </span>
              <h3>Maintenance with receipts in mind</h3>
              <p>Parts, labour, tax, shop, invoice number and warranty, with next-service reminders by date or kilometres.</p>
              <div className="demo" style={{ paddingBottom: 10 }}>
                <div className="receipt">
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>DEALER SERVICE · INVOICE</div>
                  <div className="r">
                    <span>Parts</span>
                    <span>1,441.82</span>
                  </div>
                  <div className="r">
                    <span>Labour</span>
                    <span>1,920.36</span>
                  </div>
                  <div className="r">
                    <span>Tax</span>
                    <span>174.11</span>
                  </div>
                  <div className="r t">
                    <span>TOTAL</span>
                    <span>$3,656.29</span>
                  </div>
                </div>
              </div>
            </article>
            <article className="b w3 rv" style={{ flexDirection: "row", gap: 20, alignItems: "stretch", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="icon">
                  <IconShield />
                </span>
                <h3>Never miss a renewal</h3>
                <p>Insurance, registration and service reminders, flagged as early as you like: 30 days or 500 km ahead by default, or set your own.</p>
              </div>
              <div style={{ flex: "0 0 auto", margin: "0 auto -60px" }} className="rv-scale">
                <Phone small label="KeyStub reminders screen (example)">
                  <RemindersUI className="on" />
                </Phone>
              </div>
            </article>
            <article className="b w2 rv">
              <span className="icon">
                <IconWarn />
              </span>
              <h3>Typos get caught</h3>
              <p>Duplicate entries and odometer readings that go backwards are flagged before they skew your numbers.</p>
              <div className="demo">
                <div className="warn-card">
                  <IconWarn size={18} />
                  <span>There&apos;s already a fuel entry on Sep 16 for $77.81. Save it anyway?</span>
                </div>
              </div>
            </article>
            <article className="b w2 rv">
              <span className="icon">
                <IconScale />
              </span>
              <h3>Keep or replace?</h3>
              <p>Compare what your car really costs each month against a replacement.</p>
              <div className="demo">
                <div className="calc">
                  <div className="side">
                    <b>$741</b>
                    <span>keep / mo</span>
                  </div>
                  <span className="vs">vs</span>
                  <div className="side">
                    <b>$520</b>
                    <span>replace / mo</span>
                  </div>
                </div>
                <p className="mk-muted" style={{ fontSize: 13, marginTop: 8 }}>Example: a $24,000 replacement breaks even in about 9 years.</p>
              </div>
            </article>
            <article className="b w2 navy rv">
              <span className="icon">
                <IconDownload />
              </span>
              <h3>Your data, always</h3>
              <p>Export everything to a spreadsheet or a full backup, any time, on any plan. No lock-in.</p>
              <div className="demo">
                <div className="files">
                  <span className="file"><IconDownload size={16} /> keystub-backup.json</span>
                  <span className="file"><IconDownload size={16} /> keystub.csv</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ---------------- EV ---------------- */}
      <section className="mk-dark ev-band" id="ev">
        <div className="mk-wrap ev-grid">
          <div className="rv">
            <div className="mk-eyebrow">Electric &amp; plug-in hybrid</div>
            <h2 className="mk-h2">Drive electric? KeyStub speaks kWh.</h2>
            <p className="mk-sub">
              Gas apps treat an EV as an afterthought. KeyStub tracks what actually matters when you plug in, and it works the same for gas, diesel, hybrid and
              plug-in hybrid vehicles.
            </p>
            <ul className="ev-list">
              {[
                ["Every charge, home or away", "Home, work, Level 2 and DC fast, with the network, kWh, battery % and minutes. Skip the cost at home and it’s worked out from your electricity rate."],
                ["Your real efficiency", "kWh/100 km measured at the plug, so charging losses are included. Not the car’s optimistic dash number."],
                ["What you’re saving vs gas", "Your energy cost against a comparable gas car on the same kilometres, at the fuel price you set."],
                ["Battery health over time", "Log state of health or range at 100% every few months and watch how your battery ages against the rated range."],
                ["The rest of EV ownership", "Home charger install, charging subscriptions, tires, cabin filters, 12V battery, and rebates counted as money back."],
              ].map(([t, d]) => (
                <li key={t}>
                  <IconCheck size={18} />
                  <span>
                    <b>{t}.</b> {d}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="ev-cards rv">
            {[
              ["Efficiency", "17.8", "kWh/100 km"],
              ["Average price", "$0.21", "per kWh · 82% at home"],
              ["Energy cost", "$0.037", "per km"],
              ["Saved vs gas", "$1,240", "over 12,400 km"],
            ].map(([k, v, s2]) => (
              <div className="ev-card" key={k}>
                <span className="k">{k}</span>
                <b>{v}</b>
                <span className="s">{s2}</span>
              </div>
            ))}
            <p className="mk-foot-note" style={{ gridColumn: "1 / -1", margin: 0 }}>Example figures for illustration.</p>
          </div>
        </div>
      </section>

      {/* ---------------- Story ---------------- */}
      <section className="story" id="story">
        <div className="mk-wrap">
          <div className="story-card rv">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="mk-eyebrow">Why KeyStub exists</div>
              <blockquote>
                &ldquo;I bought a used SUV in 2024 and started writing down every dollar it cost me. Two years later the spreadsheet
                told a story no app did: insurance was over half of it, and the repairs were adding up. KeyStub is the tracker I wished I&apos;d had
                from day one.&rdquo;
              </blockquote>
              <div className="sig">Jarin, founder of KeyStub</div>
            </div>
            <div className="story-stats">
              <div>
                <span>Insurance</span>
                <b>$10,435</b>
              </div>
              <div>
                <span>Maintenance & repairs</span>
                <b>$5,378</b>
              </div>
              <div>
                <span>Fuel</span>
                <b>$3,236</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Pricing ---------------- */}
      <section className="mk-section mk-band-white" id="pricing">
        <div className="mk-wrap">
          <div className="rv" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
            <div className="mk-eyebrow">Pricing</div>
            <h2 className="mk-h2">Start free. Upgrade when it&apos;s worth it.</h2>
            <p className="mk-sub" style={{ margin: "14px auto 0" }}>
              Every account starts with 30 days of Pro. <Link href="/pricing">Compare all features →</Link>
            </p>
          </div>
          <PlanCardsMk />
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="mk-dark mk-cta">
        <div className="mk-wrap rv">
          <h2>
            Find out what your car <span style={{ color: "#f4c430" }}>really</span> costs.
          </h2>
          <Link href="/sign-up" className="mk-btn yellow">
            Start free <span className="arrow">→</span>
          </Link>
          <p className="mk-foot-note">Free for 2 vehicles · 30 days of Pro · No card needed</p>
        </div>
      </section>
    </>
  );
}
