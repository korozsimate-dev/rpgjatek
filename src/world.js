import { surface } from "./surfaces.js";
import { dress, pose } from "./actors.js";
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { zones } from "./data.js";
const pal = [
  ["#81906c", "#d2b993", "#524b45", "#803d40", "#bac6c7"],
  ["#91a27e", "#e9c8a1", "#713e40", "#d877a1", "#edd7dc"],
  ["#495747", "#83785e", "#42473b", "#526d51", "#788a7b"],
  ["#695446", "#d1a177", "#843e2b", "#fe7538", "#c9987b"],
  ["#555769", "#8a8994", "#3c3949", "#76485e", "#9495af"],
];
export const pos = (i) => [(i % 2 ? 1 : -1) * 13, 8 - Math.floor(i / 2) * 15];
export function createWorld(canvas, s, api) {
  const ren = new T.WebGLRenderer({ antialias: true });
  canvas.append(ren.domElement);
  ren.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  ren.shadowMap.enabled = true;
  ren.shadowMap.type = T.PCFSoftShadowMap;
  ren.outputColorSpace = T.SRGBColorSpace;
  let scene,
    hero,
    cam = new T.PerspectiveCamera(58, 1, 0.1, 220),
    objs = [],
    people = [],
    flags = [],
    walls = [],
    dragon,
    particles,
    light,
    time = 0,
    angle = 0,
    near,
    keys = {},
    last = performance.now(),
    p,
    parent;
  const mats = new Map(),
    geos = {
      box: new T.BoxGeometry(1, 1, 1),
      ball: new T.SphereGeometry(0.5, 12, 10),
      cone: new T.ConeGeometry(0.72, 1, 4),
      tube: new T.CylinderGeometry(0.5, 0.5, 1, 12),
    };
  let seed = 1;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function mesh(k, c, x, y, z, w, h, d, g = parent) {
    if (!mats.has(c))
      mats.set(
        c,
        new T.MeshStandardMaterial({
          color: c,
          roughness: 0.82,
          map:
            c === p[1] || c === p[2]
              ? surface("stone")
              : /^#(58|67|84|6d|60|79)/.test(c)
                ? surface("timber")
                : null,
        }),
      );
    let m = new T.Mesh(geos[k], mats.get(c));
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  }
  const box = (...a) => mesh("box", ...a),
    ball = (...a) => mesh("ball", ...a),
    tube = (...a) => mesh("tube", ...a);
  function grp(x, y, z, g = parent) {
    let a = new T.Group();
    a.position.set(x, y, z);
    g.add(a);
    return a;
  }
  function sign(txt, x, y, z, g = parent) {
    let c = document.createElement("canvas");
    c.width = 512;
    c.height = 80;
    let a = c.getContext("2d");
    a.fillStyle = "#272920";
    a.fillRect(0, 0, 512, 80);
    a.strokeStyle = "#bd9c6b";
    a.strokeRect(5, 5, 502, 70);
    a.fillStyle = "#eed8b2";
    a.font = "32px Georgia";
    a.textAlign = "center";
    a.fillText(txt, 256, 51, 490);
    let tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    let o = new T.Sprite(new T.SpriteMaterial({ map: tex }));
    o.scale.set(4.4, 0.69, 1);
    o.position.set(x, y, z);
    g.add(o);
  }
  function person(x, z, col, npc = true, role = "Rogue") {
    let g = grp(x, 0, z),
      cloth = grp(0, 0, 0, g);
    ball(col, 0, 1.24, 0, 0.77, 1, 0.5, cloth);
    box("#63442f", 0, 1.05, 0, 0.69, 0.13, 0.48, cloth);
    ball("#cca381", 0, 1.97, 0, 0.48, 0.61, 0.47, cloth);
    ball("#544338", 0, 2.19, -0.03, 0.52, 0.29, 0.52, cloth);
    for (let f of [-1, 1])
      ball("#342d26", f * 0.1, 2.03, 0.203, 0.055, 0.048, 0.032, cloth);
    let mouth = box("#885f52", 0, 1.88, 0.215, 0.13, 0.03, 0.025, cloth);
    let limbs = [];
    for (let f of [-1, 1]) {
      let l = grp(f * 0.17, 0.91, 0, cloth);
      box("#49413b", 0, -0.36, 0, 0.24, 0.77, 0.28, l);
      box("#3f342b", 0, -0.78, 0.055, 0.26, 0.24, 0.41, l);
      limbs.push(l);
      let arm = grp(f * 0.4, 1.57, 0, cloth);
      ball(col, 0, -0.21, 0, 0.29, 0.55, 0.35, arm);
      ball("#ba9478", 0, -0.5, 0, 0.19, 0.25, 0.21, arm);
      limbs.push(arm);
    }
    if (!npc) {
      box("#80343b", 0, 1.19, -0.27, 0.78, 1.16, 0.095, cloth);
      box("#b5b2a0", 0.23, 1.1, -0.37, 0.11, 1.46, 0.09, cloth).rotation.z =
        -0.4;
    }
    g.userData = { limbs, mouth, x, z };
    if (npc) people.push(g);
    let where = scene;
    dress(g, cloth, npc ? role : "Knight", () => scene === where);
    return g;
  }
  function prop(a, n) {
    let gold = "#bc9856",
      iron = "#717b7b",
      wood = "#795738";
    if (/kulcs/i.test(n)) {
      let o = new T.Mesh(
        new T.TorusGeometry(0.21, 0.06, 6, 12),
        new T.MeshStandardMaterial({
          color: gold,
          metalness: 0.65,
          roughness: 0.34,
        }),
      );
      o.position.y = 1.35;
      a.add(o);
      box(gold, 0, 0.87, 0, 0.1, 0.59, 0.1, a);
      box(gold, 0.12, 0.65, 0, 0.28, 0.1, 0.1, a);
    } else if (/lámpás/i.test(n)) {
      box(wood, 0, 0.5, 0, 0.16, 1, 0.16, a);
      box("#f8ce88", 0, 1.4, 0, 0.62, 0.78, 0.62, a);
      for (let x of [-0.34, 0.34])
        for (let z of [-0.34, 0.34]) box(wood, x, 1.4, z, 0.08, 0.85, 0.08, a);
      mesh("cone", p[2], 0, 2, 0, 1, 0.46, 1, a);
    } else if (/szelep/i.test(n)) {
      tube(iron, 0, 0.53, 0, 0.44, 1.06, 0.44, a);
      for (let k = 0; k < 6; k++) {
        let v = (k * Math.PI) / 3;
        let m = box(
          "#af6a49",
          Math.cos(v) * 0.36,
          1.16,
          Math.sin(v) * 0.36,
          0.52,
          0.13,
          0.12,
          a,
        );
        m.rotation.y = -v;
      }
      tube("#875541", 0, 1.18, 0, 0.9, 0.1, 0.9, a);
    } else if (/napló|recept/i.test(n)) {
      box(wood, 0, 0.54, 0, 0.8, 1.08, 0.6, a);
      box("#adad8b", 0, 1.17, 0, 0.83, 0.16, 0.65, a);
      box("#76483e", 0, 1.28, 0, 0.85, 0.07, 0.68, a);
      box(gold, 0.21, 1.32, 0, 0.09, 0.02, 0.66, a);
    } else if (/macska/i.test(n)) {
      ball("#bc8053", 0, 0.33, 0, 0.47, 0.56, 0.85, a);
      ball("#c88e61", 0, 0.71, 0.32, 0.5, 0.48, 0.46, a);
      for (let x of [-0.15, 0.15]) {
        mesh("cone", "#bd825d", x, 0.99, 0.33, 0.2, 0.29, 0.18, a);
        ball("#393930", x * 0.7, 0.76, 0.52, 0.055, 0.07, 0.04, a);
      }
      ball("#aa724e", 0, 0.55, -0.43, 0.12, 0.64, 0.12, a);
    } else if (/csomag|láda/i.test(n)) {
      box(wood, 0, 0.48, 0, 1.45, 0.96, 1, a);
      for (let x of [-0.48, 0.48]) {
        box(gold, x, 0.98, 0, 0.13, 0.08, 1.04, a);
        box(gold, x, 0.49, 0.52, 0.13, 0.99, 0.06, a);
      }
      box(gold, 0, 0.69, 0.56, 0.21, 0.24, 0.06, a);
    } else if (/kijárat|Napkapu/.test(n)) {
      for (let x of [-1, 1]) box(p[1], x, 1.5, 0, 0.48, 3, 0.75, a);
      box(p[1], 0, 3, 0, 2.5, 0.45, 0.8, a);
      for (let k = -3; k <= 3; k++)
        tube(iron, k * 0.24, 1.32, 0, 0.1, 2.64, 0.1, a);
      box(gold, 0.48, 1.28, 0.13, 0.26, 0.36, 0.15, a);
    } else if (/virág|gomba|gyökér|fű/.test(n)) {
      for (let j = 0; j < 5; j++) {
        let x = Math.sin(j * 3) * 0.5,
          z = Math.cos(j * 2) * 0.4;
        tube("#60743d", x, 0.34, z, 0.13, 0.68, 0.13, a);
        ball(
          /gomba/.test(n) ? "#bea6a0" : "#c5a2b1",
          x,
          0.7,
          z,
          0.5,
          0.28,
          0.5,
          a,
        );
      }
    } else if (!/sárkány/.test(n)) {
      let k = mesh("cone", "#dfb95e", 0, 1, 0, 0.55, 0.9, 0.55, a);
      k.rotation.z = Math.PI;
      ball("#e2c482", 0, 0.99, 0, 0.36, 0.4, 0.36, a);
    }
  }
  function target(name, x, z, act, kind = "npc") {
    let a =
      kind === "npc"
        ? person(
            x,
            z,
            ["#685368", "#577169", "#826348", "#495e70"][objs.length % 4],
            true,
            /király|lovag|őr|kapitány|Maldrak/i.test(name)
              ? "Knight"
              : /mester|kovács|Gólem|Borin/i.test(name)
                ? "Barbarian"
                : /Morga|szerzetes|hercegnő|Kenji/i.test(name)
                  ? "Mage"
                  : "Rogue",
          )
        : grp(x, 0, z);
    if (kind === "item") prop(a, name);
    if (kind !== "door") sign(name, 0, 2.9, 0, a);
    objs.push({ a, name, act });
  }
  function architecture(g, name) {
    let castle = /kastély|Őrtorony|Királyi|Trónterem|kapu|Börtön|aréna/i.test(
      name,
    );
    if (castle) {
      for (let x of [-4, 4]) {
        tube("#938d7c", x, 3, 3, 1.9, 6, 1.9, g);
        mesh("cone", p[2], x, 7, 3, 2.8, 2.6, 2.8, g);
        for (let y of [2, 4, 5.5]) tube("#aaa493", x, y, 3, 2, 0.18, 2, g);
        box("#3c3d37", x, 4.2, 3.96, 0.25, 1, 0.1, g);
      }
      for (let j = -3; j <= 3; j++) box(p[1], j, 4.4, 3.45, 0.6, 0.85, 0.55, g);
    }
    if (s.z === 1) {
      for (let y of [3.7, 5.3]) {
        let a = mesh(
          "cone",
          "#53474a",
          0,
          y + 0.7,
          0,
          10 - (y - 3.7),
          1.7,
          9 - (y - 3.7),
          g,
        );
        a.rotation.y = Math.PI / 4;
      }
      for (let x of [-3.3, 3.3]) {
        tube("#9e4137", x, 1.6, 4.3, 0.34, 3.2, 0.34, g);
        ball("#da7e65", x, 2.6, 4.5, 0.68, 0.94, 0.68, g);
      }
      box("#963e32", 0, 3.5, 4.3, 8, 0.4, 0.45, g);
    }
    if (/Piac|keresked|bolt|Fogadó|Teaház/i.test(name)) {
      let a = box(p[3], 0, 2.95, 4.65, 5, 0.15, 2.3, g);
      a.rotation.x = 0.13;
      for (let j = -2; j <= 2; j++) {
        let strip = box("#c6b48d", j, 3.02, 4.65, 0.32, 0.13, 2.32, g);
        strip.rotation.x = 0.13;
      }
      for (let j of [-2.4, 2.4])
        tube("#65503b", j, 1.4, 5.7, 0.14, 2.8, 0.14, g);
      for (let x of [-3.3, 3.3]) {
        tube("#795d40", x, 0.65, 4.3, 0.9, 1.3, 0.9, g);
        for (let h of [0.25, 1])
          tube("#4b4941", x, h, 4.3, 0.96, 0.09, 0.96, g);
      }
    }
    if (s.z === 3) {
      for (let j of [-2.8, 2.8]) {
        box("#495e50", j, 2, 3.68, 0.85, 1.6, 0.1, g);
        box("#9a6952", j, 1.05, 3.77, 1.2, 0.33, 0.5, g);
        for (let k = 0; k < 4; k++)
          ball("#a44e44", j + k * 0.18 - 0.25, 1.38, 3.8, 0.27, 0.3, 0.28, g);
      }
    }
  }
  function landscape() {
    // The stream runs between the districts; raised bridges mark the crossings.
    if ([1, 2, 3].includes(s.z)) {
      let lava = s.z === 3;
      let water = box(lava ? "#de5930" : "#547c7b", 0, 0.052, -14, 84, 0.08, 6);
      water.material.roughness = 0.24;
      for (let i = 0; i < 75; i++) {
        let x = rand() * 82 - 41,
          z = -17 + rand() * 6;
        let ripple = box(
          lava ? "#ffad50" : "#91a5a0",
          x,
          0.103,
          z,
          rand() * 2 + 0.2,
          0.025,
          0.11,
        );
        ripple.rotation.y = rand() * 0.6;
      }
      for (let i = 0; i < 17; i++)
        box(
          lava ? "#685044" : "#968b77",
          0,
          0.11,
          -18 + i * 0.5,
          6,
          0.21,
          0.49,
        );
      for (let x of [-3, 3]) {
        for (let k = 0; k < 5; k++)
          box(p[1], x, 0.63, -18 + 2 * k, 0.36, 1.2, 0.4);
        box(p[1], x, 1.13, -14, 0.38, 0.22, 8.5);
      }
    }
    for (let j = 0; j < 20; j++) {
      let x = (j % 2 ? 1 : -1) * (6.5 + rand() * 1.8),
        z = -70 + rand() * 89;
      for (let k = 0; k < 5; k++) {
        let a = mesh(
          "cone",
          "#69775a",
          x + rand() * 0.5,
          0.23,
          z + rand() * 0.7,
          0.2,
          0.55,
          0.2,
        );
        a.rotation.z = rand() * 0.5;
      }
      if (s.z === 1) {
        for (let k = 0; k < 3; k++) {
          let xx = x + rand() * 0.3;
          let h = 2 + rand() * 2;
          tube("#849660", xx, h / 2, z + k * 0.2, 0.14, h, 0.14);
          for (let y = 1; y < h; y += 0.7)
            tube("#5d704b", xx, y, z + k * 0.2, 0.17, 0.075, 0.17);
        }
      }
    }
    if (s.z === 1) {
      for (let x of [-4, 4]) tube("#ab4439", x, 3, -27, 0.57, 6, 0.57);
      box("#a24235", 0, 5, -27, 9, 0.45, 0.45);
      box("#4b4140", 0, 6.2, -27, 11, 0.4, 0.8);
    }
    if (s.z === 4 || s.z === 0) {
      for (let x of [-12, 12, -5, 5]) {
        tube(p[1], x, 8, -77, 6, 16, 6);
        mesh("cone", p[2], x, 19, -77, 7, 7, 7);
        box(p[3], x, 11, -73.9, 1.2, 4, 0.15);
      }
      box(p[1], 0, 7, -80, 25, 14, 6);
    }
    for (let k = 0; k < 16; k++) {
      let x = rand() * 190 - 95,
        y = 28 + rand() * 15,
        z = -88 + rand() * 40;
      ball("#d8d6c9", x, y, z, 12 + rand() * 14, 2 + rand() * 2, 7);
    }
  }
  function furnishings(r) {
    let wood = "#6d513a",
      iron = "#555b58";
    if (/Fegyver|Fegyverterem|Páncél/.test(r)) {
      for (let k = 0; k < 4; k++) {
        let x = -6 + k * 1.5;
        box(wood, x, 1.8, -4.7, 0.8, 3.4, 0.3);
        box("#acb4b3", x, 2.2, -4.45, 0.15, 1.7, 0.08);
        box("#b89763", x, 1.35, -4.45, 0.5, 0.1, 0.16);
        box(wood, x, 1.09, -4.45, 0.14, 0.45, 0.13);
      }
      table(3, 0.8);
    }
    if (/kastély|Királyi|Trónterem|templom|szentély/i.test(r)) {
      box(p[3], 0, 0.09, 0, 2.8, 0.04, 10);
      for (let x of [-7, 7])
        for (let z of [-4, 2]) {
          tube(p[1], x, 2.6, z, 0.8, 5.2, 0.8);
          tube("#ae986a", x, 0.4, z, 1.2, 0.55, 1.2);
          box(p[3], x, 3.9, z + 0.5, 0.9, 2.1, 0.08);
        }
      box("#9b7950", 0, 1, -5, 1.5, 1.8, 1.5);
      box(p[3], 0, 2, -5.6, 1.6, 2.5, 0.3);
    }
    if (/Börtön|pince|laboratórium|Laboratórium|bánya|barlang|aréna/i.test(r)) {
      for (let i = 0; i < 8; i++)
        tube(iron, -8 + i * 0.43, 2, -3, 0.12, 4, 0.12);
      for (let i = 0; i < 8; i++)
        mesh(
          "cone",
          s.z === 3 ? "#e89152" : "#789694",
          5 + rand() * 2,
          0.65,
          -2 + rand() * 2,
          0.8,
          1 + rand() * 2,
          0.8,
        );
    }
    if (/Régi temető/.test(r)) {
      for (let i = 0; i < 6; i++) {
        let x = (i % 2 ? 1 : -1) * 5,
          z = Math.floor(i / 2) * 2 - 3;
        box("#72776b", x, 0.75, z, 0.39, 1.5, 0.4);
        box("#72776b", x, 1.2, z, 1.1, 0.32, 0.4);
      }
    }
    if (/Boszorkány|Laboratórium|kereskedés|Fogadó/.test(r)) {
      for (let x of [-6, 5])
        for (let j = 0; j < 4; j++) {
          let xx = x - 1 + j * 0.55;
          ball(
            ["#668f7b", "#975958", "#70839c"][j % 3],
            xx,
            1.32,
            -4,
            0.32,
            0.48,
            0.32,
          );
          tube("#a0ab8e", xx, 1.62, -4, 0.13, 0.22, 0.13);
        }
    }
    if (/Istálló/.test(r)) {
      for (let k of [-1, 1]) {
        let x = k * 5;
        ball("#845d43", x, 1.3, 1, 1, 1.2, 2.3);
        ball("#855c42", x, 2.05, 2.1, 0.75, 1, 1);
        for (let a of [-0.35, 0.35])
          for (let b of [-0.7, 0.7])
            tube("#594637", x + a, 0.55, 1 + b, 0.23, 1.1, 0.23);
      }
    }
  }

  const openSite =
    /Kőhíd|Lávahíd|Bambuszerdő|Kilátó|Régi temető|Piactér|^Piac$|barlang|bánya|pince|Sárkányfészek|Végső aréna|Városkapu|Nagy kapu/i;
  function landmark(name, g) {
    const wood = "#745a40",
      stone = p[1];
    if (/híd/i.test(name)) {
      let lava = s.z === 3;
      box(lava ? "#de5930" : "#608888", 0, -0.15, 0, 14, 0.3, 7, g);
      for (let j = 0; j < 18; j++) {
        let z = 4.6 - j * 0.54,
          h = 0.12 + 0.24 * Math.sin((j / 17) * Math.PI);
        box(stone, 0, h, z, 4, 0.23, 0.53, g);
        for (let x of [-2, 2]) {
          if (j % 3 === 0) box(stone, x, h + 0.6, z, 0.36, 1.3, 0.4, g);
          box(stone, x, h + 1.1, z, 0.35, 0.2, 0.56, g);
        }
      }
    } else if (/Bambusz|Kilátó/.test(name)) {
      for (let k = 0; k < 46; k++) {
        let x = (k % 2 ? 1 : -1) * (2 + rand() * 5),
          z = rand() * 11 - 5,
          h = 2 + rand() * 4;
        tube("#728653", x, h / 2, z, 0.17, h, 0.17, g);
        for (let j = 1; j < h; j += 0.8)
          tube("#516742", x, j, z, 0.21, 0.085, 0.21, g);
        for (let t = 0; t < 3; t++) {
          let leaf = ball(
            "#82945d",
            x + 0.25,
            h - 0.45 * t,
            z,
            0.94,
            0.17,
            0.33,
            g,
          );
          leaf.rotation.z = 0.3;
        }
      }
      if (/Kilátó/.test(name)) {
        box(wood, 0, 2, -2, 4, 0.25, 3, g);
        for (let x of [-1.8, 1.8])
          for (let z of [-3, -1]) box(wood, x, 1, z, 0.3, 2, 0.3, g);
      }
    } else if (/barlang|bánya|pince/i.test(name)) {
      for (let j = 0; j < 36; j++) {
        let rad = 2.25 + rand() * 0.7,
          ang = (j / 35) * Math.PI;
        ball(
          "#706c61",
          Math.cos(ang) * rad,
          Math.sin(ang) * rad + 0.2,
          -1 - rand() * 3,
          1.8,
          1.7,
          2.5,
          g,
        );
      }
      for (let z of [1, -1, -3]) {
        for (let x of [-1.8, 1.8]) box(wood, x, 1.4, z, 0.32, 2.8, 0.32, g);
        box(wood, 0, 2.9, z, 4.2, 0.4, 0.4, g);
      }
      for (let x of [-0.65, 0.65]) box("#65605a", x, 0.15, 0, 0.13, 0.16, 8, g);
      for (let z = -4; z < 4; z++) box(wood, 0, 0.08, z, 1.8, 0.12, 0.22, g);
    } else if (/temető/.test(name)) {
      for (let j = 0; j < 10; j++) {
        let x = (j % 2 ? 1 : -1) * (2 + (j % 3)),
          z = Math.floor(j / 2) * 1.8 - 4;
        box("#747a70", x, 0.4, z, 1.3, 0.6, 1.6, g);
        ball("#84867a", x, 1.13, z - 0.6, 0.9, 1.3, 0.32, g);
        box("#555e53", x, 1.22, z - 0.42, 0.13, 0.65, 0.06, g);
        box("#555e53", x, 1.3, z - 0.42, 0.45, 0.11, 0.06, g);
      }
    } else if (/Piac/.test(name)) {
      for (let x of [-4, 4]) {
        for (let z of [-3, 0])
          for (let a of [-1.4, 1.4])
            tube(wood, x + a, 1.45, z, 0.13, 2.9, 0.13, g);
        box(wood, x, 0.95, -1.5, 3, 0.23, 2.6, g);
        for (let j = 0; j < 8; j++)
          box(
            j % 2 ? p[3] : "#d7be90",
            x - 1.6 + j * 0.45,
            3,
            -1.5,
            0.46,
            0.2,
            3.5,
            g,
          );
        for (let j = 0; j < 14; j++)
          ball(
            j % 2 ? "#aa6642" : "#91a15f",
            x + rand() * 2.4 - 1.2,
            1.2,
            -2 + rand(),
            0.32,
            0.35,
            0.3,
            g,
          );
      }
    } else if (/kapu/i.test(name)) {
      for (let x of [-3.8, 3.8]) {
        tube(stone, x, 3.2, -2, 3.8, 6.4, 3.8, g);
        mesh("cone", p[2], x, 7.9, -2, 4.8, 3.1, 4.8, g);
        box(p[3], x, 4.4, 0.05, 0.8, 2, 0.13, g);
      }
      box(stone, 0, 4.8, -2, 6, 1.6, 2, g);
      for (let j = -3; j < 4; j++) box(stone, j, 5.9, -2, 0.5, 0.7, 2, g);
    } else {
      for (let j = 0; j < 24; j++) {
        let a = (j / 24) * Math.PI * 2;
        ball(
          p[2],
          Math.cos(a) * 6,
          0.75,
          Math.sin(a) * 5,
          1.5,
          1.5 + rand(),
          1.6,
          g,
        );
      }
      for (let k = 0; k < 8; k++) {
        let a = (k * Math.PI) / 4;
        mesh(
          "cone",
          "#8b7584",
          Math.cos(a) * 5.4,
          1.7,
          Math.sin(a) * 4.5,
          1,
          3,
          1,
          g,
        );
      }
    }
  }

  function house(name, i) {
    let [x, z] = pos(i),
      g = grp(x, 0, z);
    g.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    if (openSite.test(name)) {
      landmark(name, g);
      sign(name, 0, 3.5, 4, g);
      target(name, x - Math.sign(x) * 4.5, z, () => api.room(name), "door");
      return;
    }
    let c = p[1],
      wood = "#584634";
    box(c, 0, 2, 0, 8, 4, 7, g);
    let roof = mesh("cone", p[2], 0, 5.5, 0, 9, 3.2, 8.5, g);
    roof.rotation.y = Math.PI / 4;
    for (let a of [-3.85, -2, 2, 3.85]) box(wood, a, 2, 3.52, 0.18, 4, 0.13, g);
    for (let y of [0.35, 2.8, 3.9]) box(wood, 0, y, 3.54, 8, 0.16, 0.16, g);
    box(wood, 0, 1.25, 3.57, 1.6, 2.5, 0.18, g);
    for (let a of [-2.9, 2.9]) {
      box("#414c49", a, 1.8, 3.6, 1.1, 1.15, 0.13, g);
      box(wood, a, 1.8, 3.71, 0.08, 1.2, 0.1, g);
      box(wood, a, 1.8, 3.71, 1.2, 0.08, 0.1, g);
    }
    box("#c7aa77", 0.55, 1.1, 3.7, 0.12, 0.12, 0.12, g);
    box("#846b55", 2.6, 5, -1, 0.8, 2.8, 0.8, g);
    sign(name, 0, 3.2, 3.9, g);
    architecture(g, name);
    walls.push([x, z, 4, 4.2]);
    target(name, x - Math.sign(x) * 4.5, z, () => api.room(name), "door");
  }
  function table(x, z) {
    box("#846647", x, 1, z, 2.8, 0.2, 1.2);
    for (let a of [-1, 1])
      for (let b of [-0.4, 0.4])
        box("#674d35", x + a, 0.5, z + b, 0.18, 1, 0.18);
  }
  function room() {
    const r = s.room;
    if (openSite.test(r)) {
      box(p[0], 0, -0.3, 0, 55, 0.5, 50);
      landmark(r, parent);
      sign(r, 0, 4, -5);
    } else {
      box(p[1], 0, 2.9, -7, 18, 5.8, 0.4);
      for (let x of [-9, 9]) box(p[1], x, 2.9, 0, 0.35, 5.8, 14);
      for (let x of [-8, -4, 0, 4, 8])
        box("#604d3a", x, 2.9, -6.7, 0.3, 5.8, 0.3);
      for (let i = 0; i < 13; i++)
        box(i % 2 ? "#87735b" : "#927d62", 0, 0.01, i - 6, 18, 0.1, 0.97);
      sign(r, 0, 4.8, -6.6);
      for (let x of [-6, 5]) {
        table(x, -4);
        for (let j = 0; j < 3; j++) {
          box("#66523e", x, 1.7 + j, -6, 3, 0.13, 1);
          for (let b = 0; b < 7; b++)
            box(
              ["#653f3e", "#53665e", "#917856"][b % 3],
              x - 1.2 + b * 0.39,
              2 + j,
              -6,
              0.28,
              0.48 + rand() * 0.16,
              0.57,
            );
        }
      }
      if (/Kovács/.test(r)) {
        box("#494642", -5, 0.8, 1, 1, 1.5, 1);
        box("#686963", -5, 1.6, 1, 2, 0.4, 0.8);
        box("#654628", -5, 1.9, 1, 1, 0.1, 0.13);
        box("#545656", -5.4, 1.9, 1, 0.3, 0.32, 0.3);
        box("#705143", 6, 1.4, 0, 2.8, 2.8, 2);
        ball("#f48435", 6, 1.25, 1, 1.7, 1.65, 0.3);
      }
      if (/lakosztály|Faház|Lakóház/.test(r)) {
        box("#53443e", 5, 0.5, 1, 3, 1, 4);
        box("#964c59", 5, 1.05, 1, 3, 0.2, 4);
        ball("#dad0b8", 5, 1.28, -0.4, 2.2, 0.35, 0.9);
      }
      if (/Fogadó|Teaház/.test(r)) {
        table(-4, 1);
        for (let x of [-5, -3]) box("#694f36", x, 0.5, 2, 1, 1, 1);
        target("Vendég", -5, 1, () =>
          api.chat(
            "Egy tál levesért és egy jó történetért mindig visszatérek ide.",
            "Vendég",
          ),
        );
      }
    }
    target("Vissza: " + zones[s.z].hub, 0, 6, () => api.room(""), "door");
    sign("Kijárat", 0, 2, 6);
    if (!openSite.test(r)) furnishings(r);
    api.populate(target);
    if (r === "Sárkányfészek" || r === "Végső aréna") {
      dragon = grp(r === "Sárkányfészek" ? 0 : 4, 0, -2);
      ball("#624350", 0, 1.4, 0, 2.4, 2, 3.7, dragon);
      dragon.userData.w = [];
      for (let k of [-1, 1]) {
        let w = grp(k * 0.8, 1.9, 0, dragon);
        mesh("cone", "#794656", k * 1.25, 0, 0, 3.2, 0.3, 2.8, w);
        dragon.userData.w.push(w);
      }
      dragon.userData.head = ball("#80505b", 0, 2, 1.6, 1.3, 1.3, 1.8, dragon);
      dragon.userData.tail = mesh(
        "cone",
        "#624350",
        0,
        1,
        -2.3,
        0.7,
        3,
        0.8,
        dragon,
      );
      dragon.userData.tail.rotation.x = -1.2;
      for (let k of [-1, 1]) {
        mesh("cone", "#c3ac89", k * 0.4, 2.8, 1.4, 0.36, 0.8, 0.36, dragon);
        ball("#ccab66", k * 0.53, 2.25, 1.95, 0.2, 0.17, 0.18, dragon);
        for (let z of [-0.8, 0.8]) {
          ball("#533b48", k * 0.8, 0.72, z, 0.62, 1, 0.68, dragon);
          for (let j = 0; j < 3; j++)
            mesh(
              "cone",
              "#b3a38b",
              k * 0.8 + j * 0.13 - 0.13,
              0.17,
              z + 0.22,
              0.12,
              0.22,
              0.3,
              dragon,
            );
        }
      }
      for (let j = 0; j < 5; j++)
        mesh(
          "cone",
          "#ac927b",
          0,
          2.3 - j * 0.1,
          1 - j * 0.55,
          0.3,
          0.55,
          0.35,
          dragon,
        );
    }
  }
  function load() {
    if (scene)
      scene.traverse((o) => {
        if (o.isSprite) {
          o.material.map.dispose();
          o.material.dispose();
        }
        if (o.isPoints) {
          o.material.dispose();
          o.geometry.dispose();
        }
        if (o.userData.batch) o.geometry.dispose();
      });
    scene = new T.Scene();
    p = pal[s.z];
    seed = 56 + s.z;
    scene.background = new T.Color(p[4]);
    scene.fog = new T.FogExp2(p[4], s.z === 2 ? 0.033 : 0.012);
    parent = scene;
    objs = [];
    people = [];
    walls = [];
    flags = [];
    dragon = null;
    particles = null;
    scene.add(new T.HemisphereLight("#fff2da", "#8c826a", 2));
    light = new T.DirectionalLight("#ffe0ab", 2.4);
    light.position.set(-24, 36, 20);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    Object.assign(light.shadow.camera, {
      left: -45,
      right: 45,
      top: 50,
      bottom: -50,
    });
    light.shadow.camera.updateProjectionMatrix();
    scene.add(light);
    if (s.room) room();
    else {
      box(p[0], 0, -0.4, -30, 250, 0.7, 250);
      box("#ad9d84", 0, -0.03, -26, 16, 0.09, 112);
      for (let i = 0; i < 400; i++)
        box(
          i % 2 ? "#a59680" : "#b5a68f",
          rand() * 15 - 7.5,
          0.024,
          rand() * 97 - 75,
          0.5 + rand(),
          0.03,
          0.3 + rand() * 0.5,
        );
      zones[s.z].rooms.forEach(house);
      landscape();
      for (let i = 0; i < 60; i++) {
        let x = (i % 2 ? 1 : -1) * (20 + rand() * 48),
          z = rand() * 120 - 86,
          h = 3 + rand() * 4;
        tube("#614b36", x, h * 0.38, z, 0.5, h * 0.76, 0.5);
        for (let j = 0; j < 4; j++)
          ball(
            s.z === 1 ? "#d693a6" : p[0],
            x + rand() * 2 - 1,
            h + rand() * 2,
            z + rand(),
            3 + rand() * 3,
            3 + rand() * 3,
            4,
          );
      }
      for (let i = 0; i < 15; i++) {
        let x = (i - 7) * 8;
        mesh("cone", p[2], x, 3, -88 - rand() * 10, 24, 18 + rand() * 18, 27);
      }
      for (let x of [-7, 7]) {
        tube(p[1], x, 5, -75, 5, 10, 5);
        mesh("cone", p[2], x, 12, -75, 6, 5, 6);
        box(p[1], 0, 6, -75, 12, 3, 2);
      }
      for (let i = 0; i < 5; i++) {
        let x = i % 2 ? 6 : -6,
          z = 8 - i * 15;
        target(
          ["Városőr", "Utazó", "Falusi", "Vándor lovag", "Hírnök"][i],
          x,
          z,
          () =>
            api.chat(
              [
                "A cégtáblákról felismered a házakat.",
                "A naplóban megtalálod a következő célodat.",
                "A környéken akad fizetett munka.",
                "Párbaj előtt érdemes páncélt ölteni.",
                "A haladásodat útközben is feljegyezzük.",
              ][i],
            ),
        );
        people.at(-1).userData.walk = true;
        tube("#735d45", x, 2, z - 3, 0.13, 4, 0.13);
        flags.push(box(p[3], x + 0.5, 3.4, z - 3, 1.1, 1.2, 0.07));
      }
    }
    // Batch stationary architecture by material; moving actors remain articulated.
    let batches = new Map();
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh || flags.includes(o)) return;
      for (let n = o; n; n = n.parent)
        if (people.includes(n) || n === dragon || objs.some((v) => v.a === n))
          return;
      let arr = batches.get(o.material) || [];
      arr.push(o);
      batches.set(o.material, arr);
    });
    for (let [m, arr] of batches) {
      let gs = arr.map((o) => o.geometry.clone().applyMatrix4(o.matrixWorld));
      let merged = mergeGeometries(gs);
      gs.forEach((g) => g.dispose());
      arr.forEach((o) => o.removeFromParent());
      let b = new T.Mesh(merged, m);
      b.userData.batch = true;
      b.castShadow = b.receiveShadow = true;
      scene.add(b);
    }
    if (!s.room) {
      let a = new Float32Array(180 * 3);
      for (let i = 0; i < a.length; i += 3) {
        a[i] = rand() * 50 - 25;
        a[i + 1] = rand() * 12;
        a[i + 2] = rand() * 95 - 76;
      }
      let geom = new T.BufferGeometry();
      geom.setAttribute("position", new T.BufferAttribute(a, 3));
      particles = new T.Points(
        geom,
        new T.PointsMaterial({
          color: ["#f6e3a2", "#ffbdce", "#b7d9a4", "#ff9a49", "#b9b1c9"][s.z],
          size: s.z === 1 ? 0.14 : 0.075,
          transparent: true,
          opacity: 0.77,
        }),
      );
      scene.add(particles);
    }
    let active = objs.find((o) => o.name === api.goal());
    if (active) {
      let pin = mesh("cone", "#f2bf65", 0, 3.85, 0, 0.47, 0.65, 0.47, active.a);
      pin.rotation.z = Math.PI;
      active.a.userData.pin = pin;
    }
    hero = person(s.x, s.y, "#515a59", false);
    hero.rotation.y = Math.PI;
    angle = 0;
    cam.position.set(s.x, 4, s.y + 6);
    near = null;
  }
  load();
  let drag = null;
  ren.domElement.onpointerdown = (e) => {
    drag = e.clientX;
    ren.domElement.setPointerCapture(e.pointerId);
  };
  ren.domElement.onpointermove = (e) => {
    if (drag !== null) {
      angle -= (e.clientX - drag) * 0.009;
      drag = e.clientX;
    }
  };
  ren.domElement.onpointerup = () => (drag = null);
  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));
  window.addEventListener("blur", () => (keys = {}));
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    if (!api.paused()) {
      s.secs += dt;
      angle += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * dt * 2;
      let f =
          (keys.KeyW || keys.ArrowUp ? 1 : 0) -
          (keys.KeyS || keys.ArrowDown ? 1 : 0),
        h = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0),
        v = ((keys.ShiftLeft ? 8 : 5) * dt) / Math.max(1, Math.hypot(f, h));
      let dx = (h * Math.cos(angle) - f * Math.sin(angle)) * v,
        dz = (-f * Math.cos(angle) - h * Math.sin(angle)) * v;
      function ok(x, z) {
        return s.room
          ? Math.abs(x) < 8.5 && Math.abs(z) < 6.7
          : Math.abs(x) < 26 &&
              z < 23 &&
              z > -73 &&
              !walls.some(
                ([a, b, w, h]) =>
                  Math.abs(x - a) < w + 0.3 && Math.abs(z - b) < h + 0.3,
              );
      }
      if (ok(s.x + dx, s.y)) s.x += dx;
      if (ok(s.x, s.y + dz)) s.y += dz;
      hero.position.set(s.x, 0, s.y);
      pose(hero, f || h ? "Walking_A" : "Idle", dt);
      if (f || h) hero.rotation.y = Math.atan2(dx, dz);
      hero.userData.limbs.forEach(
        (l, i) =>
          (l.rotation.x =
            f || h
              ? Math.sin(time * 10) * (i === 0 || i === 3 ? 1 : -1) * 0.6
              : 0),
      );
      near = objs
        .map((o) => [o, Math.hypot(o.a.position.x - s.x, o.a.position.z - s.y)])
        .sort((a, b) => a[1] - b[1])[0];
      if (near?.[1] > 3) near = null;
      api.prompt(near?.[0].name);
      cam.position.lerp(
        new T.Vector3(
          s.x + Math.sin(angle) * 4.4,
          3.2,
          s.y + Math.cos(angle) * 4.4,
        ),
        0.14,
      );
      cam.lookAt(s.x, 1.55, s.y);
    }
    if (api.paused()) pose(hero, "Idle", dt);
    for (let g of people) {
      pose(
        g,
        api.paused() && g.position.distanceTo(hero.position) < 4
          ? "Interact"
          : g.userData.walk
            ? "Walking_A"
            : "Idle",
        dt,
      );
      let d = g.userData;
      if (d.walk) {
        g.position.z = d.z + Math.sin(time * 0.45 + d.z) * 2;
        d.limbs[0].rotation.x = Math.sin(time * 4) * 0.38;
        d.limbs[2].rotation.x = -d.limbs[0].rotation.x;
      }
      if (g.position.distanceTo(hero.position) < 5) g.lookAt(hero.position);
      d.limbs[1].rotation.x = 0.28 * Math.sin(time * 2 + d.x);
      d.mouth.scale.y = 0.03 + 0.013 * Math.sin(time * 8);
    }
    flags.forEach((f, i) => (f.rotation.y = 0.25 * Math.sin(time * 3 + i)));
    if (dragon) {
      dragon.position.y = 0.6 + 0.6 * Math.sin(time);
      dragon.userData.w.forEach(
        (w, i) => (w.rotation.z = Math.sin(time * 4) * (i ? 1 : -1) * 0.55),
      );
      dragon.userData.head.rotation.y = Math.sin(time) * 0.4;
      dragon.userData.tail.rotation.z = Math.sin(time * 2) * 0.4;
    }
    if (particles) {
      let a = particles.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) + dt * (s.z === 3 ? 0.75 : -0.42);
        a.setY(i, y < 0 ? 12 : y > 12 ? 0 : y);
      }
      a.needsUpdate = true;
      particles.position.x = Math.sin(time * 0.45) * 0.6;
    }
    light.intensity = 2 + 0.45 * Math.cos(time / 50);
    let w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (
      ren.domElement.width !== Math.floor(w * ren.getPixelRatio()) ||
      ren.domElement.height !== Math.floor(h * ren.getPixelRatio())
    ) {
      ren.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    for (let { a } of objs)
      if (a.userData.pin) {
        a.userData.pin.position.y = 3.8 + 0.13 * Math.sin(time * 3);
        a.userData.pin.rotation.y = time;
      }
    ren.render(scene, cam);
  }
  requestAnimationFrame(frame);
  return {
    load,
    action: (name) => pose(hero, name, 0, true),
    interact: () => near?.[0].act(),
    marker: () => objs.find((o) => o.name === api.goal())?.a.position,
  };
}
