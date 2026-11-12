export const keys = [
  "C",
  "D♭",
  "D",
  "E♭",
  "E",
  "F",
  "F♯",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
];
export const formulas = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  mMaj7: [0, 3, 7, 11],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  add9: [0, 4, 7, 14],
  "9": [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
} as const;
export type Quality = keyof typeof formulas;
export interface Spec {
  degree: number;
  accidental: number;
  quality: Quality;
}
export interface Note {
  midi: number;
  hand: "left" | "right";
}
export interface Slot {
  id: string;
  chord: Spec;
  frets: number[];
  notes: Note[];
  guitarBase: number[];
  pianoBase: Note[];
  guitarEdited: boolean;
  pianoEdited: boolean;
}
export interface Sheet {
  schemaVersion: 1;
  id: string;
  title: string;
  key: number;
  slots: Slot[];
  display: {
    labels: "notes" | "intervals" | "both";
    instruments: "both" | "guitar" | "piano";
  };
  createdAt: string;
  updatedAt: string;
}
export const tuning = [40, 45, 50, 55, 59, 64];
export const mod = (n: number) => ((n % 12) + 12) % 12;
export const root = (key: number, s: Spec) =>
  mod(key + [0, 2, 4, 5, 7, 9, 11][s.degree - 1] + s.accidental);
export function roman(s: Spec) {
  let r = ["I", "II", "III", "IV", "V", "VI", "VII"][s.degree - 1];
  if (
    (s.quality.startsWith("m") && !s.quality.startsWith("maj")) ||
    s.quality === "minor" ||
    s.quality.startsWith("dim")
  )
    r = r.toLowerCase();
  return (
    ["♭", "", "♯"][s.accidental + 1] +
    r +
    ((
      {
        major: "",
        minor: "",
        dim: "°",
        m7b5: "ø7",
        dim7: "°7",
        mMaj7: "Maj7",
        m7: "7",
        m9: "9",
        m6: "6",
      } as Partial<Record<Quality, string>>
    )[s.quality] ?? s.quality)
  );
}
export const chordName = (key: number, s: Spec) =>
  rootName(key, s) +
  (({ major: "", minor: "m" } as Partial<Record<Quality, string>>)[s.quality] ??
    s.quality);
const letters = ["C", "D", "E", "F", "G", "A", "B"],
  naturals = [0, 2, 4, 5, 7, 9, 11];
function spell(pc: number, letter: number) {
  let d = mod(pc - naturals[letter]);
  if (d > 6) d -= 12;
  return letters[letter] + (d < 0 ? "♭".repeat(-d) : "♯".repeat(d));
}
export function rootName(key: number, s: Spec) {
  const l = letters.indexOf(keys[key][0]);
  return spell(root(key, s), (l + s.degree - 1) % 7);
}
export function tone(key: number, s: Spec, midi: number) {
  const r = root(key, s),
    pc = mod(midi - r),
    formula: number[] = [...formulas[s.quality]];
  const interval = formula.find((n) => mod(n) === pc);
  let role = "",
    step = 0;
  if (interval !== undefined) {
    const map: Record<number, [string, number]> = {
      0: ["1", 0],
      2: ["2", 1],
      3: ["♭3", 2],
      4: ["3", 2],
      5: ["4", 3],
      6: ["♭5", 4],
      7: ["5", 4],
      8: ["♯5", 4],
      9: [s.quality === "dim7" ? "𝄫7" : "6", s.quality === "dim7" ? 6 : 5],
      10: ["♭7", 6],
      11: ["7", 6],
      14: ["9", 1],
    };
    [role, step] = map[interval];
  } else {
    [role, step] = (
      ["1", "♭9", "9", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"].map(
        (x, i) => [x, [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6][i]],
      ) as [string, number][]
    )[pc];
  }
  const name = spell(
    mod(midi),
    (letters.indexOf(rootName(key, s)[0]) + step) % 7,
  );
  const raw = mod(midi - naturals[letters.indexOf(name[0])]);
  const alter = raw > 6 ? raw - 12 : raw;
  const octave = Math.floor((midi - alter) / 12) - 1;
  return { name, full: name + octave, role, extra: interval === undefined };
}
export const roleZh: Record<string, string> = {
  "1": "根音",
  "♭3": "小三音",
  "3": "大三音",
  "5": "纯五音",
  "♭5": "降五音",
  "6": "六音",
  "♭7": "小七音",
  "7": "大七音",
  "9": "九音",
};
export const guitarMidi = (frets: number[]) =>
  frets.flatMap((f, i) => (f < 0 ? [] : [tuning[i] + f]));
