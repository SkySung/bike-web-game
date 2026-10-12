// 道路與場景物件（依 engine.js 的賽道展開）

// ─────────────────────────── 道路與場景物件 ───────────────────────────
// 道路以每 1 公尺一格的曲率/坡度表示（engine.js），物件用 (s 沿路距離, d 橫向偏移) 擺放
function buildRoad(c) {
  const sc = SCENES[c.scene];
  const tr = E.buildTrack(E.TRACKS[c.track], DRAW + 40);
  c.goal = tr.len;
  const map = [{ x: 0, y: 0 }];
  let mx = 0, my = 0;
  for (let i = 0; i < tr.len; i++) { mx += Math.sin(tr.hd[i + 1]); my -= Math.cos(tr.hd[i + 1]); map.push({ x: mx, y: my }); }
  const nearCurve = (s, pad = 12) => tr.curves.some(cv => s > cv.s - pad && s < cv.s + cv.n + pad);

  let seed = 1000 + c.id * 77; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const side = () => (rnd() < 0.5 ? -1 : 1);
  const flowerC = () => ['#F28DA6', '#F4C542', '#FFFFFF', '#B79CE8'][Math.floor(rnd() * 4)];
  const sp = [], zones = [], hazards = [];
  const end = c.goal + DRAW, h = sc.half;

  if (c.scene === 'yard') {
    for (let s = -8; s < end; s += 2) { sp.push({ t: 'fence', s, len: 2, d: -(h + 2), L: 1 }); sp.push({ t: 'fence', s, len: 2, d: h + 2, L: 1 }); }
    for (let s = -6; s < end; s += 2.6) if (rnd() < 0.7) sp.push({ t: 'tree', s: s + rnd() * 2, d: side() * (h + 4 + rnd() * 9), r: 0.8 + rnd() * 0.6, L: 0 });
    for (let s = 2; s < end; s += 3) if (rnd() < 0.5) sp.push({ t: 'flower', s: s + rnd() * 2, d: side() * (h + 0.6 + rnd() * 1.1), c: flowerC(), L: 2 });
    for (let m = 10; m < c.goal; m += 10) sp.push({ t: 'post', s: m, d: h + 0.8, label: m + 'm', L: 2 });
  } else if (c.scene === 'street' || c.scene === 'city') {
    const cols = ['#F4C542', '#E98A6B', '#7FB3A8', '#C9D6E8', '#F2A7A0', '#EFE3C8'];
    for (const dir of [1, -1]) {
      const d = sc.off + dir * (h + sc.side.w + 0.2);
      let s = -8;
      while (s < end) {
        const len = 8 + rnd() * 6;
        if (!nearCurve(s) && !nearCurve(s + len)) sp.push({ t: 'wall', s, len, d, dir, h: 5 + rnd() * 6, c: cols[Math.floor(rnd() * cols.length)], L: 1 });
        s += len + 1.5 + rnd() * 2.5;
      }
    }
    for (let s = 6; s < end; s += 16) if (!nearCurve(s, 4)) sp.push({ t: 'lamp', s, d: sc.off + h + 1.6, L: 2 });
    for (let s = 12; s < end; s += 14) if (!nearCurve(s, 4)) sp.push({ t: 'tree', s, d: sc.off - h - 1.3, r: 0.55, L: 2 });
    if (c.stops) c.stops.forEach((z, i) => {
      sp.push({ t: 'sign', s: z + ZONE, d: sc.off + h + 0.9, i, L: 2 });
      sp.push({ t: 'paint', s: z + 3.5, d: 0, i, L: 0 });
    });
    if (c.lights) c.lights.forEach((z, i) => sp.push({ t: 'tlight', s: z, d: h + 0.7, i, L: 2 }));
    if (c.parked) {
      for (let s = c.parked[0]; s <= c.parked[1]; s += 6.5) sp.push({ t: 'car', s, d: 3.5, door: Math.abs(s - c.door) < 3.3, c: cols[Math.floor(rnd() * cols.length)], L: 2 });
    }
  } else if (c.scene === 'park') {
    for (let s = -6; s < end; s += 1.8) if (rnd() < 0.75) sp.push({ t: 'tree', s: s + rnd() * 1.5, d: side() * (h + 2.1 + rnd() * 12), r: 0.8 + rnd() * 0.7, L: 0 });
    for (let s = 0; s < end; s += 2) if (rnd() < 0.6) sp.push({ t: 'flower', s: s + rnd() * 2, d: side() * (h + 0.7 + rnd() * 1.6), c: flowerC(), L: 0 });
    for (let s = 30; s < c.goal; s += 45) sp.push({ t: 'bench', s, d: side() * (h + 0.9), L: 0 });
  } else if (c.scene === 'hills') {
    for (let s = -8; s < end; s += 2) { sp.push({ t: 'fence', s, len: 2, d: -(h + 2.5), L: 1 }); sp.push({ t: 'fence', s, len: 2, d: h + 2.5, L: 1 }); }
    for (let s = -6; s < end; s += 3.5) if (rnd() < 0.6) sp.push({ t: 'tree', s: s + rnd() * 2, d: side() * (h + 4.5 + rnd() * 12), r: 0.9 + rnd() * 0.7, L: 0 });
    for (let s = 0; s < end; s += 3) if (rnd() < 0.4) sp.push({ t: 'flower', s: s + rnd() * 2, d: side() * (h + 0.7 + rnd() * 1.4), c: flowerC(), L: 2 });
    // 坡度牌：坡度明顯改變的地方
    let prev = 0;
    for (let i = 0; i < tr.len; i++) {
      const g = tr.gr[i];
      if (Math.abs(g - prev) > 0.03 && Math.abs(g) >= 0.05) sp.push({ t: 'grade', s: Math.max(2, i - 8), d: h + 0.9, g, L: 2 });
      prev = g;
    }
    // 下坡彎道限速
    for (const cv of tr.curves) if (cv.g < 0 || tr.gr[cv.s - 5] < 0) {
      zones.push({ s0: cv.s - 10, s1: cv.s + cv.n, lim: 15 });
      sp.push({ t: 'limit', s: cv.s - 16, d: h + 0.9, lim: 15, L: 2 });
    }
  } else if (c.scene === 'night') {
    for (let s = 8; s < end; s += 22) sp.push({ t: 'lamp', s, d: h + 1.2, L: 2 });
    for (let s = -6; s < end; s += 3) if (rnd() < 0.6) sp.push({ t: 'tree', s: s + rnd() * 2, d: side() * (h + 3 + rnd() * 10), r: 0.9 + rnd() * 0.6, L: 0 });
    for (let s = 36; s < c.goal - 10; s += 13 + rnd() * 9) {
      const hz = { s, d: (rnd() * 2 - 1) * 2.2, k: rnd() < 0.6 ? 'puddle' : 'manhole' };
      hazards.push(hz);
      sp.push({ t: hz.k, s: hz.s, d: hz.d, L: 0 });
    }
  }
  // 彎道提示：彎道前一塊預告牌（箭頭 + 建議速度），彎道外側每 3 公尺一塊黃黑轉彎箭頭牌
  if (['park', 'hills', 'night'].includes(c.scene)) {
    for (const cv of tr.curves) {
      // 建議速度：用約 17° 的舒服傾角過這個彎的速度，取到 5 的倍數
      const vRec = Math.floor(Math.sqrt(9.8 * cv.R * Math.tan(0.3)) * 3.6 / 5) * 5;
      sp.push({ t: 'curve', s: Math.max(2, cv.s - 16), d: h + 0.9, dir: cv.dir, vRec, L: 2 });
      for (let q = 2; q < cv.n - 1; q += 3) sp.push({ t: 'chevron', s: cv.s + q, d: -cv.dir * (h + 0.7), dir: cv.dir, L: 2 });
    }
  }
  sp.push({ t: 'banner', s: c.goal, d: 0, L: 2 });
  // 過濾掉位置不合理的路邊物件（樹、花、長椅）：
  // 1. 放在彎道內側、偏移超過彎道半徑六成的：(s, d) 的投影在那裡會亂跳，甚至跑到路的另一邊
  // 2. 換算成實際位置後，離任何一段路太近的：例如髮夾彎另一側的路
  const world = [];
  { let wx = 0, wy = 0; for (let i = 0; i < tr.k.length; i++) { world.push([wx, wy, tr.hd[i]]); wx += Math.sin(tr.hd[i + 1]); wy -= Math.cos(tr.hd[i + 1]); } }
  const tooClose = (o, clear) => {
    if (o.s < 0 || !tr.curves.length) return false;
    const reach = Math.abs(o.d) + 4;
    let kIn = 0;
    for (let i = Math.max(0, Math.floor(o.s - reach)); i <= Math.floor(o.s + reach); i++) {
      const k = tr.k[i] || 0;
      if (Math.sign(k) === Math.sign(o.d)) kIn = Math.max(kIn, Math.abs(k));
    }
    if (kIn && Math.abs(o.d) > 0.6 / kIn) return true;
    const w = world[Math.min(world.length - 1, Math.floor(o.s))];
    const px = w[0] + o.d * Math.cos(w[2]), py = w[1] + o.d * Math.sin(w[2]);
    for (let i = 0; i < world.length; i += 1) {
      const dx = world[i][0] - px, dy = world[i][1] - py;
      if (dx * dx + dy * dy < (h + clear) ** 2) return true;
    }
    return false;
  };
  // 只過濾隨機散布的風景（L = 0 的樹、花、長椅）；刻意擺在人行道上的行道樹不動
  const scenic = o => ['flower', 'bench'].includes(o.t) || (o.t === 'tree' && o.L === 0);
  const filtered = sp.filter(o => !(scenic(o) && tooClose(o, o.t === 'tree' ? 2 : 0.5)));
  return { ...tr, sp: filtered, map, zones, hazards };
}
const ROADS = CH.map(buildRoad);
const kAt = (road, i) => E.segAt(road.k, i);
