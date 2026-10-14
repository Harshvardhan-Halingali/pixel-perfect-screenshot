import { lazy, Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STOPS, SEGMENTS, scrollTopFor } from "./journey";

const SpaceScene = lazy(() => import("./SpaceScene"));

function webglOk() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function OrbitExperience() {
  const progress = useRef(0);
  const pointer = useRef(new THREE.Vector2());
  const [p, setP] = useState(0);
  const [mode, setMode] = useState<"pending" | "3d" | "fallback">("pending");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMode(webglOk() ? "3d" : "fallback");
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const v = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
      progress.current = v;
      setP(v);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.current.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const go = (i: number) => window.scrollTo({ top: scrollTopFor(i), behavior: reduced ? "auto" : "smooth" });
  const pos = p * SEGMENTS;
  const active = Math.round(pos);

  return (
    <main className="relative">
      {/* Background universe */}
      <div className="fixed inset-0 fallback-stars" aria-hidden>
        {mode === "3d" && (
          <Suspense fallback={null}>
            <SpaceScene progress={progress} pointer={pointer} reduced={reduced} />
          </Suspense>
        )}
      </div>
      <div className="pointer-events-none fixed inset-0 lens-flare" aria-hidden />
      <div className="pointer-events-none fixed inset-0 vignette" aria-hidden />

      {/* Navigation */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <button onClick={() => go(0)} className="font-display text-sm font-light tracking-[0.5em] text-foreground" aria-label="Back to start">
          ORBIT
        </button>
        <nav className="hidden gap-1 md:flex" aria-label="Destinations">
          {STOPS.slice(1).map((s, idx) => (
            <button
              key={s.id}
              onClick={() => go(idx + 1)}
              className={`label-tech rounded-full px-4 py-2 transition-colors hover:text-primary ${active === idx + 1 ? "text-primary" : ""}`}
            >
              {s.nav}
            </button>
          ))}
        </nav>
        <span className="label-tech hidden sm:inline">Audio · Off</span>
      </header>

      {/* Progress rail */}
      <div className="fixed right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-3 md:right-8">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
        <div className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-primary transition-[height] duration-300" style={{ height: `${p * 100}%` }} />
        {STOPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => go(i)}
            aria-label={`Go to ${s.nav}`}
            className="relative grid h-7 w-7 place-items-center"
          >
            <span className={`block rounded-full transition-all duration-500 ${active === i ? "h-2.5 w-2.5 bg-primary shadow-[0_0_12px_var(--primary)]" : "h-1.5 w-1.5 bg-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <div className="label-tech fixed bottom-5 left-5 z-20 md:bottom-8 md:left-10">
        {String(Math.round(p * 100)).padStart(3, "0")} <span className="text-primary">/</span> 100
      </div>

      {/* Captions */}
      <div className="pointer-events-none fixed inset-0 z-10">
        {STOPS.map((s, i) => {
          const d = pos - i;
          const vis = Math.abs(d) < 0.32;
          const style = {
            opacity: vis ? 1 : 0,
            transform: `translateY(${vis ? 0 : d > 0 ? -40 : 40}px)`,
            filter: vis ? "blur(0)" : "blur(6px)",
          };
          if (i === 0)
            return (
              <div key={s.id} className="caption absolute inset-x-0 top-[16vh] flex flex-col items-center px-6 text-center" style={style}>
                <span className="label-tech mb-6">Mission 001 · Departure</span>
                <h1 className="title-cinematic pl-[0.42em] text-6xl sm:text-8xl md:text-9xl">ORBIT</h1>
                <p className="mt-6 font-display text-base font-light tracking-[0.3em] text-muted-foreground md:text-lg">Beyond the familiar.</p>
              </div>
            );
          if (i === SEGMENTS)
            return (
              <div key={s.id} className="caption absolute inset-x-0 bottom-[12vh] flex flex-col items-center px-6 text-center" style={style}>
                <span className="label-tech mb-4 text-primary">{s.label}</span>
                <h2 className="text-glow font-display text-4xl font-extralight tracking-tight md:text-6xl">{s.title}</h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">{s.body}</p>
                <button onClick={() => go(0)} className={`btn-orbit mt-8 ${vis ? "pointer-events-auto" : ""}`}>
                  Travel again <span aria-hidden>↺</span>
                </button>
              </div>
            );
          return (
            <div
              key={s.id}
              className={`caption absolute bottom-[14vh] max-w-sm px-6 md:bottom-auto md:top-1/2 md:max-w-md md:-translate-y-1/2 ${s.side === "right" ? "right-0 md:right-[8vw] text-right" : "left-0 md:left-[8vw]"}`}
              style={style}
            >
              <span className="label-tech text-primary">{s.label}</span>
              <h2 className="mt-4 font-display text-3xl font-extralight leading-tight tracking-tight md:text-5xl">{s.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">{s.body}</p>
            </div>
          );
        })}
      </div>

      {/* Scroll indicator */}
      <div className="caption pointer-events-none fixed bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3" style={{ opacity: p < 0.03 ? 1 : 0 }}>
        <div className="relative h-9 w-5 rounded-full border border-border">
          <span className="animate-scroll-dot absolute left-1/2 top-2 h-1.5 w-1 -translate-x-1/2 rounded-full bg-primary" />
        </div>
        <span className="label-tech">Scroll to travel</span>
      </div>

      {/* Scroll track */}
      <div aria-hidden>
        {STOPS.map((s) => (
          <section key={s.id} id={s.id} className="h-[130vh]" />
        ))}
      </div>
    </main>
  );
}
