import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const baseUrl = new URL(process.env.AURORA_URL ?? "http://127.0.0.1:5173/");
baseUrl.searchParams.set("test", "1");
const outputDirectory = join(process.cwd(), "notes", "browser-captures");
mkdirSync(outputDirectory, { recursive: true });

const browserPath =
  process.env.BROWSER_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : undefined);
console.log("browser: launching");
const browser = await chromium.launch({
  headless: true,
  executablePath: browserPath,
});
console.log("browser: launched");
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error")
    errors.push(`console: ${message.text()} @ ${message.location().url}`);
});
page.on("response", (response) => {
  if (response.status() >= 400)
    errors.push(`http ${response.status()}: ${response.url()}`);
});

console.log(`browser: opening ${baseUrl}`);
await page.goto(baseUrl.toString(), {
  waitUntil: "domcontentloaded",
  timeout: 15000,
});
console.log("browser: dom ready");
await page.waitForSelector("[data-hud=lap]");
console.log("browser: hud ready");
const requiredHudSelectors = [
  "[data-hud=lap]",
  "[data-hud=timer]",
  "[data-hud=position]",
  "[data-hud=boost-label]",
  "[data-hud=hazard]",
  "[data-hud=minimap]",
];
for (const selector of requiredHudSelectors) {
  if ((await page.locator(selector).count()) !== 1) {
    errors.push(`Required HUD field is missing: ${selector}`);
  }
}
const minimapHasPixels = await page.evaluate(() => {
  const canvas = document.querySelector("[data-hud=minimap]");
  if (!(canvas instanceof HTMLCanvasElement)) return false;
  const context = canvas.getContext("2d");
  if (!context) return false;
  return context
    .getImageData(0, 0, canvas.width, canvas.height)
    .data.some((value) => value !== 0);
});
if (!minimapHasPixels) errors.push("Minimap did not render route pixels");
await page.screenshot({
  path: join(outputDirectory, "01-countdown.png"),
  fullPage: true,
});
await page.waitForTimeout(4000);
await page.waitForFunction(
  () => window.__auroraFluxTest?.snapshot().phase === "racing",
  null,
  { timeout: 15000 },
);
await page.screenshot({
  path: join(outputDirectory, "02-race-ready.png"),
  fullPage: true,
});
await page.keyboard.down("KeyW");
await page.waitForTimeout(1800);
await page.keyboard.up("KeyW");
await page.waitForFunction(
  () => window.__auroraFluxTest?.snapshot().audio.contextState === "running",
  null,
  { timeout: 5000 },
);
const audioReady = await page.evaluate(
  () => window.__auroraFluxTest?.snapshot().audio,
);
if (
  audioReady?.contextState !== "running" ||
  !audioReady.events.includes("engine") ||
  !audioReady.events.includes("ambient")
) {
  errors.push(`Audio graph did not unlock: ${JSON.stringify(audioReady)}`);
}
await page.screenshot({
  path: join(outputDirectory, "03-moving.png"),
  fullPage: true,
});
const lapText = await page.locator("[data-hud=lap]").textContent();
const speedText = await page.locator("[data-hud=speed]").textContent();
const readyState = await page.evaluate(() =>
  window.__auroraFluxTest?.snapshot(),
);
const performanceSnapshot = readyState?.performance;
if (
  !performanceSnapshot ||
  !Number.isFinite(performanceSnapshot.cpuMs) ||
  !Number.isFinite(performanceSnapshot.renderMs) ||
  performanceSnapshot.geometries > 200 ||
  performanceSnapshot.textures > 32 ||
  performanceSnapshot.drawCalls > 80
) {
  errors.push(
    `Performance telemetry exceeded the bounded scene budget: ${JSON.stringify(performanceSnapshot)}`,
  );
}
if (!lapText?.includes("/ 03") || readyState?.phase === "countdown") {
  errors.push(
    `HUD did not reach the active race state: lap=${lapText ?? "missing"}, speed=${speedText ?? "missing"}, state=${JSON.stringify(readyState)}`,
  );
}

await page.evaluate(() => window.__auroraFluxTest?.teleportToProgress(0.5));
await page.waitForTimeout(160);
await page.screenshot({
  path: join(outputDirectory, "04-world-landmarks.png"),
  fullPage: true,
});

await page.evaluate(() => window.__auroraFluxTest?.teleportToProgress(0.76));
await page.waitForTimeout(160);
await page.screenshot({
  path: join(outputDirectory, "05-dark-matter-storm.png"),
  fullPage: true,
});
const hazardText = await page.locator("[data-hud=hazard]").textContent();
if (!hazardText?.includes("DARK MATTER STORM")) {
  errors.push(`Dark matter hazard was not surfaced in the HUD: ${hazardText}`);
}

const checkpointProgress = [0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 0];
for (let lap = 0; lap < 3; lap += 1) {
  for (const progress of checkpointProgress) {
    await page.evaluate(
      (value) => window.__auroraFluxTest?.teleportToProgress(value),
      progress,
    );
    await page.waitForTimeout(45);
  }
}
await page.waitForTimeout(120);
await page.screenshot({
  path: join(outputDirectory, "06-finish.png"),
  fullPage: true,
});
const raceResult = await page.evaluate(() =>
  window.__auroraFluxTest?.snapshot(),
);
if (raceResult?.phase !== "finished" || raceResult.lapsCompleted !== 3) {
  errors.push(`Race did not finish in browser: ${JSON.stringify(raceResult)}`);
}
if (!raceResult?.audio.events.includes("finish")) {
  errors.push(
    `Finish audio cue did not fire: ${JSON.stringify(raceResult?.audio)}`,
  );
}
if (!(await page.locator("#results-screen").isVisible())) {
  errors.push("Results screen did not become visible after the finish");
}
await page.click("#restart-race");
await page.waitForTimeout(120);
const restartResult = await page.evaluate(() =>
  window.__auroraFluxTest?.snapshot(),
);
if (restartResult?.phase !== "countdown" || restartResult.lapsCompleted !== 0) {
  errors.push(
    `Race did not reset in browser: ${JSON.stringify(restartResult)}`,
  );
}
await page.screenshot({
  path: join(outputDirectory, "07-restart-countdown.png"),
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(160);
const mobileHudFits = await page.evaluate(() => {
  const selectors = [
    ".hud-brand",
    ".hud-lap-panel",
    ".hud-timer",
    ".hud-position",
    ".hud-hazard",
    ".hud-map",
    ".hud-speed",
    ".hud-boost",
  ];
  return selectors.every((selector) => {
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= window.innerWidth + 1;
  });
});
if (!mobileHudFits)
  errors.push("Responsive HUD overflowed the mobile viewport");
await page.screenshot({
  path: join(outputDirectory, "08-mobile-hud.png"),
  fullPage: true,
});
await browser.close();

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}
console.log(`browser verification passed: ${outputDirectory}`);
