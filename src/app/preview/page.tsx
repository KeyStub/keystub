import { notFound } from "next/navigation";
import { listVehicles } from "@/server/data";
import { getSession } from "@/server/session";

export const metadata = { title: "Mobile preview", robots: { index: false } };

/**
 * Development-only design check: the real website and app pages, side by side, each in a
 * 390 × 844 phone-sized frame (iPhone 15 size). App frames use whoever is signed in locally.
 */
export default async function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const s = await getSession();
  const v = s ? (await listVehicles(s.user.id))[0] : undefined;
  const app = v ? `/app/v/${v.id}` : null;

  const groups: { title: string; frames: [string, string][] }[] = [
    {
      title: "Website",
      frames: [
        ["Home", "/"],
        ["Pricing", "/pricing"],
        ["Coming soon", "/coming-soon"],
        ["Sign up (shows your garage while you're signed in)", "/sign-up"],
      ],
    },
    {
      title: "App",
      frames: app
        ? [
            ["Dashboard", app],
            ["Fuel", `${app}/fuel`],
            ['Log a fill-up ("+")', `${app}/fuel?add=1`],
            ["Reminders", `${app}/reminders`],
            ["Maintenance", `${app}/maintenance`],
            ["Reports", `${app}/reports`],
            ["Garage", "/app?garage=1"],
            ["Account", "/app/account"],
          ]
        : [["Sign in to see the app screens", "/sign-in"]],
    },
  ];

  return (
    <div style={{ background: "#e9edf3", minHeight: "100vh", padding: "28px 20px 60px", fontFamily: "var(--font-body-stack)" }}>
      <h1 style={{ margin: 0, fontSize: 26, color: "#0f1a2b" }}>KeyStub: mobile preview</h1>
      <p style={{ color: "#4b5870", margin: "6px 0 0", maxWidth: 760 }}>
        Real pages at phone size (390 × 844), live from your local app. Each frame scrolls on its own. Local-only page; it doesn&apos;t exist on the
        live site.
      </p>
      {groups.map((g) => (
        <section key={g.title}>
          <h2 style={{ fontSize: 18, color: "#0f1a2b", margin: "32px 0 14px" }}>{g.title}</h2>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {g.frames.map(([label, src]) => (
              <figure key={src} style={{ margin: 0 }}>
                <div
                  style={{
                    width: 292,
                    height: 633,
                    borderRadius: 40,
                    padding: 9,
                    background: "#0b1220",
                    boxShadow: "0 24px 50px -24px rgba(14,24,41,.6)",
                  }}
                >
                  <div style={{ width: 274, height: 615, borderRadius: 32, overflow: "hidden", background: "#fff" }}>
                    <iframe
                      src={src}
                      title={label}
                      loading="lazy"
                      style={{ width: 390, height: 875, border: 0, transform: "scale(0.7026)", transformOrigin: "0 0" }}
                    />
                  </div>
                </div>
                <figcaption style={{ textAlign: "center", marginTop: 10, fontWeight: 600, color: "#0f1a2b", fontSize: 14 }}>
                  {label}{" "}
                  <a href={src} target="_blank" rel="noopener" style={{ color: "#4b5870", fontWeight: 500 }}>
                    open ↗
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
