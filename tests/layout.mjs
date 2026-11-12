import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.BASE_URL || "http://127.0.0.1:5173");
await page.locator(".chord-card").first().waitFor();
async function geometry(label) {
  const issues = await page.evaluate(() => {
    const out = [];
    const inside = (el, parent, label) => {
      const r = el.getBoundingClientRect(),
        p = parent.getBoundingClientRect();
      if (
        r.width < 1 ||
        r.height < 1 ||
        r.left < p.left - 1 ||
        r.right > p.right + 1 ||
        r.top < p.top - 1 ||
        r.bottom > p.bottom + 1
      )
        out.push(
          `${label}: ${JSON.stringify({ element: [r.x, r.y, r.width, r.height], parent: [p.x, p.y, p.width, p.height] })}`,
        );
    };
    if (document.documentElement.scrollWidth > innerWidth + 1)
      out.push("whole page horizontal overflow");
    for (const [i, card] of [
      ...document.querySelectorAll(".chord-card"),
    ].entries()) {
      for (const sel of [
        ".card-heading",
        ".instrument",
        ".spec-controls select",
        ".instrument-title button",
        ".candidate select",
        ".candidate button",
        ".guitar-wrap svg",
        ".string-labels span",
        ".piano-summary > div",
        ".note-chips > span",
        ".keyboard-scroll",
        ".keyboard-navigation button",
      ])
        for (const el of card.querySelectorAll(sel))
          inside(el, card, `card ${i + 1} ${sel}`);
      const svg = card.querySelector(".guitar-wrap svg");
      if (svg && svg.getBoundingClientRect().width < 150)
        out.push("unreadably small guitar");
      const scroll = card.querySelector(".keyboard-scroll");
      if (scroll && scroll.clientWidth > card.clientWidth)
        out.push("keyboard expands its card");
    }
    for (const el of document.querySelectorAll(".settings select"))
      inside(el, document.querySelector(".sheet-toolbar"), "toolbar select");
    return out;
  });
  assert.deepEqual(issues, [], label);
}
// Includes both sides of each responsive breakpoint, the reported wide screen, and browser-like zoom.
for (const width of [
  2048, 1920, 1600, 1440, 1280, 1201, 1200, 1100, 1051, 1050, 1024, 768, 601,
  600, 414, 375,
]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.waitForTimeout(80);
  await geometry(`width ${width}`);
  if (width === 375)
    await page
      .locator(".chord-card")
      .first()
      .screenshot({ path: "artifacts/ui-mobile-card.png" });
  if ([2048, 1440, 768, 375].includes(width))
    await page.screenshot({
      path: `artifacts/ui-${width}.png`,
      fullPage: true,
    });
}
await page.setViewportSize({ width: 1440, height: 1000 });
for (const zoom of [1.25, 1.5]) {
  await page.evaluate(
    (zoom) => (document.documentElement.style.zoom = String(zoom)),
    zoom,
  );
  await page.waitForTimeout(80);
  await geometry(`zoom ${zoom}`);
}
await page.evaluate(() => (document.documentElement.style.zoom = ""));
// Every visible selected key fits when its span fits the viewport; scrolling never moves the other keyboards.
const piano = page.locator(".piano").first(),
  scroll = piano.getByRole("region");
async function selectedVisible() {
  return scroll.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return [...el.querySelectorAll(".selected")].every((k) => {
      const s = k.getBoundingClientRect();
      return s.left >= r.left - 1 && s.right <= r.right + 1;
    });
  });
}
await piano.getByRole("button", { name: "定位当前选音" }).click();
assert.equal(await selectedVisible(), true);
const originalNotes = await page.evaluate(
  () =>
    JSON.parse(localStorage.getItem("voicing-studio:draft:v1")).slots[0].notes,
);
const otherScroll = await page
  .locator(".piano")
  .nth(1)
  .getByRole("region")
  .evaluate((el) => el.scrollLeft);
await piano.getByRole("button", { name: "向右浏览琴键" }).click();
await page.waitForTimeout(400);
const right = await scroll.evaluate((el) => el.scrollLeft);
assert.ok(right > 0);
await scroll.focus();
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(400);
assert.ok((await scroll.evaluate((el) => el.scrollLeft)) < right);
await scroll.evaluate((el) => (el.scrollLeft = el.scrollWidth));
await piano.getByRole("button", { name: "定位当前选音" }).click();
assert.equal(await selectedVisible(), true);
assert.equal(
  await page
    .locator(".piano")
    .nth(1)
    .getByRole("region")
    .evaluate((el) => el.scrollLeft),
  otherScroll,
);
assert.deepEqual(
  await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("voicing-studio:draft:v1")).slots[0]
        .notes,
  ),
  originalNotes,
);
for (let i = 0; i < 8; i++) {
  await page.getByLabel("进行模板").selectOption(String(i));
  await geometry(`template ${i}`);
}
for (const instruments of ["guitar", "piano", "both"]) {
  await page.getByLabel("显示乐器").selectOption(instruments);
  await geometry(`instruments ${instruments}`);
}
// Candidate changes and key transposition must also recenter current notes.
await page.getByLabel("进行模板").selectOption("2");
await page.getByLabel("第1列钢琴候选").selectOption("1");
await piano.getByRole("button", { name: "定位当前选音" }).click();
assert.equal(await selectedVisible(), true);
await page.getByLabel("调性", { exact: true }).selectOption("2");
await page.getByRole("button", { name: "确认移调" }).click();
await geometry("transposed");
// Mobile editing and far-away notes stay reachable through the scrolling viewport.
await page.setViewportSize({ width: 375, height: 812 });
await piano.getByRole("button", { name: "编辑琴键", exact: true }).click();
await scroll.evaluate((el) => (el.scrollLeft = el.scrollWidth));
await page.waitForTimeout(50);
const last = scroll.locator('[data-midi="84"]');
await last.click();
assert.equal(await last.getAttribute("aria-pressed"), "true");
await geometry("mobile far note edit");
await page
  .getByRole("button", { name: "编辑指板", exact: true })
  .first()
  .click();
await page.getByLabel("6弦品位", { exact: true }).fill("24");
await page.getByLabel("指板起始品", { exact: true }).first().fill("20");
await geometry("mobile guitar edit");
await page.setViewportSize({ width: 1440, height: 1000 });
await page.emulateMedia({ media: "print" });
const pdf = await page.pdf({
  path: "artifacts/ui-print.pdf",
  preferCSSPageSize: true,
});
assert.equal(
  (pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length,
  4,
  "wide-register material prints one complete card per page",
);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS layout: 16 viewport widths, contained controls and guitar diagrams, all templates, selected-key visibility, scroll buttons/keyboard, isolated scrolling, recentering, mobile extreme notes/frets, print PDF",
);
