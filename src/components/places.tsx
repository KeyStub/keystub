"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isSavedName, nearestPlace, placeKey, suggestPlace, type PlaceKind, type PlaceOption, type PlacesData } from "@/lib/places";
import { deletePlace, savePlace, updatePlace, type ActionResult } from "@/server/actions";
import { Field, Modal, useConfirm, useToast } from "./ui";

const WORDS: Record<PlaceKind, { one: string; many: string; manage: string }> = {
  fuel: { one: "station", many: "stations", manage: "Manage saved stations" },
  charging: { one: "network", many: "networks", manage: "Manage saved networks" },
};

/** Current position, or null if unavailable / refused / too slow. Only runs when asked. */
function locate(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

/** True only if the person has already allowed location for this site (never triggers a prompt). */
async function locationAlreadyAllowed() {
  try {
    const p = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return p?.state === "granted";
  } catch {
    return false;
  }
}

/**
 * Station / network field with a real dropdown of saved and recent places.
 * New entries start with the most-used saved place, or the saved place you're standing at
 * (if you've allowed location and saved that place's location).
 */
export function PlaceField({
  places,
  name,
  id,
  label,
  defaultValue,
  suggest,
  placeholder,
}: {
  places: PlacesData;
  name: string;
  id: string;
  label: string;
  defaultValue?: string | null;
  /** true for new entries: pre-fill the suggestion */
  suggest: boolean;
  placeholder?: string;
}) {
  const w = WORDS[places.kind];
  const initial = defaultValue ?? (suggest ? (suggestPlace(places.options)?.name ?? "") : "");
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState(false); // filter by what's typed (vs. show everything after tapping ▾)
  const [active, setActive] = useState(0);
  const [hint, setHint] = useState<string | null>(suggest && initial ? `Your most-used ${w.one}` : null);
  const boxRef = useRef<HTMLDivElement>(null);
  const hasLocations = places.options.some((o) => o.saved && o.lat != null);

  // Already allowed location? Quietly check whether you're at one of your saved places.
  useEffect(() => {
    if (!suggest || defaultValue || !hasLocations) return;
    let cancelled = false;
    locationAlreadyAllowed().then(async (ok) => {
      if (!ok || cancelled) return;
      const here = await locate();
      const near = here && nearestPlace(places.options, here);
      if (near && !cancelled) {
        setValue(near.name);
        setHint(`📍 You're at ${near.name}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [suggest, defaultValue, hasLocations, places.options]);

  // Close when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const shown = useMemo(() => {
    const q = placeKey(value);
    return filter && q ? places.options.filter((o) => placeKey(o.name).includes(q)) : places.options;
  }, [filter, value, places.options]);

  function pick(o: PlaceOption) {
    setValue(o.name);
    setHint(null);
    setOpen(false);
  }

  async function nearMe() {
    setHint("Finding your location…");
    const here = await locate();
    if (!here) return setHint("Couldn't get your location. Check that location is allowed for this site.");
    const near = nearestPlace(places.options, here);
    if (near) {
      setValue(near.name);
      setHint(`📍 You're at ${near.name}`);
    } else setHint(`None of your saved ${w.many} are within 300 m of you.`);
  }

  return (
    <div className="field place-field" ref={boxRef}>
      <label htmlFor={id}>{label}</label>
      <div className="place-input">
        <input
          className="input"
          id={id}
          name={name}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          onChange={(e) => {
            setValue(e.target.value);
            setHint(null);
            setFilter(true);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, shown.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open && shown[active]) {
              e.preventDefault();
              pick(shown[active]);
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
        {hasLocations && (
          <button type="button" className="place-btn" onClick={nearMe} aria-label={`Use the saved ${w.one} I'm at`} title={`Use the saved ${w.one} I'm at`}>
            📍
          </button>
        )}
        <button
          type="button"
          className="place-btn"
          aria-label={`Show ${w.many}`}
          onClick={() => {
            setFilter(false);
            setOpen((o) => !o);
            setActive(0);
          }}
        >
          ▾
        </button>
      </div>
      {hint && <div className="hint">{hint}</div>}
      {open && (
        <div className="place-list" id={`${id}-list`} role="listbox">
          {shown.length === 0 ? (
            <div className="place-empty">
              {places.options.length === 0
                ? `No ${w.many} yet. Type one in; after saving, KeyStub offers to remember it.`
                : `No match. Keep typing to use a new ${w.one}.`}
            </div>
          ) : (
            shown.map((o, i) => (
              <button
                key={o.id ?? o.name}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`place-opt${i === active ? " on" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
              >
                <span className="place-star" aria-hidden="true">
                  {o.saved ? "★" : ""}
                </span>
                <span className="place-name">{o.name}</span>
                <span className="place-meta">
                  {o.saved && o.lat != null ? "📍 " : ""}
                  {o.uses ? `${o.uses}×` : o.saved ? "saved" : ""}
                </span>
              </button>
            ))
          )}
          <Link href="/app/account#stations" className="place-manage">
            {w.manage}
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * After saving an entry with a station that isn't saved: offer to save it (and its location).
 * Returns the modal element plus a function to call with the name that was used.
 */
export function useSavePlacePrompt(places: PlacesData | undefined): { prompt: ReactNode; maybeOffer: (name: string) => void } {
  const [name, setName] = useState<string | null>(null);
  const [withLocation, setWithLocation] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const kind = places?.kind ?? "fuel";
  const w = WORDS[kind];
  const storeKey = `ks_declined_places_${kind}`;

  const declined = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(storeKey) ?? "[]");
    } catch {
      return [];
    }
  };

  function maybeOffer(raw: string) {
    const n = raw.trim();
    if (!places || !n || isSavedName(places.options, n) || declined().includes(placeKey(n))) return;
    setWithLocation(false);
    setName(n);
  }

  function notNow() {
    if (name)
      try {
        localStorage.setItem(storeKey, JSON.stringify([...declined(), placeKey(name)].slice(-50)));
      } catch {}
    setName(null);
  }

  async function save() {
    if (!name) return;
    setBusy(true);
    const here = withLocation ? await locate() : null;
    const res = await savePlace({ kind, name, lat: here?.lat ?? null, lng: here?.lng ?? null });
    setBusy(false);
    if (!res.ok) return toast("error" in res ? res.error : `Couldn't save the ${w.one}.`, true);
    toast(withLocation && !here ? `Saved, but we couldn't get your location. You can add it in Account.` : `${name} saved to your ${w.many}.`);
    setName(null);
    router.refresh();
  }

  const prompt = (
    <Modal
      open={!!name}
      title={`Save “${name ?? ""}” to your ${w.many}?`}
      onClose={notNow}
      footer={
        <>
          <button className="btn" onClick={notNow}>
            Not now
          </button>
          <button className="btn primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : `Save ${w.one}`}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0 }}>
        Saved {w.many} appear at the top of the list, and your most-used one fills in automatically next time.
      </p>
      {typeof navigator !== "undefined" && "geolocation" in navigator && (
        <label className="check-line">
          <input type="checkbox" checked={withLocation} onChange={(e) => setWithLocation(e.target.checked)} />
          <span>
            I&apos;m here now. Remember where this {w.one} is, so KeyStub can suggest it when I&apos;m here. <span className="muted">(Uses your location once; it&apos;s never tracked.)</span>
          </span>
        </label>
      )}
    </Modal>
  );
  return { prompt, maybeOffer };
}

/** Account → Saved stations: rename, delete, set/clear location, add new. */
export function SavedPlacesSettings({ fuel, charging }: { fuel: PlacesData; charging: PlacesData }) {
  return (
    <>
      <h3 className="section-title" id="stations">
        Saved stations
      </h3>
      <PlaceGroup data={fuel} title="Fill-up stations" />
      {(charging.options.some((o) => o.saved) || charging.options.length > 0) && <PlaceGroup data={charging} title="Charging networks" />}
    </>
  );
}

function PlaceGroup({ data, title }: { data: PlacesData; title: string }) {
  const w = WORDS[data.kind];
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [renaming, setRenaming] = useState<PlaceOption | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const saved = data.options.filter((o) => o.saved);
  const suggestions = data.options.filter((o) => !o.saved && o.uses >= 2).slice(0, 5);

  async function run(key: string, fn: () => Promise<ActionResult>, okMsg: string) {
    setBusy(key);
    const res = await fn();
    setBusy(null);
    if (!res.ok) return toast("error" in res ? res.error : "Something went wrong.", true);
    toast(okMsg);
    router.refresh();
  }

  async function setHere(o: PlaceOption) {
    setBusy(o.id);
    const here = await locate();
    setBusy(null);
    if (!here) return toast("Couldn't get your location. Check that location is allowed for this site.", true);
    await run(o.id!, () => updatePlace(o.id!, { lat: here.lat, lng: here.lng }), `Location saved for ${o.name}.`);
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {saved.length === 0 ? (
        <p className="muted" style={{ margin: "0 0 8px", fontSize: 13.5 }}>
          None saved yet. After you log an entry at a new {w.one}, KeyStub offers to save it.
        </p>
      ) : (
        <div className="list">
          {saved.map((o) => (
            <div className="list-item" key={o.id}>
              <div className="l-main">
                <div className="l-title">{o.name}</div>
                <div className="l-sub">
                  {o.uses ? `Used ${o.uses}× in the last year` : "Not used in the last year"} · {o.lat != null ? "📍 Location saved" : "No location"}
                </div>
              </div>
              <div className="place-actions">
                <button className="btn sm ghost" disabled={busy === o.id} onClick={() => setRenaming(o)}>
                  Rename
                </button>
                {o.lat != null ? (
                  <button className="btn sm ghost" disabled={busy === o.id} onClick={() => run(o.id!, () => updatePlace(o.id!, { clearLocation: true }), "Location removed.")}>
                    Clear location
                  </button>
                ) : (
                  <button className="btn sm ghost" disabled={busy === o.id} onClick={() => setHere(o)} title={`Use while you're at this ${w.one}`}>
                    I&apos;m here: save location
                  </button>
                )}
                <button
                  className="btn sm ghost"
                  disabled={busy === o.id}
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Remove ${o.name}?`,
                      message: `It will no longer be suggested. Your past entries keep the ${w.one} name.`,
                      confirmLabel: "Remove",
                      danger: true,
                    });
                    if (ok) await run(o.id!, () => deletePlace(o.id!), `${o.name} removed.`);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
            You use these often. Save them?
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {suggestions.map((o) => (
              <button
                key={o.name}
                className="btn sm"
                disabled={busy === o.name}
                onClick={() => run(o.name, () => savePlace({ kind: data.kind, name: o.name }), `${o.name} saved.`)}
              >
                + {o.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <AddPlace kind={data.kind} />
      <Modal open={!!renaming} title={`Rename ${renaming?.name ?? ""}`} onClose={() => setRenaming(null)}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const n = String(new FormData(e.currentTarget).get("name")).trim();
            const o = renaming!;
            setRenaming(null);
            await run(o.id!, () => updatePlace(o.id!, { name: n }), "Renamed.");
          }}
        >
          <Field label="Name" htmlFor="place-rename" hint="Past entries keep their original name.">
            <input className="input" id="place-rename" name="name" defaultValue={renaming?.name} required maxLength={120} autoFocus />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn" onClick={() => setRenaming(null)}>
              Cancel
            </button>
            <button className="btn primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function AddPlace({ kind }: { kind: PlaceKind }) {
  const w = WORDS[kind];
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="place-add"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        const here = f.get("here") === "on" ? await locate() : null;
        const res = await savePlace({ kind, name: f.get("name"), lat: here?.lat ?? null, lng: here?.lng ?? null });
        setBusy(false);
        if (!res.ok) return toast("error" in res ? res.error : "Couldn't save.", true);
        form.reset();
        toast(f.get("here") === "on" && !here ? "Saved, but we couldn't get your location." : `${w.one[0].toUpperCase() + w.one.slice(1)} saved.`);
        router.refresh();
      }}
    >
      <input className="input" name="name" required maxLength={120} placeholder={kind === "fuel" ? "Add a station, e.g. Shell on Main St" : "Add a network, e.g. FLO"} />
      <label className="check-line compact">
        <input type="checkbox" name="here" /> I&apos;m here now
      </label>
      <button className="btn sm" disabled={busy}>
        {busy ? "Saving…" : "Add"}
      </button>
    </form>
  );
}
