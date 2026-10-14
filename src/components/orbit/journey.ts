export type Stop = {
  id: string;
  nav: string;
  label: string;
  title: string;
  body: string;
  side: "left" | "right" | "center";
};

export const STOPS: Stop[] = [
  { id: "launch", nav: "Launch", label: "00 — Departure", title: "ORBIT", body: "Beyond the familiar.", side: "center" },
  { id: "earth", nav: "Earth", label: "01 — Earth · R 6,371 km", title: "The pale blue origin", body: "Every journey outward begins with one last look at home — a thin halo of air holding everything we know.", side: "right" },
  { id: "moon", nav: "Moon", label: "02 — Luna · 384,400 km", title: "A silent companion", body: "Scarred by four billion years of impacts, the Moon keeps its oldest secrets in perfect stillness.", side: "left" },
  { id: "belt", nav: "Belt", label: "03 — Asteroid field · 2.7 AU", title: "Through the debris", body: "Fragments of a planet that never formed, tumbling in slow procession through the dark.", side: "left" },
  { id: "saturn", nav: "Saturn", label: "04 — Saturn · 9.5 AU", title: "The ringed giant", body: "Ice and rock, a quarter-million kilometres wide and barely ten metres thick.", side: "left" },
  { id: "galaxy", nav: "Galaxy", label: "05 — Deep field · 2.5 Mly", title: "Where light grows old", body: "A hundred billion suns, seen as they were before our species existed.", side: "center" },
];

export const SEGMENTS = STOPS.length - 1;

/** Scroll position (px) for a given stop index. */
export function scrollTopFor(index: number) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return (index / SEGMENTS) * max;
}
