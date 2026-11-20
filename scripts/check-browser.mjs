import chromium from "@sparticuz/chromium";
import { chromium as pw } from "playwright-core";
const b = await pw.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true,
});
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
let errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:5173");
await page.click("#play");
await page.waitForSelector("body.playing");
await page.keyboard.down("KeyW");
await page.waitForTimeout(1200);
await page.keyboard.up("KeyW");
await page.click("#save");
let state = await page.evaluate(
  () => JSON.parse(localStorage.getItem("fallen-crown-v1")).state,
);
if (state.y >= 14) throw Error("Movement failed");
await page.reload();
await page.waitForSelector("#play");
if (!(await page.locator("#play").innerText()).includes("folytatása"))
  throw Error("Resume failed");
await b.close();
if (errors.length) throw Error(errors.join("\n"));
console.log("WebGL, movement, save and resume OK");
