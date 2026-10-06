"use client";

import { useEffect, useRef, useState } from "react";

/**
 * An odometer-style counter. Digits sit at 0 until the counter scrolls into view, then roll up
 * to the value, like the numbers on an old mechanical odometer. Shows the final value immediately
 * for reduced-motion users (and before JS loads, via the noscript-safe initial state below).
 */
export function Odometer({ value, prefix = "$" }: { value: number; prefix?: string }) {
  const digits = String(value).split("").map(Number);
  const ref = useRef<HTMLDivElement>(null);
  const [rolled, setRolled] = useState(true); // render final value first (server + no-JS)

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only rewind if the counter isn't already on screen when the page loads.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;
    setRolled(false);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setRolled(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Commas every 3 digits from the right.
  const cells: ({ d: number; i: number } | ",")[] = [];
  digits.forEach((d, i) => {
    const fromRight = digits.length - i;
    if (i > 0 && fromRight % 3 === 0) cells.push(",");
    cells.push({ d, i });
  });

  return (
    <div className="odo" ref={ref} aria-label={`${prefix}${value.toLocaleString("en-CA")}`} role="img">
      <span className="odo-cell sym" aria-hidden="true">
        {prefix}
      </span>
      {cells.map((c, k) =>
        c === "," ? (
          <span key={`c${k}`} className="odo-cell sym" aria-hidden="true" style={{ fontSize: "0.7em", alignSelf: "end" }}>
            ,
          </span>
        ) : (
          <span key={k} className={`odo-cell${c.i === digits.length - 1 ? " last" : ""}`} aria-hidden="true">
            <span
              className="odo-strip"
              style={{
                // Each digit rolls through one full turn plus its value; later digits spin longer.
                transform: rolled ? `translateY(calc(-1 * (10 + ${c.d}) * 100% / 20))` : "translateY(0)",
                transitionDelay: `${c.i * 0.12}s`,
              }}
            >
              {Array.from({ length: 20 }, (_, n) => (
                <span key={n}>{n % 10}</span>
              ))}
            </span>
          </span>
        ),
      )}
    </div>
  );
}