export function analysis(key: number, s: Spec, midis: number[]) {
  const pcs = new Set(midis.map((n) => mod(n - root(key, s))));
  return {
    missing: formulas[s.quality]
      .filter((n) => !pcs.has(mod(n)))
      .map((n) => tone(key, s, 60 + root(key, s) + n).role),
    extra: [
      ...new Set(
        midis
          .filter((n) => tone(key, s, n).extra)
          .map((n) => {
            const t = tone(key, s, n);
            return `${t.name}（${t.role}）`;
          }),
      ),
    ],
    bass: midis.length ? tone(key, s, Math.min(...midis)).full : "—",
  };
}
// Original rule-generated candidates, never labeled as ergonomically reviewed.
export function guitarCandidates(r: number, q: Quality): number[][] {
  if (r === 2 && q === "m7")
    return [[-1, 5, 7, 5, 6, 5], ...generate(r, q)].slice(0, 3);
  return generate(r, q);
}
function generate(r: number, q: Quality) {
  const allowed = new Set(formulas[q].map((n) => mod(r + n))),
    out: number[][] = [];
  for (let start = 1; start <= 12; start++) {
    const f = tuning.map((t) => {
      for (let n = start; n < start + 4; n++)
        if (allowed.has(mod(t + n))) return n;
      return -1;
    });
    const pcs = new Set(guitarMidi(f).map(mod));
    if (
      f.filter((n) => n >= 0).length >= 4 &&
      pcs.has(r) &&
      pcs.size >= 3 &&
      !out.some((a) => a.join() === f.join())
    )
      out.push(f);
  }
  return out.slice(0, 3);
}
export function pianoCandidates(r: number, q: Quality): Note[][] {
  const f = [...formulas[q]];
  return [0, 1, 2].map((inv) => {
    const a = f
      .map((n, i) => 48 + r + n + (i < inv ? 12 : 0))
      .sort((a, b) => a - b);
    return a.map((midi, i) => ({ midi, hand: i === 0 ? "left" : "right" }));
  });
}
export function slot(key: number, chord: Spec): Slot {
  const r = root(key, chord),
    frets = guitarCandidates(r, chord.quality)[0] ?? [-1, -1, -1, -1, -1, -1],
    notes = pianoCandidates(r, chord.quality)[0];
  return {
    id: crypto.randomUUID(),
    chord,
    frets,
    notes,
    guitarBase: [...frets],
    pianoBase: structuredClone(notes),
    guitarEdited: false,
    pianoEdited: false,
  };
}
const c = (
  degree: number,
  quality: Quality = "major",
  accidental = 0,
): Spec => ({ degree, quality, accidental });
export const templates = [
  { name: "流行 · I–V–vi–IV", chords: [c(1), c(5), c(6, "minor"), c(4)] },
  { name: "流行 · vi–IV–I–V", chords: [c(6, "minor"), c(4), c(1), c(5)] },
  {
    name: "回转 · ii7–V7–Imaj7–vi7",
    chords: [c(2, "m7"), c(5, "7"), c(1, "maj7"), c(6, "m7")],
  },
  {
    name: "回转 · Imaj7–vi7–ii7–V7",
    chords: [c(1, "maj7"), c(6, "m7"), c(2, "m7"), c(5, "7")],
  },
  {
    name: "下行 · IVmaj7–iii7–vi7–ii7",
    chords: [c(4, "maj7"), c(3, "m7"), c(6, "m7"), c(2, "m7")],
  },
  {
    name: "线条 · vi–viMaj7–vi7–vi6",
    chords: [c(6, "minor"), c(6, "mMaj7"), c(6, "m7"), c(6, "m6")],
  },
  { name: "借用 · ♭VII–IV–I–I", chords: [c(7, "major", -1), c(4), c(1), c(1)] },
  {
    name: "小调色彩 · vi7–IVmaj7–ii7–V7",
    chords: [c(6, "m7"), c(4, "maj7"), c(2, "m7"), c(5, "7")],
  },
];
export function newSheet(index = 2, key = 0): Sheet {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: "我的和弦练习",
    key,
    slots: templates[index].chords.map((s) => slot(key, s)),
    display: { labels: "both", instruments: "both" },
    createdAt: now,
    updatedAt: now,
  };
}
export function transpose(
  sheet: Sheet,
  key: number,
  replace = false,
  octave = 0,
): Sheet {
  let d = mod(key - sheet.key);
  if (d > 6) d -= 12;
  const next = structuredClone(sheet);
  next.key = key;
  next.slots = next.slots.map((s) => {
    const f = s.frets.map((n) => (n < 0 ? -1 : n + d));
    if (
      f.some((n) => n < -1 || n > 24) ||
      s.frets.some((n, i) => n >= 0 && f[i] < 0)
    ) {
      if (!replace) throw Error("吉他无法直接移调，需要替换预置");
      s.frets = guitarCandidates(root(key, s.chord), s.chord.quality)[0] ?? [
        -1, -1, -1, -1, -1, -1,
      ];
      s.guitarEdited = false;
    } else s.frets = f;
    s.notes = s.notes.map((n) => ({ ...n, midi: n.midi + d + octave * 12 }));
    if (s.notes.some((n) => n.midi < 36 || n.midi > 84))
      throw Error("钢琴超出 C2–C6，请调整八度或取消");
    s.guitarBase = guitarCandidates(root(key, s.chord), s.chord.quality)[0];
    s.pianoBase = pianoCandidates(root(key, s.chord), s.chord.quality)[0];
    return s;
  });
  return next;
}
