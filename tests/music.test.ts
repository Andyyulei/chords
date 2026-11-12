import { describe, it, expect } from "vitest";
import {
  root,
  tone,
  guitarMidi,
  analysis,
  templates,
  chordName,
  guitarCandidates,
  pianoCandidates,
  formulas,
  newSheet,
  transpose,
} from "../src/domain/music";
describe("music model", () => {
  it("resolves the default progression and key", () => {
    expect(templates[2].chords.map((s) => chordName(0, s))).toEqual([
      "Dm7",
      "G7",
      "Cmaj7",
      "Am7",
    ]);
    expect(templates[2].chords.map((s) => chordName(2, s))).toEqual([
      "Em7",
      "A7",
      "Dmaj7",
      "Bm7",
    ]);
  });
  it("keeps string order and duplicates in actual notes", () => {
    const s = templates[2].chords[0];
    expect(
      guitarMidi([-1, 5, 7, 5, 6, 5]).map((n) => tone(0, s, n).full),
    ).toEqual(["D3", "A3", "C4", "F4", "A4"]);
    expect(
      analysis(0, s, guitarMidi([-1, 5, -1, 5, 6, 5])).missing,
    ).not.toContain("5");
    expect(analysis(0, s, guitarMidi([-1, 5, -1, 5, 6, -1])).missing).toContain(
      "5",
    );
  });
  it("spells chord tones with their intended intervals", () => {
    const s = { degree: 1, accidental: 0, quality: "7" as const };
    expect(tone(0, s, 70).name).toBe("B♭");
    expect(tone(0, { ...s, quality: "maj7" }, 71).name).toBe("B");
    expect(tone(0, { ...s, quality: "dim7" }, 69).name).toBe("B♭♭");
    expect(tone(0, { ...s, quality: "add9" }, 62).role).toBe("9");
    expect(tone(0, { ...s, quality: "sus2" }, 62).role).toBe("2");
    expect(tone(0, { ...s, quality: "maj7" }, 62)).toMatchObject({
      role: "9",
      extra: true,
    });
  });
  it("validates all generated candidates for pitch and range", () => {
    for (let r = 0; r < 12; r++)
      for (const q of Object.keys(formulas) as (keyof typeof formulas)[]) {
        const g = guitarCandidates(r, q);
        expect(g.length).toBeGreaterThanOrEqual(3);
        expect(new Set(g.map((f) => f.join())).size).toBe(g.length);
        for (const f of g) {
          expect(f).toHaveLength(6);
          expect(
            f.every((n) => Number.isInteger(n) && n >= -1 && n <= 24),
          ).toBe(true);
          expect(
            guitarMidi(f).every((n) =>
              formulas[q].some((i) => (r + i) % 12 === n % 12),
            ),
          ).toBe(true);
        }
        for (const p of pianoCandidates(r, q))
          expect(p.every((n) => n.midi >= 36 && n.midi <= 84)).toBe(true);
      }
  });
  it("transposes atomically and moves open strings", () => {
    const s = newSheet();
    s.slots[0].frets = [0, 0, 0, 0, 0, 0];
    const before = JSON.stringify(s);
    expect(() => transpose(s, 11)).toThrow();
    expect(JSON.stringify(s)).toBe(before);
    expect(transpose(s, 2).slots[0].frets).toEqual([2, 2, 2, 2, 2, 2]);
    expect(root(0, { degree: 7, accidental: -1, quality: "major" })).toBe(10);
  });
});
