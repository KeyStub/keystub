"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/* ---------------------------------- Toasts ---------------------------------- */

type Toast = { id: number; msg: string; err?: boolean };
const ToastCtx = createContext<(msg: string, err?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ------------------------------- Confirm dialog ------------------------------- */

type ConfirmOpts = { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean };
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((msg: string, err?: boolean) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && !document.cookie.includes(`tz=${tz}`)) document.cookie = `tz=${tz}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }, []);

  const [pending, setPending] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })),
    [],
  );
  const decide = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <Modal
          open={!!pending}
          title={pending?.title ?? ""}
          onClose={() => decide(false)}
          footer={
            <>
              <button className="btn" onClick={() => decide(false)}>
                Cancel
              </button>
              <button className={`btn ${pending?.danger ? "danger" : "primary"}`} onClick={() => decide(true)} autoFocus>
                {pending?.confirmLabel ?? "Confirm"}
              </button>
            </>
          }
        >
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{pending?.message}</div>
        </Modal>
        <div className="toast-host" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast${t.err ? " err" : ""}`}>
              {t.msg}
            </div>
          ))}
        </div>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

/* ----------------------------------- Modal ----------------------------------- */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
    >
      {open && (
        <>
          <div className="modal-head">
            <h3 id="modal-title">{title}</h3>
            <IconButton kind="x" onClick={onClose} />
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

/* ---------------------------------- Bits ---------------------------------- */

const ICONS = {
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </>
  ),
  x: (
    <>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </>
  ),
  flag: (
    <>
      <path d="M4 22V4" />
      <path d="M4 4h12l-2 4 2 4H4" />
    </>
  ),
};

export function IconButton({ kind, onClick, label }: { kind: keyof typeof ICONS; onClick: () => void; label?: string }) {
  const l = label ?? { edit: "Edit", trash: "Delete", x: "Close", flag: "Flag" }[kind];
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={l}
      title={l}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[kind]}
      </svg>
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function StatusChip({ status }: { status: "overdue" | "soon" | "upcoming" }) {
  const map = { overdue: ["critical", "Overdue"], soon: ["warning", "Due soon"], upcoming: ["neutral", "Upcoming"] } as const;
  const [cls, text] = map[status];
  return (
    <span className={`chip ${cls}`}>
      <span className="dot" />
      {text}
    </span>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value tabular">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

/** Opens a "new entry" form when the page is reached with ?add=1 (from the phone "+" button), then clears the flag. */
export function useOpenOnAdd(open: () => void) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const flag = params.get("add") === "1";
  useEffect(() => {
    if (!flag) return;
    open();
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flag]);
}
