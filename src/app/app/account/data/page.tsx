import { desc, eq } from "drizzle-orm";
import { ExportOptions } from "@/components/customize";
import { ImportPanel } from "@/components/import-panel";
import { db } from "@/db";
import { importLog } from "@/db/schema";
import { fmtDate, vehicleName } from "@/lib/format";
import { listVehicles } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Your data" };

export default async function DataPage() {
  const user = await requireUser();
  const vs = await listVehicles(user.id, { includeArchived: true });
  const imports = await db.select().from(importLog).where(eq(importLog.userId, user.id)).orderBy(desc(importLog.createdAt)).limit(5);
  return (
    <>
      <h2 className="acc-h2">Your data</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
        Your data is yours. Download it any time, on any plan. No lock-in.
      </p>
      <h3 className="section-title" style={{ marginTop: 0 }}>
        Spreadsheet
      </h3>
      <div className="card">
        <ExportOptions vehicles={vs.map((v) => ({ id: v.id, name: vehicleName(v) }))} />
      </div>
      <h3 className="section-title">Full backup</h3>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <p className="muted" style={{ margin: 0, fontSize: 13.5, maxWidth: 440 }}>
          Everything in one file (every vehicle, record and setting) that can be restored into KeyStub later.
        </p>
        <a className="btn" href="/api/export?format=json">
          Download full backup (JSON)
        </a>
      </div>
      <h3 className="section-title" id="import">
        Import a backup
      </h3>
      <ImportPanel vehicles={vs.map((v) => ({ id: v.id, name: vehicleName(v) }))} />
      {imports.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Import history</h3>
          <div className="list">
            {imports.map((i) => {
              const s = JSON.parse(i.summary);
              return (
                <div className="list-item" key={i.id}>
                  <div className="l-main">
                    <div className="l-title">{i.source}</div>
                    <div className="l-sub">
                      {fmtDate(i.createdAt.toISOString())} · {s.inserted} added, {s.updated} updated
                    </div>
                  </div>
                  <span className="chip good">totals matched</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
