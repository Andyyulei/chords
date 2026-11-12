import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://127.0.0.1:5173");
const read = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("voicing-studio:draft:v1")),
  );
// Every template loads actual diagrams, including minor-major seventh.
for (let i = 0; i < 8; i++) {
  await page.getByLabel("进行模板").selectOption(String(i));
  assert.equal((await read()).slots.length, 4);
  assert.equal(await page.locator(".guitar svg").count(), 4);
  assert.equal(await page.locator(".piano .keyboard").count(), 4);
}
await page.getByLabel("进行模板").selectOption("5");
assert.equal(await page.locator(".chord-card h2").nth(1).innerText(), "AmMaj7");
await page.getByLabel("进行模板").selectOption("2");
await page.getByLabel("调性", { exact: true }).selectOption("2");
await page.getByRole("button", { name: "确认移调" }).click();
assert.deepEqual(await page.locator(".chord-card h2").allTextContents(), [
  "Em7",
  "A7",
  "Dmaj7",
  "Bm7",
]);
const before = await read();
await page.getByLabel("第3列吉他候选").selectOption("1");
const after = await read();
assert.deepEqual(before.slots[2].notes, after.slots[2].notes);
assert.deepEqual(before.slots[0], after.slots[0]);
assert.notDeepEqual(before.slots[2].frets, after.slots[2].frets);
// Import/export through the real UI; preserve a zero-note custom piano.
let data = await read();
data.slots[0].notes = [];
data.slots[0].pianoEdited = true;
data.title = "导入验证 <script>文本</script>";
await page
  .locator("input[type=file]")
  .setInputFiles({
    name: "sheet.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
assert.equal(await page.locator("#sheet-title").inputValue(), data.title);
assert.equal((await read()).slots[0].notes.length, 0);
await page.getByLabel("进行模板").selectOption("0");
await page.getByRole("button", { name: "恢复切换前草稿" }).click();
assert.equal((await read()).title, data.title);
assert.equal((await read()).slots[0].notes.length, 0);
await page
  .getByRole("button", { name: "编辑琴键", exact: true })
  .first()
  .click();
const c = page.locator(".chord-card").first();
await c.getByRole("button", { name: "琴键 C4", exact: true }).click();
assert.equal((await read()).slots[0].notes.length, 1);
await c.getByRole("button", { name: "琴键 C4", exact: true }).click();
assert.equal((await read()).slots[0].notes.length, 0);
await page.getByRole("button", { name: "↶ 撤销" }).click();
assert.equal((await read()).slots[0].notes.length, 1);
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "导出 JSON", exact: true }).click();
const download = await downloadPromise;
assert.ok(download.suggestedFilename().endsWith(".json"));
await page
  .locator("input[type=file]")
  .setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":2}'),
  });
assert.ok((await page.getByRole("alert").innerText()).includes("导入失败"));
await page.getByRole("button", { name: "关闭", exact: true }).click();
for (let i = 0; i < 4; i++)
  await page.getByRole("button", { name: "＋ 添加和弦", exact: true }).click();
assert.equal(await page.locator(".chord-card").count(), 8);
assert.equal(
  await page
    .getByRole("button", { name: "＋ 添加和弦", exact: true })
    .isDisabled(),
  true,
);
await page.emulateMedia({ media: "print" });
await page.pdf({ path: "artifacts/eight-chords.pdf", preferCSSPageSize: true });
await page.emulateMedia({ media: "screen" });
await page.getByLabel("显示乐器").selectOption("guitar");
assert.equal(await page.locator(".piano").count(), 0);
await page.getByLabel("显示乐器").selectOption("piano");
assert.equal(await page.locator(".guitar").count(), 0);
await browser.close();
console.log(
  "PASS acceptance: all templates, D-key transposition, isolated candidate edit, JSON import/export/errors, backup recovery, zero-note piano, note toggling and undo, eight-slot limit, two-page printing, instrument selection",
);
