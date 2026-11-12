import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173");
await page.getByRole("heading", { name: "Dm7", exact: true }).waitFor();
const cards = page.locator(".chord-card");
assert.equal(await cards.count(), 4);
await page
  .getByRole("button", { name: "编辑指板", exact: true })
  .first()
  .click();
await page.getByLabel("4弦品位", { exact: true }).fill("-1");
assert.ok(!(await cards.first().innerText()).includes("省略 纯五音"));
await page.getByLabel("1弦品位", { exact: true }).fill("-1");
assert.ok((await cards.first().innerText()).includes("省略 纯五音"));
await page.getByRole("button", { name: "↶ 撤销" }).click();
assert.equal(
  await page.getByLabel("1弦品位", { exact: true }).inputValue(),
  "5",
);
await page.getByRole("button", { name: "↷ 重做" }).click();
assert.equal(
  await page.getByLabel("1弦品位", { exact: true }).inputValue(),
  "-1",
);
await page.getByLabel("第1列性质").selectOption("m9");
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: "保留实际弹法并重新标注" }).click();
assert.equal(
  await page.getByLabel("4弦品位", { exact: true }).inputValue(),
  "-1",
);
await page
  .getByRole("button", { name: "编辑琴键", exact: true })
  .first()
  .click();
const piano = cards.first().locator(".piano");
await piano.getByRole("button", { name: "左手 L", exact: true }).click();
await piano.getByRole("button", { name: "琴键 C4", exact: true }).click();
let snapshot = JSON.parse(
  await page.evaluate(() => localStorage.getItem("voicing-studio:draft:v1")),
);
assert.equal(snapshot.slots[0].notes.find((n) => n.midi === 60)?.hand, "left");
assert.equal(snapshot.slots[0].notes.filter((n) => n.midi === 60).length, 1);
await page.locator("#sheet-title").fill("测试 · 自定义练习");
await page.getByRole("button", { name: "保存材料", exact: true }).click();
await page.reload();
snapshot = JSON.parse(
  await page.evaluate(() => localStorage.getItem("voicing-studio:draft:v1")),
);
assert.equal(snapshot.title, "测试 · 自定义练习");
assert.equal(snapshot.slots[0].frets[2], -1);
await page.getByRole("button", { name: "我的材料", exact: true }).click();
await page.getByRole("button", { name: "打开", exact: true }).click();
assert.equal(
  await page.locator("#sheet-title").inputValue(),
  "测试 · 自定义练习",
);
await page.getByLabel("调性", { exact: true }).selectOption("2");
await page.getByRole("button", { name: "取消", exact: true }).click();
assert.equal(await page.getByLabel("调性", { exact: true }).inputValue(), "0");
await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
await page.emulateMedia({ media: "print" });
assert.equal(await page.locator(".print-piano").first().isVisible(), true);
await page.pdf({
  path: "artifacts/example.pdf",
  preferCSSPageSize: true,
  printBackground: true,
});
await page.emulateMedia({ media: "screen" });
await page.setViewportSize({ width: 375, height: 812 });
await page
  .getByRole("button", { name: "编辑指板", exact: true })
  .first()
  .click();
await page.getByLabel("6弦品位", { exact: true }).fill("3");
await page.getByRole("button", { name: "保存材料", exact: true }).click();
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  true,
);
await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
await page.evaluate(() => {
  Storage.prototype.setItem = function () {
    throw Error("QuotaExceededError");
  };
});
await page.locator("#sheet-title").fill("存储失败验证");
await page.getByRole("alert").waitFor();
assert.ok((await page.getByRole("status").innerText()).includes("未保存"));
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS browser: editing, independent notes, undo/redo, custom protection, saved reload, library reopen, transpose cancellation, print PDF, 375px editing, storage failure",
);
