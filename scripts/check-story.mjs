// Exercise the real UI and scene loader. Only distance-based navigation is accelerated.
import chromium from "@sparticuz/chromium";
import { chromium as pw } from "playwright-core";
import assert from "node:assert/strict";
import { zones } from "../src/data.js";
const b = await pw.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true,
});
try {
  const p = await b.newPage({ viewport: { width: 800, height: 540 } });
  let errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.route("**/src/world.js*", async (route) => {
    let r = await route.fetch(),
      text = await r.text();
    assert.ok(/load\(\);\s*let drag/.test(text));
    await route.fulfill({
      response: r,
      body: text
        .replace(
          /load\(\);\s*let drag/,
          `window.reach=name=>{let o=objs.find(o=>o.name===name);if(!o)throw Error('Missing world target: '+name);o.act()};load();let drag`,
        )
        .replace(/ren\.render\(scene,\s*cam\)/, "void 0"),
    });
  });
  await p.goto("http://localhost:5173");
  await p.click("#play");
  await p.waitForSelector("body.playing");
  const reach = (n) => p.evaluate((n) => window.reach(n), n),
    btn = (t) =>
      p
        .getByRole("button", { name: t, exact: true })
        .evaluate((b) => b.click()),
    exit = (z) => reach("Vissza: " + z.hub);
  for (let [zi, z] of zones.entries()) {
    for (let [r, n, l, g] of z.side) {
      await reach(r);
      await reach(g);
      await btn("Elvállalom");
      await exit(z);
      await reach(l);
      await reach(n);
      await btn("Segítek");
      await exit(z);
      await reach(r);
      await reach(g);
      await btn("Jutalom átvétele");
      await exit(z);
    }
    if (zi === 0) {
      await reach("Fegyverbolt");
      await reach("Árus");
      await btn("Áruk megtekintése");
      await p.locator('[data-buy="2"]').evaluate((b) => b.click());
      await btn("Bezárás");
      await btn("Leltár");
      await p.locator('[data-use="2"]').evaluate((b) => b.click());
      await btn("Bezárás");
      await exit(z);
    }
    for (let [index, [r, n, title, k]] of z.steps.entries()) {
      await reach(r);
      await reach(n);
      if (k === "harc") {
        while (
          await p
            .getByRole("button", { name: "Kardcsapás", exact: true })
            .count()
        )
          await btn("Kardcsapás");
      } else
        await btn(
          k === "kapu"
            ? "Nyitás"
            : k === "rejtvény"
              ? "A nap"
              : k === "tárgy"
                ? /szelep/i.test(n)
                  ? "Aktiválás"
                  : "Felvétel"
                : "Tovább",
        );
      if (index < z.steps.length - 1) await exit(z);
      else if (zi < 4) await btn("Tovább");
    }
    console.log(z.name, "OK");
  }
  let pre = await p.evaluate(() => localStorage.getItem("fallen-crown-v1"));
  for (let [i, choice] of [
    "Visszaadod a koronát",
    "Megsemmisíted a koronát",
    "Elfogadod a koronát",
  ].entries()) {
    if (i) {
      await p.reload();
      await p.evaluate((v) => localStorage.setItem("fallen-crown-v1", v), pre);
      await p.reload();
      await p.click("#play");
    }
    await btn(choice);
    assert.ok((await p.locator("dialog").innerText()).includes("10/10"));
  }
  assert.deepEqual(errors, []);
  console.log("All objectives, ten errands and three endings OK");
} finally {
  await b.close();
}
