import "./style.css";
import { zones, goods, buy, use, fresh } from "./data.js";
import { createWorld, pos } from "./world.js";
const $ = (v) => document.querySelector(v),
  D = $("dialog"),
  ico = (n) => `<i data-i="${n}" style="--icon:url('/icons/${n}.svg')"></i>`,
  key = "fallen-crown-v1";
let s = fresh(),
  world,
  started = false,
  enemy = null,
  back = "",
  saved = false,
  timer;
try {
  let a = JSON.parse(localStorage.getItem(key));
  if (a?.version === 1 && zones[a.state.z]) {
    Object.assign(s, a.state);
    saved = true;
  }
} catch {}
const zone = () => zones[s.z],
  step = () => zone().steps[s.q],
  goal = () => step()?.[s.room ? 1 : 0] || "",
  sidekey = (i) => s.z + "-" + i,
  icons = ["sword", "shield", "flask-conical", "wand-sparkles"];
function bindIcons() {
  document
    .querySelectorAll("[data-i]")
    .forEach((i) =>
      i.style.setProperty("--icon", `url('/icons/${i.dataset.i}.svg')`),
    );
}
function msg(t) {
  $("#toast").textContent = t;
  $("#toast").style.display = "block";
  clearTimeout(timer);
  timer = setTimeout(() => ($("#toast").style.display = "none"), 2400);
}
function save(notify = false) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, state: s }));
    saved = true;
    if (notify) msg("A játékállás mentve.");
  } catch {
    msg("A böngésző nem engedi a mentést.");
  }
}
function ui() {
  let a = step();
  $(".location small").innerHTML =
    `<b></b> ${["I", "II", "III", "IV", "V"][s.z]}. FEJEZET`;
  $("h1").textContent = zone().name;
  $(".location p").textContent = "⚜  " + (s.room || zone().hub);
  $(".quest h2").textContent =
    a?.[2] || (s.z === 4 ? "A korona sorsa" : "Fejezet teljesítve");
  $(".quest p span").textContent =
    s.ending && s.z === 4
      ? s.ending
      : !s.z && !s.q
        ? "Beszélj Alaric királlyal a kastélyban."
        : a
          ? `${a[0]} · ${a[1]}`
          : s.z === 4
            ? "Válassz befejezést."
            : "A térképpel visszatérhetsz az utadra.";
  $("#mapbox label").textContent = [
    "ELDORIA",
    "SAKURA",
    "MOCSÁR",
    "IGNIS",
    "MALDRAK",
  ][s.z];
  $("#health").textContent = `${s.hp} / 100`;
  $("#mana").textContent = `${s.mp} / 60`;
  $(".hp").style.width = s.hp + "%";
  $(".mp").style.width = (s.mp / 60) * 100 + "%";
  $(".hotbar").innerHTML = icons
    .map(
      (n, i) =>
        `<button class="slot" title="${["Fegyver", "Páncél", "Gyógyital", "Varázslat"][i]}" data-slot="${i}"><sub>${i + 1}</sub>${ico(n)}${i === 2 ? `<sup>${s.bag[8] || 0}</sup>` : ""}</button>`,
    )
    .join("");
  if (!started)
    $("#play").innerHTML =
      ico("swords") +
      " " +
      (saved ? "Kaland folytatása" : "Kaland indítása") +
      " <span>›</span>";
}
function close() {
  D.close();
  enemy = null;
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === "game"));
}
function panel(tag, title, body, buttons = [], locked = false) {
  $("#modal").innerHTML =
    `${locked ? "" : '<button class="close" aria-label="Bezárás">×</button>'}<small>◇ &nbsp; ${tag}</small><h2>${title}</h2>${body}<div id="actions"></div>`;
  if (!D.open) D.showModal();
  if ($(".close")) $(".close").onclick = close;
  for (let [t, f] of buttons) {
    let b = document.createElement("button");
    b.textContent = t;
    b.onclick = f;
    $("#actions").append(b);
  }
}
function room(name) {
  let old = s.room;
  s.room = name;
  $("#view").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420 });
  if (name) {
    s.x = 0;
    s.y = 4;
  } else {
    let [x, z] = pos(zone().rooms.indexOf(old));
    s.x = x - Math.sign(x) * 5.7;
    s.y = z;
  }
  world.load();
  save();
  ui();
}
function chat(text, name = "Útközben") {
  panel("PÁRBESZÉD", name, `<p>${text}</p>`, [["Búcsú", close]]);
}
function finish() {
  let a = step();
  s.keys.push(a[1]);
  s.q++;
  s.gold += 12;
  s.mp = Math.min(60, s.mp + 6);
  close();
  if (!step() && s.z < 4) {
    let old = s.z++;
    (s.progress ??= {})[old] = s.q;
    s.frontier = s.z;
    s.q = 0;
    s.x = 0;
    s.y = 14;
    s.room = "";
    s.hp = 100;
    s.mp = 60;
    world.load();
    panel(
      "ÚJ FEJEZET",
      zone().name,
      `<p>${zones[old].name} mögötted marad. Az út következő állomása: ${zone().hub}.</p>`,
      [["Tovább", close]],
    );
  } else if (!step()) {
    world.load();
    endings();
  } else {
    world.load();
    msg("Küldetés teljesítve · +12 arany");
  }
  save();
  ui();
}
function endings() {
  let choices = [
    "Visszaadod a koronát",
    "Megsemmisíted a koronát",
    "Elfogadod a koronát",
  ];
  panel(
    "EPILÓGUS",
    "A korona sorsa",
    "<p>Maldrak térdre hull. A korona most a te kezedben van.</p>",
    choices.map((n, i) => [
      n,
      () => {
        s.ending = [
          "Eldoria örököse visszatér a trónra.",
          "A királyság népe szabadon dönthet sorsáról.",
          "Te foglalod el Eldoria trónját.",
        ][i];
        save();
        ui();
        stats();
      },
    ]),
    true,
  );
}
function stats() {
  panel(
    "BEFEJEZÉS",
    "Az utazás vége",
    `<p>${s.ending}</p><p>Játékidő: ${Math.floor(s.secs / 60)} perc · Győzelmek: ${s.kills} · Mellékküldetések: ${Object.values(s.side).filter((x) => x === 3).length}/10</p>`,
    [
      ["Szabad felfedezés", close],
      [
        "Új kaland",
        () => {
          Object.assign(s, fresh());
          close();
          world.load();
          save();
          ui();
        },
      ],
    ],
  );
}
function fight(name) {
  enemy = {
    name,
    hp: s.z === 4 ? 140 : 45 + 12 * s.z,
    max: s.z === 4 ? 140 : 45 + 12 * s.z,
    turn: 0,
    log: "Figyeld ellenfeled mozdulatait!",
  };
  battle();
}
function battle() {
  let e = enemy;
  panel(
    "PÁRBAJ",
    e.name,
    `<p>Életerő: ${e.hp} / ${e.max} &nbsp; · &nbsp; Lovag: ${s.hp} ÉP</p><p>${e.log}</p><p>${e.turn % 3 === 2 ? "⚠ Súlyos csapásra készül!" : "Az ellenfél közelít."}</p>`,
    [
      ["Kardcsapás", () => strike(0)],
      ["Mágia · 12 MP", () => strike(1)],
      ["Hárítás", () => strike(2)],
      ["Gyógyital", () => strike(3)],
      ["Visszavonulás", close],
    ],
  );
}
function strike(i) {
  let e = enemy;
  if (!e) return;
  world.action(i === 2 ? "Block" : "1H_Melee_Attack_Chop");
  if (i === 1 && s.mp < 12) return msg("Nincs elég mana.");
  if (i === 3 && !s.bag[8]) return msg("Nincs kis gyógyital.");
  if (i === 3) use(s, 8);
  if (i === 1) s.mp -= 12;
  let damage =
    i === 3
      ? 0
      : i === 2
        ? 5
        : i === 1
          ? 28
          : 12 + (goods[s.weapon]?.[2] || 0) + (s.buff ? 8 : 0);
  e.hp -= damage;
  if (e.hp <= 0) {
    s.kills++;
    return finish();
  }
  let hit = Math.max(
    1,
    (e.turn % 3 === 2 ? 22 : 8) +
      s.z -
      (goods[s.armor]?.[2] || 0) -
      (i === 2 ? 22 : 0) -
      (s.ward && s.z === 3 ? 5 : 0),
  );
  s.hp = Math.max(0, s.hp - hit);
  s.buff = Math.max(0, s.buff - 1);
  s.ward = Math.max(0, s.ward - 1);
  s.mp = Math.min(60, s.mp + 3);
  e.log = `Sebzésed: ${damage}. Elszenvedett sebzés: ${hit}.`;
  e.turn++;
  if (!s.hp) {
    s.hp = 100;
    s.mp = 60;
    close();
    room("");
    msg("A városőr hazakísért. Újra próbálkozhatsz.");
  } else battle();
  ui();
}
function objective() {
  let [r, n, title, type] = step();
  if (type === "harc") return fight(n);
  if (type === "rejtvény")
    return panel(
      "REJTVÉNY",
      n,
      "<p>Mi kél elsőként a keleti hegyek felett?</p>",
      [
        ["A hold", () => msg("A kapu zárva marad.")],
        ["A nap", finish],
        ["A csillagok", () => msg("A kapu zárva marad.")],
      ],
    );
  if (
    type === "kapu" &&
    !s.keys.includes(s.z === 0 ? "Pincekulcs" : "Lánckulcs")
  )
    return msg("Kulcs szükséges.");
  panel(
    title,
    n,
    `<p>${type === "tárgy" ? (/szelep/i.test(n) ? "A kerék enged a kezed alatt." : "Megtaláltad: " + n + ".") : type === "kapu" ? "A megtalált kulcs pontosan illik a zárba." : type}</p>`,
    [
      [
        type === "tárgy"
          ? /szelep/i.test(n)
            ? "Aktiválás"
            : "Felvétel"
          : type === "kapu"
            ? "Nyitás"
            : "Tovább",
        finish,
      ],
    ],
  );
}
function shop(list) {
  panel(
    "KERESKEDELEM",
    s.room,
    `<p>${ico("coins")} ${s.gold} arany</p>` +
      list
        .map(
          (i) =>
            `<div class="row"><span>${ico(i < 4 ? "sword" : i < 8 ? "shield" : "flask-conical")}${goods[i][0]} · ${goods[i][1]} ⚜</span><button data-buy="${i}">Vásárlás</button></div>`,
        )
        .join(""),
  );
  document.querySelectorAll("[data-buy]").forEach(
    (b) =>
      (b.onclick = () => {
        if (buy(s, +b.dataset.buy)) {
          save();
          ui();
          shop(list);
          msg("A tárgy a leltárba került.");
        } else msg("Nincs elég arany.");
      }),
  );
}
function side(i, found) {
  let [r, n, loc, npc] = zone().side[i],
    k = sidekey(i),
    v = s.side[k] || 0;
  if (found) {
    if (v !== 1) return;
    return panel("MELLÉKKÜLDETÉS", n, `<p>Vidd vissza ide: ${r}.</p>`, [
      [
        "Segítek",
        () => {
          s.side[k] = 2;
          close();
          save();
          world.load();
        },
      ],
    ]);
  }
  panel(
    "MELLÉKKÜLDETÉS",
    npc,
    `<p>${["Segítenél megkeresni? " + n + " · " + loc + ". A jutalmad 35 arany.", "Még várlak. A célpont helye: " + loc + ".", "Épségben visszahoztad! Fogadd el a jutalmadat.", "Köszönöm a segítségedet, lovag."][v]}</p>`,
    [
      [
        ["Elvállalom", "Búcsú", "Jutalom átvétele", "Búcsú"][v],
        () => {
          if (v === 0) s.side[k] = 1;
          if (v === 2) {
            s.gold += 35;
            s.side[k] = 3;
          }
          close();
          world.load();
          save();
          ui();
        },
      ],
    ],
  );
}
function populate(t) {
  let r = s.room,
    a = step(),
    count = 0;
  function add(n, fn, k) {
    let x = [0, -4, 4, -6, 6][count++];
    t(n, x, -2 + (count % 2) * 1.4, fn, k);
  }
  if (a && a[0] === r)
    add(
      a[1],
      objective,
      ["tárgy", "kapu", "rejtvény"].includes(a[3]) ? "item" : "npc",
    );
  let list = /Fegyver|Kovács/.test(r)
    ? [0, 1, 2, 3]
    : /Páncél/.test(r)
      ? [4, 5, 6, 7]
      : /kereskedés|Teaház|Piac|Fogadó/.test(r)
        ? [8, 9, 10, 11, 12]
        : null;
  if (list)
    add("Árus", () =>
      panel(
        "KERESKEDŐ",
        "Árus",
        `<p>Üdvözöllek! ${list[0] === 0 ? "Jó pengét keresel?" : list[0] === 4 ? "Egy vért életet menthet." : "Friss főzeteket hoztam az útra."}</p>`,
        [
          ["Áruk megtekintése", () => shop(list)],
          ["Búcsú", close],
        ],
      ),
    );
  zone().side.forEach(([giver, n, loc, npc], i) => {
    if (r === giver) add(npc, () => side(i, false));
    if (r === loc && s.side[sidekey(i)] === 1)
      add(n, () => side(i, true), /lovag|utazó/i.test(n) ? "npc" : "item");
  });
  for (let [place, name, , line] of zone().steps) {
    if (
      place === r &&
      name !== a?.[1] &&
      !["tárgy", "harc", "rejtvény", "kapu"].includes(line)
    )
      add(name, () => chat(line, name));
  }
  if (!count)
    add("Helybéli", () =>
      chat(`Ez itt a ${r}. A következő úti célodat a naplóban találod.`),
    );
}
function bag() {
  let entries = Object.entries(s.bag).filter(([i, n]) => n > 0);
  panel(
    "FELSZERELÉS",
    "Leltár",
    `<p>${ico("coins")} ${s.gold} arany</p>` +
      entries
        .map(
          ([i, n]) =>
            `<div class="row"><span>${ico(i < 4 ? "sword" : i < 8 ? "shield" : "flask-conical")}${goods[i][0]} ×${n}</span><button data-use="${i}">${+i === s.weapon || +i === s.armor ? "Felszerelve" : i < 8 ? "Felöltés" : "Használat"}</button></div>`,
        )
        .join("") +
      `<p>Küldetési emlékek: ${s.keys.join(", ") || "—"}</p>`,
  );
  document.querySelectorAll("[data-use]").forEach(
    (b) =>
      (b.onclick = () => {
        use(s, b.dataset.use);
        ui();
        save();
        bag();
      }),
  );
}
function journal() {
  panel(
    "KÜLDETÉSNAPLÓ",
    zone().name,
    zone()
      .steps.map(
        ([r, n, t], i) =>
          `<p>${i < s.q ? "✓" : i === s.q ? "◆" : "◇"} ${t} ${i === s.q ? " · " + r + " / " + n : ""}</p>`,
      )
      .join("") +
      "<hr><h3>Mellékküldetések</h3>" +
      zone()
        .side.map(
          ([r, n, l, g], i) =>
            `<p>${n} · ${["Megbízó: " + g + " / " + r, "Keresd itt: " + l, "Térj vissza: " + r, "Teljesítve ✓"][s.side[sidekey(i)] || 0]}</p>`,
        )
        .join(""),
  );
}
function slot(i) {
  if (i === 2) {
    if (s.hp === 100) return msg("Az életerőd teljes.");
    if (!s.bag[8]) return msg("Nincs gyógyital.");
    use(s, 8);
    ui();
    save();
  } else if (i === 3) msg("Mágia párbaj közben használható.");
  else bag();
}
$("#play").onclick = () => {
  if (started) return;
  try {
    world = createWorld($("#view"), s, {
      room,
      populate,
      goal,
      chat,
      paused: () => D.open,
      prompt: (n) => {
        let e = $("#prompt");
        e.style.display = n ? "block" : "none";
        e.textContent = n ? "E  ·  " + n : "";
      },
    });
  } catch (e) {
    console.error(e);
    return msg("A 3D módhoz WebGL szükséges.");
  }
  started = true;
  document.body.classList.add("playing");
  $("#play").hidden = true;
  msg("WASD: mozgás · ← → vagy egérhúzás: forgás");
  if (!step() && s.z === 4) {
    if (s.ending) stats();
    else endings();
  }
};
$("#prompt").onclick = () => world?.interact();
$("#save").onclick = () => {
  save(true);
  ui();
};
$(".hotbar").onclick = (e) => {
  let b = e.target.closest("button");
  if (b) slot(+b.dataset.slot);
};
document.querySelectorAll("nav button").forEach(
  (b) =>
    (b.onclick = () => {
      let p = b.dataset.page;
      close();
      b.classList.add("active");
      if (p !== "game") $("nav button").classList.remove("active");
      if (p === "bag") bag();
      if (p === "quests") journal();
    }),
);
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (D.open) {
    if (e.code === "Escape" && !step() && !s.ending) e.preventDefault();
    return;
  }
  if (e.code === "KeyE") world?.interact();
  if (e.code === "KeyI") bag();
  if (e.code === "KeyJ") journal();
  if (/^Digit[1-4]$/.test(e.code)) slot(+e.code.slice(-1) - 1);
});
window.addEventListener("pagehide", () => {
  if (started) save();
});
setInterval(() => {
  if (started && !enemy) save();
}, 8000);
function map() {
  let c = $("#map"),
    g = c.getContext("2d");
  g.fillStyle = "#43483b";
  g.fillRect(0, 0, 180, 180);
  let n = 14;
  function rand() {
    n = (n * 48271) % 2147483647;
    return n / 2147483647;
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = i % 2 ? "#677058" : "#303d32";
    g.fillRect(rand() * 180, rand() * 180, rand() * 4, 1);
  }
  const at = (x, z) => [90 + x * 2, 132 + z * 1.15];
  if (s.room) {
    g.fillStyle = "#5d5d4d";
    g.fillRect(22, 38, 136, 105);
    g.strokeStyle = "#b5a383";
    g.strokeRect(22, 38, 136, 105);
    g.fillStyle = "#948066";
    for (let x of [34, 114]) g.fillRect(x, 47, 28, 10);
    g.fillStyle = "#e2c586";
    g.fillRect(84, 138, 12, 6);
    if (step()?.[0] === s.room && world?.marker()) {
      let t = world.marker();
      g.fillStyle = "#efc367";
      g.font = "14px Georgia";
      g.fillText("◆", 85 + t.x * 7, 95 + t.z * 7);
    }
    let x = 90 + s.x * 7,
      y = 90 + s.y * 7;
    g.fillStyle = "#fcf1ce";
    g.beginPath();
    g.moveTo(x, y - 5);
    g.lineTo(x + 4, y + 4);
    g.lineTo(x - 4, y + 4);
    g.fill();
    return;
  }
  g.strokeStyle = "#9b9277";
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(90, 180);
  g.lineTo(90, 12);
  g.stroke();
  for (let i = 0; i < zone().rooms.length; i++) {
    let [x, z] = pos(i),
      [a, b] = at(x, z);
    g.fillStyle = zone().rooms[i] === step()?.[0] ? "#c7a367" : "#7e7d68";
    g.fillRect(a - 8, b - 5, 17, 10);
    g.strokeStyle = "#aea38b";
    g.lineWidth = 1;
    g.strokeRect(a - 8, b - 5, 17, 10);
    g.fillStyle = "#928b72";
    g.fillRect(Math.min(90, a), b, Math.abs(a - 90), 2);
  }
  for (let i = 0; i < 35; i++) {
    let x = rand() * 180,
      y = rand() * 180;
    if (Math.abs(x - 90) < 40) continue;
    g.fillStyle = "#78806a";
    g.fillRect(x, y, 5 + rand() * 10, 4 + rand() * 8);
  }
  let [x, y] = s.room ? at(...pos(zone().rooms.indexOf(s.room))) : at(s.x, s.y);
  g.fillStyle = "#e8cb8e";
  g.beginPath();
  g.moveTo(x, y - 7);
  g.lineTo(x + 5, y + 5);
  g.lineTo(x, y + 2);
  g.lineTo(x - 5, y + 5);
  g.fill();
  if (started && s.room && world?.marker()) {
    let t = world.marker();
    g.fillText("◆", x + (t.x - s.x) * 2, y + (t.z - s.y) * 2);
  }
}
bindIcons();
ui();
map();
setInterval(map, 250);

