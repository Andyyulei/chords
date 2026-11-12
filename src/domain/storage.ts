import { formulas, type Sheet } from "./music";
const int = (x: unknown, a: number, b: number) =>
  Number.isInteger(x) && Number(x) >= a && Number(x) <= b;
export function validate(input: unknown): Sheet {
  const s = input as Sheet;
  if (
    !s ||
    s.schemaVersion !== 1 ||
    typeof s.id !== "string" ||
    !s.id ||
    typeof s.title !== "string" ||
    s.title.length > 500 ||
    !int(s.key, 0, 11) ||
    !Array.isArray(s.slots) ||
    s.slots.length < 1 ||
    s.slots.length > 8 ||
    !s.display ||
    !["notes", "intervals", "both"].includes(s.display.labels) ||
    !["both", "guitar", "piano"].includes(s.display.instruments) ||
    typeof s.createdAt !== "string" ||
    typeof s.updatedAt !== "string"
  )
    throw Error("材料格式无效：需要 schemaVersion 1、有效调性与 1–8 个和弦");
  const ids = new Set();
  for (const x of s.slots) {
    if (
      !x ||
      typeof x.id !== "string" ||
      !x.id ||
      ids.has(x.id) ||
      !x.chord ||
      !int(x.chord.degree, 1, 7) ||
      !int(x.chord.accidental, -1, 1) ||
      !Object.hasOwn(formulas, x.chord.quality) ||
      typeof x.guitarEdited !== "boolean" ||
      typeof x.pianoEdited !== "boolean"
    )
      throw Error("和弦定义或位置 ID 无效");
    ids.add(x.id);
    for (const f of [x.frets, x.guitarBase])
      if (
        !Array.isArray(f) ||
        f.length !== 6 ||
        !f.every((n) => int(n, -1, 24))
      )
        throw Error("吉他必须包含六根弦，品位范围 -1–24");
    for (const notes of [x.notes, x.pianoBase])
      if (
        !Array.isArray(notes) ||
        notes.length > 49 ||
        !notes.every(
          (n) => n && int(n.midi, 36, 84) && ["left", "right"].includes(n.hand),
        ) ||
        new Set(notes.map((n) => n.midi)).size !== notes.length
      )
        throw Error("钢琴 MIDI 必须在 36–84，且不能重复");
  }
  return structuredClone(s);
}
export const DRAFT = "voicing-studio:draft:v1",
  LIBRARY = "voicing-studio:library:v1";
export function loadDraft() {
  const data = localStorage.getItem(DRAFT);
  return data ? validate(JSON.parse(data)) : null;
}
export function loadLibrary(): Sheet[] {
  const data = localStorage.getItem(LIBRARY);
  if (!data) return [];
  const list = JSON.parse(data);
  if (!Array.isArray(list)) throw Error("材料库损坏，请先导出草稿");
  return list.map(validate);
}
export function download(sheet: Sheet) {
  const blob = new Blob([JSON.stringify(sheet, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = (sheet.title || "练习材料") + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
