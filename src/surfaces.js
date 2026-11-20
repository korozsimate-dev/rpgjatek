import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
const maps = {};
export function surface(kind) {
  if (maps[kind]) return maps[kind];
  let cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  let g = cv.getContext("2d"),
    seed = 76,
    r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  g.fillStyle = "#dedbd3";
  g.fillRect(0, 0, 128, 128);
  if (kind === "stone") {
    for (let j = 0; j < 5; j++)
      for (let k = -1; k < 5; k++) {
        let v = 216 + r() * 33;
        g.fillStyle = `rgb(${v},${v - 1},${v - 3})`;
        g.fillRect(k * 32 + (j % 2) * 16 + 1, j * 32 + 1, 30.5, 30.5);
      }
  } else if (kind === "timber") {
    for (let j = 0; j < 80; j++) {
      g.strokeStyle = `rgba(80,65,48,${r() * 0.14})`;
      let y = r() * 128;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(35, y - 3, 90, y + 4, 128, y);
      g.stroke();
    }
  }
  for (let j = 0; j < 9000; j++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "65,64,59"},${r() * 0.13})`;
    g.fillRect(r() * 128, r() * 128, 1 + r(), 1);
  }
  let t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(kind === "stone" ? 2 : 1, 2);
  return (maps[kind] = t);
}