function atlas() {
  if (!started) return journal();
  let frontier = s.frontier ?? s.z;
  panel(
    "UTAZÁS",
    "Világtérkép",
    "<p>Visszatérhetsz a már felfedezett területekre. A napló megőrzi a haladásodat.</p>",
    zones.slice(0, frontier + 1).map((z, i) => [
      z.name,
      () => {
        (s.progress ??= {})[s.z] = s.q;
        s.z = i;
        s.q = s.progress[i] ?? 0;
        s.room = "";
        s.x = 0;
        s.y = 14;
        world.load();
        close();
        ui();
        save();
      },
    ]),
  );
}
$("#mapbox").onclick = atlas;
$("#mapbox").tabIndex = 0;
$("#mapbox").title = "Világtérkép";
$("#mapbox").onkeydown = (e) => {
  if (e.key === "Enter") atlas();
};
D.addEventListener("cancel", (e) => {
  if (!step() && s.z === 4 && !s.ending) e.preventDefault();
});
for (let b of document.querySelectorAll("[data-key]")) {
  let press = (type) =>
    window.dispatchEvent(new KeyboardEvent(type, { code: b.dataset.key }));
  b.onpointerdown = (e) => {
    b.setPointerCapture(e.pointerId);
    press("keydown");
  };
  b.onpointerup = b.onpointercancel = () => press("keyup");
}
