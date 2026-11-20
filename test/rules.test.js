import test from "node:test";
import assert from "node:assert/strict";
import { zones, goods, fresh, buy, use } from "../src/data.js";
test("Every objective, merchant errand and return trip names a real room", () => {
  assert.equal(zones.length, 5);
  for (let z of zones) {
    assert.equal(z.rooms.length, new Set(z.rooms).size);
    for (let [r, n, t, action] of z.steps) {
      assert.ok(z.rooms.includes(r));
      assert.ok(n && t && action);
    }
    assert.ok(z.side.length >= 2);
    for (let [r, n, l, g] of z.side) {
      assert.ok(z.rooms.includes(r) && z.rooms.includes(l) && n && g);
    }
  }
});
test("Each purchase is atomic and each item is usable", () => {
  for (let i = 0; i < goods.length; i++) {
    let s = fresh();
    s.gold = goods[i][1] - 1;
    let before = structuredClone(s);
    assert.ok(!buy(s, i));
    assert.deepEqual(s, before);
    s.gold++;
    assert.ok(buy(s, i));
    assert.equal(s.gold, 0);
    let count = s.bag[i];
    s.hp = s.mp = 1;
    use(s, i);
    if (i < 4) assert.equal(s.weapon, i);
    else if (i < 8) assert.equal(s.armor, i);
    else {
      assert.equal(s.bag[i], count - 1);
      assert.ok(s.hp > 1 || s.mp > 1 || s.buff || s.ward);
    }
    assert.deepEqual(s, JSON.parse(JSON.stringify(s)));
  }
});
