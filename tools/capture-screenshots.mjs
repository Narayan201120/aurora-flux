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
await page.screenshot({
  path: join(outputDirectory, "03-moving.png"),
  fullPage: true,
});
const lapText = await page.locator("[data-hud=lap]").textContent();
const speedText = await page.locator("[data-hud=speed]").textContent();
const readyState = await page.evaluate(() =>
  window.__auroraFluxTest?.snapshot(),
);
if (!lapText?.includes("/ 03") || readyState?.phase === "countdown") {
  errors.push(
    `HUD did not reach the active race state: lap=${lapText ?? "missing"}, speed=${speedText ?? "missing"}, state=${JSON.stringify(readyState)}`,
  );
}

await page.evaluate(() => window.__auroraFluxTest?.teleportToProgress(0.76));
await page.waitForTimeout(160);
await page.screenshot({
  path: join(outputDirectory, "04-dark-matter-storm.png"),
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
  path: join(outputDirectory, "05-finish.png"),
  fullPage: true,
});
const raceResult = await page.evaluate(() =>
  window.__auroraFluxTest?.snapshot(),
);
if (raceResult?.phase !== "finished" || raceResult.lapsCompleted !== 3) {
  errors.push(`Race did not finish in browser: ${JSON.stringify(raceResult)}`);
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
  path: join(outputDirectory, "06-restart-countdown.png"),
  fullPage: true,
});
await browser.close();

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}
console.log(`browser verification passed: ${outputDirectory}`);
