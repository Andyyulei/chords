import { useEffect, useRef, useState } from "react";
import {
  keys,
  formulas,
  newSheet,
  templates,
  roman,
  chordName,
  root,
  slot as makeSlot,
  guitarCandidates,
  pianoCandidates,
  tone,
  transpose,
  type Sheet,
  type Slot,
  type Spec,
  type Quality,
} from "./domain/music";
import {
  loadDraft,
  loadLibrary,
  validate,
  download,
  DRAFT,
  LIBRARY,
} from "./domain/storage";
import { Guitar, Piano } from "./components/Diagrams";
function initial() {
  try {
    return { sheet: loadDraft() ?? newSheet(), error: "" };
  } catch (e) {
    return { sheet: newSheet(), error: `草稿恢复失败：${e}` };
  }
}
export default function App() {
  const [init] = useState(initial),
    [sheet, setSheet] = useState(init.sheet),
    [error, setError] = useState(init.error),
    [status, setStatus] = useState("草稿"),
    [view, setView] = useState("editor"),
    [library, setLibrary] = useState<Sheet[]>([]),
    [edit, setEdit] = useState<Record<string, boolean>>({}),
    [history, setHistory] = useState<Sheet[]>([]),
    [future, setFuture] = useState<Sheet[]>([]),
    [keyChange, setKeyChange] = useState<number | null>(null),
    [replace, setReplace] = useState(false),
    [octave, setOctave] = useState(0),
    [chordChange, setChordChange] = useState<{ id: string; spec: Spec } | null>(
      null,
    );
  const upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT, JSON.stringify(sheet));
      setStatus("草稿已自动保存");
    } catch (e) {
      setStatus("未保存");
      setError(`本地存储失败，请导出 JSON 备份。${e}`);
    }
  }, [sheet]);
  function commit(next: Sheet) {
    setHistory((h) => [...h.slice(-49), structuredClone(sheet)]);
    setFuture([]);
    setSheet({ ...next, updatedAt: new Date().toISOString() });
    setError("");
  }
  function changeSlot(id: string, fn: (s: Slot) => Slot) {
    commit({
      ...sheet,
      slots: sheet.slots.map((s) => (s.id === id ? fn(structuredClone(s)) : s)),
    });
  }
  function undo() {
    if (!history.length) return;
    setFuture((f) => [sheet, ...f]);
    setSheet(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  }
  function redo() {
    if (!future.length) return;
    setHistory((h) => [...h, sheet]);
    setSheet(future[0]);
    setFuture(future.slice(1));
  }
  function save(copy = false) {
    try {
      const saved = { ...sheet, id: copy ? crypto.randomUUID() : sheet.id };
      const all = loadLibrary(),
        next = [saved, ...all.filter((s) => s.id !== saved.id)];
      localStorage.setItem(LIBRARY, JSON.stringify(next));
      if (copy) commit(saved);
      setLibrary(next);
      setStatus(copy ? "副本已保存" : "材料已保存");
    } catch (e) {
      setError(`保存失败，请导出 JSON。${e}`);
      setStatus("未保存");
    }
  }
  function openLibrary() {
    try {
      setLibrary(loadLibrary());
      setView("library");
    } catch (e) {
      setError(String(e));
    }
  }
  function changeChord(id: string, spec: Spec) {
    const s = sheet.slots.find((s) => s.id === id)!;
    if (s.guitarEdited || s.pianoEdited) setChordChange({ id, spec });
    else applyChord(id, spec, false);
  }
  function applyChord(id: string, spec: Spec, keep: boolean) {
    changeSlot(id, (s) =>
      keep ? { ...s, chord: spec } : { ...makeSlot(sheet.key, spec), id: s.id },
    );
    setChordChange(null);
  }
  function shortcut(mode: string) {
    let skipped: number[] = [];
    const tri: Quality[] = [
        "major",
        "minor",
        "minor",
        "major",
        "major",
        "minor",
        "dim",
      ],
      seven: Quality[] = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];
    const next = structuredClone(sheet);
    next.slots = next.slots.map((s, i) => {
      let q: Quality | undefined =
        mode === "tri"
          ? tri[s.chord.degree - 1]
          : mode === "seven"
            ? seven[s.chord.degree - 1]
            : (
                {
                  major: "maj9",
                  minor: "m9",
                  "7": "9",
                  maj7: "maj9",
                  m7: "m9",
                } as Partial<Record<Quality, Quality>>
              )[s.chord.quality];
      if (s.guitarEdited || s.pianoEdited || s.chord.accidental !== 0 || !q) {
        skipped.push(i + 1);
        return s;
      }
      return { ...makeSlot(sheet.key, { ...s.chord, quality: q }), id: s.id };
    });
    commit(next);
    if (skipped.length)
      setError(
        `快捷方案保留第 ${skipped.join("、")} 列：自定义、变化级数或无明确映射。`,
      );
  }
  let preview: Sheet | null = null,
    previewError = "";
  if (keyChange !== null)
    try {
      preview = transpose(sheet, keyChange, replace, octave);
    } catch (e) {
      previewError = String(e);
    }
  return (
    <>
      <header className="screen-only">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("editor");
          }}
        >
          <span className="logo">
            V<span>♮</span>
          </span>
          <span>
            Voicing Studio<small>和弦练习工坊</small>
          </span>
        </a>
        <nav>
          <button
            className={view === "editor" ? "active" : ""}
            onClick={() => setView("editor")}
          >
            练习编辑器
          </button>
          <button
            className={view === "library" ? "active" : ""}
            onClick={openLibrary}
          >
            我的材料
          </button>
        </nav>
        <span className="local-badge">● 仅存储在此浏览器</span>
      </header>
      <main>
        <section className="intro screen-only">
          <div>
            <p className="eyebrow">YOUR HARMONY, YOUR VOICING</p>
            <h1>
              {view === "library" ? "收藏每一种和声可能" : "让和弦，落在指尖。"}
            </h1>
            <p>
              从一个进行出发，探索吉他与钢琴的声音排列，制作属于你的练习页。
            </p>
          </div>
          <div className="intro-mark">
            ii <span>—</span> V <span>—</span> I
          </div>
        </section>
        {error && (
          <div role="alert" className="alert screen-only">
            {error}
            <button onClick={() => setError("")}>关闭</button>
          </div>
        )}
        {view === "library" ? (
          <section className="library screen-only">
            <button
              onClick={() => {
                commit(newSheet());
                setView("editor");
              }}
            >
              ＋ 新建材料
            </button>
            {library.length === 0 && (
              <p>还没有已命名材料。在编辑器中点击“保存材料”。</p>
            )}
            {library.map((s) => (
              <article key={s.id}>
                <h2>{s.title}</h2>
                <p>
                  {keys[s.key]} major ·{" "}
                  {s.slots.map((x) => chordName(s.key, x.chord)).join(" — ")}
                </p>
                <small>{new Date(s.updatedAt).toLocaleString("zh-CN")}</small>
                <div>
                  <button
                    onClick={() => {
                      commit(structuredClone(s));
                      setView("editor");
                    }}
                  >
                    打开
                  </button>
                  <button onClick={() => download(s)}>导出</button>
                  <button
                    onClick={() => {
                      if (!confirm(`删除“${s.title}”？此操作不可撤销。`))
                        return;
                      try {
                        const next = library.filter((x) => x.id !== s.id);
                        localStorage.setItem(LIBRARY, JSON.stringify(next));
                        setLibrary(next);
                      } catch (e) {
                        setError(`删除失败：${e}`);
                      }
                    }}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <>
            <section className="sheet-toolbar screen-only">
              <div className="title-row">
                <div>
                  <label className="field-label" htmlFor="sheet-title">
                    练习材料
                  </label>
                  <input
                    id="sheet-title"
                    className="title-input"
                    maxLength={500}
                    value={sheet.title}
                    onChange={(e) =>
                      commit({ ...sheet, title: e.target.value })
                    }
                  />
                  <small className="save-status" role="status">
                    {status}
                  </small>
                </div>
                <div className="actions">
                  <button onClick={() => save()}>保存材料</button>
                  <button onClick={() => save(true)}>另存副本</button>
                  <button className="primary" onClick={() => window.print()}>
                    打印／另存为 PDF ↗
                  </button>
                </div>
              </div>
              <div className="settings">
                <label>
                  调性 KEY
                  <select
                    aria-label="调性"
                    value={sheet.key}
                    onChange={(e) => {
                      setKeyChange(+e.target.value);
                      setReplace(false);
                      setOctave(0);
                    }}
                  >
                    {keys.map((k, i) => (
                      <option value={i} key={k}>
                        {k} major
                      </option>
                    ))}
                  </select>
                </label>
                <label className="template-select">
                  进行模板
                  <select
                    aria-label="进行模板"
                    value={templates.findIndex(
                      (t) =>
                        JSON.stringify(t.chords) ===
                        JSON.stringify(sheet.slots.map((s) => s.chord)),
                    )}
                    onChange={(e) => {
                      try {
                        localStorage.setItem(
                          "voicing-studio:template-backup:v1",
                          JSON.stringify(sheet),
                        );
                        commit({
                          ...sheet,
                          slots: templates[+e.target.value].chords.map((s) =>
                            makeSlot(sheet.key, s),
                          ),
                        });
                      } catch (err) {
                        setError(
                          "无法保存当前草稿，已取消切换。请先导出 JSON。",
                        );
                      }
                    }}
                  >
                    <option value="-1" disabled>
                      自定义进行
                    </option>
                    {templates.map((t, i) => (
                      <option value={i} key={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  标注
                  <select
                    aria-label="标注模式"
                    value={sheet.display.labels}
                    onChange={(e) =>
                      commit({
                        ...sheet,
                        display: {
                          ...sheet.display,
                          labels: e.target.value as Sheet["display"]["labels"],
                        },
                      })
                    }
                  >
                    <option value="both">音名 + 音程</option>
                    <option value="notes">音名</option>
                    <option value="intervals">音程</option>
                  </select>
                </label>
                <label>
                  显示／打印
                  <select
                    aria-label="显示乐器"
                    value={sheet.display.instruments}
                    onChange={(e) =>
                      commit({
                        ...sheet,
                        display: {
                          ...sheet.display,
                          instruments: e.target
                            .value as Sheet["display"]["instruments"],
                        },
                      })
                    }
                  >
                    <option value="both">吉他 + 钢琴</option>
                    <option value="guitar">仅吉他</option>
                    <option value="piano">仅钢琴</option>
                  </select>
                </label>
              </div>
              <div className="utility">
                <div>
                  <button disabled={!history.length} onClick={undo}>
                    ↶ 撤销
                  </button>
                  <button disabled={!future.length} onClick={redo}>
                    ↷ 重做
                  </button>
                  <span className="divider" />
                  <button onClick={() => shortcut("tri")}>三和弦</button>
                  <button onClick={() => shortcut("seven")}>七和弦</button>
                  <button onClick={() => shortcut("nine")}>九和弦</button>
                </div>
                <div>
                  <button
                    onClick={() => {
                      try {
                        const data = localStorage.getItem(
                          "voicing-studio:template-backup:v1",
                        );
                        if (!data) {
                          setError("还没有模板切换前的备份");
                          return;
                        }
                        commit(validate(JSON.parse(data)));
                      } catch (err) {
                        setError(String(err));
                      }
                    }}
                  >
                    恢复切换前草稿
                  </button>
                  <button onClick={() => download(sheet)}>导出 JSON</button>
                  <button onClick={() => upload.current?.click()}>
                    导入 JSON
                  </button>
                  <input
                    ref={upload}
                    hidden
                    type="file"
                    accept=".json,application/json"
                    onChange={async (e) => {
                      try {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 1000000) throw Error("文件过大");
                        commit(validate(JSON.parse(await f.text())));
                      } catch (err) {
                        setError(`导入失败：${err}`);
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </section>
            <div className="print-heading">
              <h1>{sheet.title}</h1>
              <p>
                {keys[sheet.key]} major ·{" "}
                {sheet.slots.map((s) => roman(s.chord)).join(" — ")} · L 左手 /
                R 右手 · * 额外音
              </p>
            </div>
            <div className="section-label screen-only">
              <span>
                和弦工作区{" "}
                <small>{sheet.slots.length} 个位置 · 乐器独立编辑</small>
              </span>
              <button
                disabled={sheet.slots.length >= 8}
                onClick={() =>
                  commit({
                    ...sheet,
                    slots: [
                      ...sheet.slots,
                      makeSlot(sheet.key, {
                        degree: 1,
                        accidental: 0,
                        quality: "major",
                      }),
                    ],
                  })
                }
              >
                ＋ 添加和弦
              </button>
            </div>
            <div
              className={
                sheet.slots.some((s) => s.notes.length > 12)
                  ? "pages dense-print"
                  : "pages"
              }
            >
              {Array.from(
                { length: Math.ceil(sheet.slots.length / 4) },
                (_, page) => (
                  <section className="chord-grid" key={page}>
                    {sheet.slots
                      .slice(page * 4, page * 4 + 4)
                      .map((s, index) => {
                        const r = root(sheet.key, s.chord),
                          g = guitarCandidates(r, s.chord.quality),
                          p = pianoCandidates(r, s.chord.quality);
                        return (
                          <article className="chord-card" key={s.id}>
                            <div className="card-heading">
                              <div className="card-index">
                                {String(page * 4 + index + 1).padStart(2, "0")}{" "}
                                <span>{roman(s.chord)}</span>
                              </div>
                              <button
                                className="screen-only delete"
                                disabled={sheet.slots.length === 1}
                                aria-label={`删除第${page * 4 + index + 1}列`}
                                onClick={() =>
                                  commit({
                                    ...sheet,
                                    slots: sheet.slots.filter(
                                      (x) => x.id !== s.id,
                                    ),
                                  })
                                }
                              >
                                ×
                              </button>
                              <h2>{chordName(sheet.key, s.chord)}</h2>
                              <p className="theory">
                                {formulas[s.chord.quality]
                                  .map(
                                    (n) =>
                                      tone(sheet.key, s.chord, 60 + r + n).name,
                                  )
                                  .join(" · ")}
                              </p>
                              <div className="spec-controls screen-only">
                                <select
                                  aria-label={`第${index + page * 4 + 1}列变化音`}
                                  value={s.chord.accidental}
                                  onChange={(e) =>
                                    changeChord(s.id, {
                                      ...s.chord,
                                      accidental: +e.target.value,
                                    })
                                  }
                                >
                                  <option value="-1">♭</option>
                                  <option value="0">♮</option>
                                  <option value="1">♯</option>
                                </select>
                                <select
                                  aria-label={`第${index + page * 4 + 1}列级数`}
                                  value={s.chord.degree}
                                  onChange={(e) =>
                                    changeChord(s.id, {
                                      ...s.chord,
                                      degree: +e.target.value,
                                    })
                                  }
                                >
                                  {[
                                    "I",
                                    "II",
                                    "III",
                                    "IV",
                                    "V",
                                    "VI",
                                    "VII",
                                  ].map((v, i) => (
                                    <option key={v} value={i + 1}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  aria-label={`第${index + page * 4 + 1}列性质`}
                                  value={s.chord.quality}
                                  onChange={(e) =>
                                    changeChord(s.id, {
                                      ...s.chord,
                                      quality: e.target.value as Quality,
                                    })
                                  }
                                >
                                  {Object.keys(formulas).map((q) => (
                                    <option key={q}>{q}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {sheet.display.instruments !== "piano" && (
                              <section className="instrument guitar">
                                <div className="instrument-title">
                                  <h3>
                                    吉他 <small>GUITAR</small>
                                  </h3>
                                  <button
                                    className="screen-only"
                                    aria-pressed={!!edit[s.id + "g"]}
                                    onClick={() =>
                                      setEdit({
                                        ...edit,
                                        [s.id + "g"]: !edit[s.id + "g"],
                                      })
                                    }
                                  >
                                    {edit[s.id + "g"] ? "完成编辑" : "编辑指板"}
                                  </button>
                                </div>
                                <div className="candidate screen-only">
                                  <select
                                    aria-label={`第${page * 4 + index + 1}列吉他候选`}
                                    value={g.findIndex(
                                      (f) => f.join() === s.guitarBase.join(),
                                    )}
                                    onChange={(e) => {
                                      if (
                                        s.guitarEdited &&
                                        !confirm(
                                          "替换自定义吉他弹法？可用撤销恢复。",
                                        )
                                      )
                                        return;
                                      const f = g[+e.target.value];
                                      changeSlot(s.id, (x) => ({
                                        ...x,
                                        frets: [...f],
                                        guitarBase: [...f],
                                        guitarEdited: false,
                                      }));
                                    }}
                                  >
                                    {g.findIndex(
                                      (f) => f.join() === s.guitarBase.join(),
                                    ) < 0 && (
                                      <option value="-1">
                                        保留的自定义来源
                                      </option>
                                    )}
                                    {g.map((f, i) => (
                                      <option key={i} value={i}>
                                        规则候选 {i + 1} ·{" "}
                                        {Math.min(...f.filter((n) => n > 0))} 品
                                      </option>
                                    ))}
                                    {!g.length && (
                                      <option value="-1">
                                        暂无预置，可自行编辑
                                      </option>
                                    )}
                                  </select>
                                  <button
                                    onClick={() =>
                                      changeSlot(s.id, (x) => ({
                                        ...x,
                                        frets: [...x.guitarBase],
                                        guitarEdited: false,
                                      }))
                                    }
                                  >
                                    重置
                                  </button>
                                </div>
                                <Guitar
                                  sheet={sheet}
                                  slot={s}
                                  editing={!!edit[s.id + "g"]}
                                  onChange={(frets) =>
                                    changeSlot(s.id, (x) => ({
                                      ...x,
                                      frets,
                                      guitarEdited: true,
                                    }))
                                  }
                                />
                                {s.guitarEdited && (
                                  <small className="edited">● 自定义弹法</small>
                                )}
                              </section>
                            )}
                            {sheet.display.instruments !== "guitar" && (
                              <section className="instrument piano">
                                <div className="instrument-title">
                                  <h3>
                                    钢琴 <small>PIANO</small>
                                  </h3>
                                  <button
                                    className="screen-only"
                                    aria-pressed={!!edit[s.id + "p"]}
                                    onClick={() =>
                                      setEdit({
                                        ...edit,
                                        [s.id + "p"]: !edit[s.id + "p"],
                                      })
                                    }
                                  >
                                    {edit[s.id + "p"] ? "完成编辑" : "编辑琴键"}
                                  </button>
                                </div>
                                <div className="candidate screen-only">
                                  <select
                                    aria-label={`第${page * 4 + index + 1}列钢琴候选`}
                                    value={p.findIndex(
                                      (n) =>
                                        JSON.stringify(n) ===
                                        JSON.stringify(s.pianoBase),
                                    )}
                                    onChange={(e) => {
                                      if (
                                        s.pianoEdited &&
                                        !confirm(
                                          "替换自定义钢琴配音？可用撤销恢复。",
                                        )
                                      )
                                        return;
                                      const n = p[+e.target.value];
                                      changeSlot(s.id, (x) => ({
                                        ...x,
                                        notes: structuredClone(n),
                                        pianoBase: structuredClone(n),
                                        pianoEdited: false,
                                      }));
                                    }}
                                  >
                                    {p.findIndex(
                                      (n) =>
                                        JSON.stringify(n) ===
                                        JSON.stringify(s.pianoBase),
                                    ) < 0 && (
                                      <option value="-1">
                                        保留的自定义来源
                                      </option>
                                    )}
                                    {p.map((_, i) => (
                                      <option key={i} value={i}>
                                        {
                                          ["紧密排列", "第一转位", "第二转位"][
                                            i
                                          ]
                                        }
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() =>
                                      changeSlot(s.id, (x) => ({
                                        ...x,
                                        notes: structuredClone(x.pianoBase),
                                        pianoEdited: false,
                                      }))
                                    }
                                  >
                                    重置
                                  </button>
                                </div>
                                <Piano
                                  sheet={sheet}
                                  slot={s}
                                  editing={!!edit[s.id + "p"]}
                                  onChange={(notes) =>
                                    changeSlot(s.id, (x) => ({
                                      ...x,
                                      notes,
                                      pianoEdited: true,
                                    }))
                                  }
                                />
                                {s.pianoEdited && (
                                  <small className="edited">● 自定义配音</small>
                                )}
                              </section>
                            )}
                          </article>
                        );
                      })}
                  </section>
                ),
              )}
            </div>
            <aside className="help screen-only">
              <b>给声音留一点空间。</b>
              <p>
                级数统一以大调音阶为坐标，性质独立指定。省略音与额外音只是说明，不改变和弦意图。吉他候选由规则生成，未经过人工可弹性筛选；请结合手型选择。L
                / R 表示钢琴左右手。
              </p>
            </aside>
          </>
        )}
      </main>
      <footer className="screen-only">
        <span>VOICING STUDIO · 为每一种和声，找到自己的排列。</span>
        <span>本地优先 / 无账号 / 无数据上传</span>
      </footer>
      {keyChange !== null && (
        <div className="modal-backdrop screen-only">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="移调预览"
            className="modal"
          >
            <h2>
              移调预览 · {keys[sheet.key]} → {keys[keyChange]}
            </h2>
            <p>
              所有发声音按最短半音距离移动，空弦也会移动。确认后整体应用，可撤销。
            </p>
            <p>
              {sheet.slots
                .map((s) => chordName(keyChange, s.chord))
                .join(" — ")}
            </p>
            <p>
              需要替换的吉他位置：
              {sheet.slots
                .map((s, i) => {
                  let d = (keyChange - sheet.key + 12) % 12;
                  if (d > 6) d -= 12;
                  return s.frets.some(
                    (f) => f >= 0 && (f + d < 0 || f + d > 24),
                  )
                    ? i + 1
                    : null;
                })
                .filter(Boolean)
                .join("、") || "无"}
            </p>
            <label>
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />{" "}
              无法平移的吉他换为新预置（将失去该位置原自定义）
            </label>
            <label>
              钢琴八度修正
              <select
                value={octave}
                onChange={(e) => setOctave(+e.target.value)}
              >
                <option value="0">不修正</option>
                <option value="1">升一个八度</option>
                <option value="-1">降一个八度</option>
              </select>
            </label>
            {previewError && <p role="alert">{previewError}</p>}
            <div className="actions">
              <button onClick={() => setKeyChange(null)}>取消</button>
              <button
                className="primary"
                disabled={!preview}
                onClick={() => {
                  if (preview) commit(preview);
                  setKeyChange(null);
                }}
              >
                确认移调
              </button>
            </div>
          </section>
        </div>
      )}
      {chordChange && (
        <div className="modal-backdrop screen-only">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="保留自定义弹法"
            className="modal"
          >
            <h2>这里有你编辑过的声音</h2>
            <p>
              更改和弦定义时，选择如何处理当前列的实际弹法。其他列保持不变。
            </p>
            <button
              onClick={() => applyChord(chordChange.id, chordChange.spec, true)}
            >
              保留实际弹法并重新标注
            </button>
            <button
              onClick={() =>
                applyChord(chordChange.id, chordChange.spec, false)
              }
            >
              替换为新预置
            </button>
            <button onClick={() => setChordChange(null)}>取消</button>
          </section>
        </div>
      )}
    </>
  );
}
