// 世界繪製：道路、場景物件、腳踏車、夜晚效果

// ─────────────────────────── 繪圖工具 ───────────────────────────
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function line(pts, w, col) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
function poly(pts, col) {
  ctx.beginPath(); ctx.moveTo(pts[0].x ?? pts[0][0], pts[0].y ?? pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x ?? pts[i][0], pts[i].y ?? pts[i][1]);
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}
function quad(x1, y1, w1, x2, y2, w2, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x1 - w1, y1); ctx.lineTo(x1 + w1, y1); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2 - w2, y2);
  ctx.closePath(); ctx.fill();
}
// 道路上的一段橫向色塊：u0..u1 是相對道路中心的橫向公尺
function band(xa, ya, sa, xb, yb, sb, u0, u1, col) {
  poly([[xa + u0 * sa, ya], [xa + u1 * sa, ya], [xb + u1 * sb, yb], [xb + u0 * sb, yb]], col);
}

// ─────────────────────────── 偽 3D 投影 ───────────────────────────
// 鏡頭邏輯在 camera.js：鏡頭沿著道路方向看、只在橫向跟隨車子；這裡只負責把它接到畫面上
let V = null;
function layout(camH = CAM_H) {
  // 直向畫面窄又長：地平線上移、主角放低，前方的路才夠長
  const portrait = H > W * 1.1;
  // 攝影機升高時地平線也稍微往上移，下方多一點空間看下坡
  const hor = Math.round(H * ((portrait ? 0.3 : 0.4) - 0.025 * (camH - CAM_H)));
  const baseY = Math.max(hor + 60, H * (portrait ? 0.8 : 0.88));
  // 直向時限制主角附近每公尺的像素（約 7 公尺寬塞滿畫面），用把攝影機拉高來讓主角仍站在 baseY
  if (portrait) camH = Math.max(camH, (baseY - hor) / (W / 7));
  // 主角固定在 baseY：攝影機越高，焦距越短，主角就越小
  return { hor, baseY, camH, F: (baseY - hor) * CAM_D / camH };
}
function buildView(st) {
  const camH = st.camH ?? BikeCamera.height(cam, CAM);
  const L = layout(camH);
  const camX = st.camX ?? (cam.x + cam.shift);
  const camYaw = st.camYaw ?? cam.yaw;
  const { P, base, n } = BikeCamera.points(ROADS[S.ch], st.x, camX, CAM, camYaw);
  V = { ...L, W, P, base, n, st, camYaw, clip: new Array(n + 1).fill(H), glows: [] };
  const b = projAt(st.x, st.d, 0);
  V.bike = b ? { x: b.x, y: b.y, sc: b.sc, zc: b.zc } : { x: W / 2, y: L.baseY, sc: L.F / CAM_D, zc: CAM_D };
}
const projAt = (s, d, h = 0) => BikeCamera.project(V, s, d, h, CAM);
const clipFor = s => V.clip[Math.floor(s - V.base) + 1] ?? H;

// ─────────────────────────── 世界繪製 ───────────────────────────
function drawSky(st, sc) {
  const road = ROADS[S.ch], { hor } = V;
  const g = ctx.createLinearGradient(0, 0, 0, hor);
  g.addColorStop(0, sc.sky[0]); g.addColorStop(1, sc.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hor + 1);
  // 遠方的山和天空跟著鏡頭實際看的方向轉（道路方向 + 轉彎鏡頭的偏轉），和路面一致
  const bg = (E.lerpAt(road.hd, st.x) + (V.camYaw || 0)) * W * 0.55;
  const sx = ((W * 0.78 - bg * 0.2) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.2;
  ctx.fillStyle = sc.sun; ctx.beginPath(); ctx.arc(sx, hor * 0.42, sc.dark ? 22 : 30, 0, TAU); ctx.fill();
  if (sc.dark) { ctx.fillStyle = sc.sky[0]; ctx.beginPath(); ctx.arc(sx + 9, hor * 0.42 - 5, 20, 0, TAU); ctx.fill(); }
  ctx.fillStyle = sc.dark ? 'rgba(60,72,95,.8)' : 'rgba(255,255,255,.85)';
  const cw = 280;
  for (let k = -2; k < W / cw + 2; k++) {
    const off = bg * 0.4 + (st.t || 0) * 4, kk = k + Math.floor(off / cw);
    const x = kk * cw - off + hash(kk) * 90, y = hor * (0.15 + hash(kk + 9) * 0.4);
    ctx.beginPath(); ctx.ellipse(x, y, 42, 14, 0, 0, TAU); ctx.ellipse(x + 28, y - 9, 26, 14, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = sc.hill; ctx.beginPath(); ctx.moveTo(0, hor + 1);
  for (let x = 0; x <= W + 16; x += 16) {
    const wx = x + bg;
    const y = sc.skyline
      ? hor - 26 - (((Math.floor(wx / 50) % 4) + 4) % 4) * 12 - hash(Math.floor(wx / 50)) * 34
      : hor - 30 - 22 * Math.sin(wx / 150) - 12 * Math.sin(wx / 53);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, hor + 1); ctx.closePath(); ctx.fill();
}

// 路面用和柵欄、樹一樣的真正 3D 投影（projAt）畫：每 1 公尺一格（以世界座標對齊，條紋不會跟著車子跳），
// 每一格的四個角都投影到螢幕，由遠到近畫成多邊形，近的自然蓋住遠的（坡頂後面的路被擋住）。
// 急彎時道路在畫面上會變成橫向，多邊形照樣正確；相鄰兩格的接縫用同色描邊封住，不會透出底色。
function drawRoad(st, sc) {
  const c = CH[S.ch], { hor } = V;
  ctx.fillStyle = sc.ground[0]; ctx.fillRect(0, hor, W, H - hor);
  // 地平線附近的霧：先畫在背景上，路面（包括高過地平線的上坡）會蓋在它上面
  const fg = ctx.createLinearGradient(0, hor - 2, 0, hor + H * 0.07);
  fg.addColorStop(0, sc.sky[1]); fg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = fg; ctx.fillRect(0, hor - 2, W, H * 0.07 + 2);

  // 坡頂遮擋線：由近到遠，記錄比這一段更近的路面在畫面上最高到哪（給路邊物件裁切用）
  let runMin = H;
  for (let j = 0; j < V.n; j++) {
    V.clip[j] = runMin;
    const p = projAt(V.base + j, 0, 0);
    if (p) runMin = Math.min(runMin, p.y);
  }
  V.clip[V.n] = runMin;

  // 一塊路面：沿路 s0..s1、相對道路中心橫向 u0..u1（公尺）
  const quad3d = (s0, s1, u0, u1, col, seal) => {
    const a = projAt(s0, sc.off + u0, 0), b = projAt(s0, sc.off + u1, 0), d = projAt(s1, sc.off + u1, 0), e = projAt(s1, sc.off + u0, 0);
    if (!a || !b || !d || !e) return;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    if (seal) { ctx.strokeStyle = col; ctx.stroke(); }
  };
  ctx.lineWidth = 1; ctx.lineJoin = 'round';
  const camS = st.x - CAM_D + 0.5, far = st.x + DRAW - 2;
  for (let s = Math.floor(far); s >= Math.floor(camS); s--) {
    const s0 = Math.max(s, camS), s1 = s + 1;
    if (s1 <= s0) continue;
    const p = ((Math.floor(s / 2) % 2) + 2) % 2;
    // 草地只畫道路兩旁一段範圍：高過地平線的上坡看起來是一座山丘，兩側還看得到天空和遠山
    quad3d(s0, s1, -(sc.half + 30), sc.half + 30, sc.ground[p], true);
    if (sc.side) quad3d(s0, s1, -(sc.half + sc.side.w), sc.half + sc.side.w, sc.side.col[p], true);
    quad3d(s0, s1, -(sc.half + sc.rumW), sc.half + sc.rumW, sc.rumble[p], true);
    quad3d(s0, s1, -sc.half, sc.half, sc.road[p], true);
    if (sc.lane && p === 0) quad3d(s0, s1, -0.07, 0.07, sc.lane, true);
    if (sc.dark) quad3d(s0, s1, 0.6, 1.4, 'rgba(160,190,230,.07)');
    // 地面標記（與這一格重疊的部分）
    const mark = (a, b, u0, u1, col) => { const lo = Math.max(s0, a), hi = Math.min(s1, b); if (hi > lo) quad3d(lo, hi, u0, u1, col); };
    if (c.stops) c.stops.forEach((z0, i) => {
      const u = -sc.off;
      mark(z0, z0 + ZONE, u - 1.9, u + 1.9, i < S.stopIdx ? 'rgba(42,157,143,.55)' : 'rgba(244,197,66,.6)');
      mark(z0 + ZONE, z0 + ZONE + 0.4, u - 1.9, u + 1.9, '#F4F1E8');
    });
    if (c.lights) c.lights.forEach(L => mark(L, L + 0.4, 0.1, sc.half - 0.1, '#F4F1E8'));
    if (c.zebra != null) for (let u = -sc.half + 0.3; u < sc.half - 0.3; u += 1.2) mark(c.zebra, c.zebra + 4, u, u + 0.6, 'rgba(244,241,232,.9)');
    if (s >= c.goal - 1 && s < c.goal + 2) {
      const cells = 10, w = (2 * sc.half) / cells;
      for (let r = 0; r < 4; r++) for (let q = 0; q < cells; q++)
        if ((q + r) % 2 === 0) mark(c.goal + r * 0.5, c.goal + (r + 1) * 0.5, -sc.half + q * w, -sc.half + (q + 1) * w, INK);
    }
  }
}

// ── 場景物件 ──
function drawTree(p, r, dark) {
  const s = p.sc * r;
  if (s * 3 < 1.5) return;
  ctx.fillStyle = 'rgba(30,60,30,.18)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 1.3 * s, 0.25 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = dark ? '#3B2E25' : '#7A5A3C'; ctx.fillRect(p.x - 0.18 * s, p.y - 1.7 * s, 0.36 * s, 1.7 * s);
  ctx.fillStyle = dark ? '#1F3A2A' : '#4E9A55'; ctx.beginPath();
  ctx.arc(p.x, p.y - 2.7 * s, 1.25 * s, 0, TAU); ctx.arc(p.x - 0.85 * s, p.y - 2.05 * s, 0.9 * s, 0, TAU); ctx.arc(p.x + 0.85 * s, p.y - 2.1 * s, 0.95 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = dark ? '#284A35' : '#5FAE5E'; ctx.beginPath(); ctx.arc(p.x - 0.35 * s, p.y - 3.0 * s, 0.55 * s, 0, TAU); ctx.fill();
}
// 只畫在 y 以上的部分：被坡頂擋住的東西要藏起來
function clipAbove(y, fn) {
  if (y >= H) return fn();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, Math.max(0, y)); ctx.clip(); fn(); ctx.restore();
}
function drawFence(o) {
  const camS = V.st.x - CAM_D + 0.5;
  const s0 = Math.max(o.s, camS); if (s0 >= o.s + o.len) return;
  clipAbove(clipFor(s0), () => {
    for (const h of [0.75, 0.38]) {
      const a1 = projAt(s0, o.d, h + 0.06), a2 = projAt(s0, o.d, h - 0.06), b1 = projAt(o.s + o.len, o.d, h + 0.06), b2 = projAt(o.s + o.len, o.d, h - 0.06);
      if (a1 && a2 && b1 && b2) poly([a1, b1, b2, a2], '#E9D2A6');
    }
  });
  const p = projAt(o.s + o.len, o.d, 0);
  if (p) clipAbove(clipFor(o.s + o.len), () => {
    const w = 0.13 * p.sc, h = 1.0 * p.sc;
    ctx.fillStyle = '#E9D2A6'; ctx.strokeStyle = '#A9825A'; ctx.lineWidth = Math.max(0.5, 0.02 * p.sc);
    ctx.beginPath(); ctx.moveTo(p.x - w / 2, p.y); ctx.lineTo(p.x - w / 2, p.y - h); ctx.lineTo(p.x, p.y - h - w * 0.6); ctx.lineTo(p.x + w / 2, p.y - h); ctx.lineTo(p.x + w / 2, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
}
// 建築牆切成每公尺一片，每片各自依距離排序（長長的牆從近處延伸到遠處，不能只用一個距離代表）
function drawWallSlice(o, a, b) {
  const A = projAt(a, o.d, 0), B = projAt(b, o.d, 0), At = projAt(a, o.d, o.h), Bt = projAt(b, o.d, o.h);
  if (!A || !B || !At || !Bt) return;
  ctx.lineWidth = 1; ctx.lineJoin = 'round';
  poly([A, B, Bt, At], o.c); ctx.strokeStyle = o.c; ctx.stroke();   // 同色描邊封住片與片之間的接縫
  const r1 = projAt(a, o.d, o.h - 0.45), r2 = projAt(b, o.d, o.h - 0.45);
  if (r1 && r2) { poly([r1, r2, Bt, At], INK); ctx.strokeStyle = INK; ctx.stroke(); }
  // 窗戶：只畫落在這一片裡的部分
  const k0 = Math.max(0, Math.ceil((a - o.s - 2.1) / 2.4)), k1 = Math.floor((b - o.s - 1) / 2.4);
  for (let y = 1.3; y + 1.3 < o.h - 0.6; y += 2.6) {
    for (let k = k0; k <= k1; k++) {
      const sw = o.s + 1 + k * 2.4;
      if (sw + 1.1 >= o.s + o.len - 0.6) break;
      const w0 = Math.max(sw, a), w1 = Math.min(sw + 1.1, b);
      if (w1 <= w0) continue;
      const p1 = projAt(w0, o.d, y), p2 = projAt(w1, o.d, y), p3 = projAt(w1, o.d, y + 1.3), p4 = projAt(w0, o.d, y + 1.3);
      if (p1 && p2 && p3 && p4) poly([p1, p2, p3, p4], 'rgba(30,43,51,.72)');
    }
  }
}
// 靠近鏡頭那一端的建築正面
function drawWallCap(o) {
  const A = projAt(o.s, o.d, 0), At = projAt(o.s, o.d, o.h), C = projAt(o.s, o.d + o.dir * 5, 0), Ct = projAt(o.s, o.d + o.dir * 5, o.h);
  if (A && At && C && Ct) { poly([A, C, Ct, At], o.c); poly([A, C, Ct, At], 'rgba(30,43,51,.18)'); }
}
function drawGroundOval(p, rx, col, ring) {
  const ry = rx * V.camH / p.zc;
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * p.sc, Math.max(0.5, ry * p.sc), 0, 0, TAU); ctx.fill();
  if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = Math.max(0.5, 0.06 * p.sc); ctx.stroke(); }
}
function drawCar(o, p, st) {
  const s = p.sc;
  ctx.fillStyle = 'rgba(30,43,51,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 1.0 * s, 0.14 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = o.c; rr(p.x - 0.9 * s, p.y - 1.05 * s, 1.8 * s, 0.8 * s, 0.15 * s); ctx.fill();
  ctx.fillStyle = o.c; rr(p.x - 0.72 * s, p.y - 1.5 * s, 1.44 * s, 0.55 * s, 0.2 * s); ctx.fill();
  ctx.fillStyle = 'rgba(30,43,51,.75)'; rr(p.x - 0.62 * s, p.y - 1.42 * s, 1.24 * s, 0.4 * s, 0.12 * s); ctx.fill();
  ctx.fillStyle = RED; ctx.fillRect(p.x - 0.85 * s, p.y - 0.85 * s, 0.25 * s, 0.14 * s); ctx.fillRect(p.x + 0.6 * s, p.y - 0.85 * s, 0.25 * s, 0.14 * s);
  ctx.fillStyle = INK; ctx.fillRect(p.x - 0.8 * s, p.y - 0.28 * s, 0.3 * s, 0.28 * s); ctx.fillRect(p.x + 0.5 * s, p.y - 0.28 * s, 0.3 * s, 0.28 * s);
  ctx.fillStyle = '#F4F1E8'; ctx.fillRect(p.x - 0.28 * s, p.y - 0.6 * s, 0.56 * s, 0.16 * s);
  if (o.door && st.doorOpen) {
    // 打開的車門：從車身左側伸向車道
    const s0 = o.s + 0.9;
    const a = projAt(s0, o.d - 0.9, 0.3), b = projAt(s0, o.d - 1.95, 0.3), bt = projAt(s0, o.d - 1.95, 1.3), at = projAt(s0, o.d - 0.9, 1.3);
    if (a && b && bt && at) { poly([a, b, bt, at], o.c); poly([a, b, bt, at], 'rgba(30,43,51,.2)'); }
  }
}
function drawSprite(o, p, st) {
  const s = p.sc, sc = SCENES[CH[S.ch].scene];
  switch (o.t) {
    case 'tree': drawTree(p, o.r, sc.dark); break;
    case 'flower': {
      if (s < 3) return;
      [o.c, '#FFFFFF', o.c].forEach((col, i) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x + (i - 1) * 0.18 * s, p.y - (0.1 + (i % 2) * 0.1) * s, 0.09 * s, 0, TAU); ctx.fill(); });
      ctx.fillStyle = '#4E9A55'; ctx.fillRect(p.x - 0.25 * s, p.y - 0.04 * s, 0.5 * s, 0.05 * s);
      break;
    }
    case 'post': {
      ctx.fillStyle = '#A9825A'; ctx.fillRect(p.x - 0.05 * s, p.y - 0.7 * s, 0.1 * s, 0.7 * s);
      ctx.fillStyle = '#FFFFFF'; rr(p.x - 0.35 * s, p.y - 0.95 * s, 0.7 * s, 0.32 * s, 0.06 * s); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.5, 0.03 * s); ctx.stroke();
      if (s > 10) { ctx.fillStyle = INK; ctx.font = `800 ${0.24 * s}px ${NUMF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.label, p.x, p.y - 0.78 * s); }
      break;
    }
    case 'lamp': {
      ctx.fillStyle = '#5E6B74'; ctx.fillRect(p.x - 0.06 * s, p.y - 4.3 * s, 0.12 * s, 4.3 * s);
      line([[p.x, p.y - 4.3 * s], [p.x - 0.9 * s, p.y - 4.5 * s]], Math.max(1, 0.1 * s), '#5E6B74');
      ctx.fillStyle = '#FFE9A8'; ctx.beginPath(); ctx.ellipse(p.x - 0.95 * s, p.y - 4.4 * s, 0.3 * s, 0.12 * s, 0, 0, TAU); ctx.fill();
      if (sc.dark) V.glows.push({ x: p.x - 0.95 * s, y: p.y - 4.3 * s, r: 3.2 * s, gy: p.y, gr: 2.2 * s });
      break;
    }
    case 'sign': case 'grade': {
      ctx.fillStyle = '#8A96A0'; ctx.fillRect(p.x - 0.04 * s, p.y - 2.2 * s, 0.08 * s, 2.2 * s);
      const cy = p.y - 2.45 * s;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (o.t === 'sign') {
        const done = o.i < S.stopIdx;
        ctx.fillStyle = done ? TEAL : RED; ctx.beginPath();
        for (let j = 0; j < 8; j++) { const a = Math.PI / 8 + j * Math.PI / 4; ctx.lineTo(p.x + 0.38 * s * Math.cos(a), cy + 0.38 * s * Math.sin(a)); }
        ctx.closePath(); ctx.fill();
        if (s > 8) { ctx.fillStyle = '#fff'; ctx.font = `900 ${0.34 * s}px ${FONT}`; ctx.fillText(done ? '✓' : '停', p.x, cy + 0.02 * s); }
      } else {
        ctx.fillStyle = YEL; ctx.beginPath(); ctx.moveTo(p.x, cy - 0.45 * s); ctx.lineTo(p.x + 0.45 * s, cy); ctx.lineTo(p.x, cy + 0.45 * s); ctx.lineTo(p.x - 0.45 * s, cy); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 0.05 * s; ctx.stroke();
        if (s > 8) { ctx.fillStyle = INK; ctx.font = `800 ${0.22 * s}px ${NUMF}`; ctx.fillText((o.g > 0 ? '↗' : '↘') + Math.round(Math.abs(o.g) * 100) + '%', p.x, cy + 0.02 * s); }
      }
      break;
    }
    case 'tlight': {
      const tl = S.tl[o.i];
      ctx.fillStyle = '#5E6B74'; ctx.fillRect(p.x - 0.07 * s, p.y - 3.2 * s, 0.14 * s, 3.2 * s);
      ctx.fillStyle = INK; rr(p.x - 0.28 * s, p.y - 4.4 * s, 0.56 * s, 1.3 * s, 0.12 * s); ctx.fill();
      [['red', '#FF5A4A'], ['yellow', '#FFC93C'], ['green', '#3CD17A']].forEach(([ph, col], k) => {
        ctx.fillStyle = tl.ph === ph ? col : 'rgba(255,255,255,.12)';
        ctx.beginPath(); ctx.arc(p.x, p.y - (4.18 - k * 0.4) * s, 0.15 * s, 0, TAU); ctx.fill();
      });
      break;
    }
    case 'car': drawCar(o, p, st); break;
    case 'bench': {
      ctx.fillStyle = '#9C6B43';
      ctx.fillRect(p.x - 0.7 * s, p.y - 0.5 * s, 1.4 * s, 0.1 * s);
      ctx.fillRect(p.x - 0.7 * s, p.y - 0.9 * s, 1.4 * s, 0.12 * s);
      ctx.fillStyle = INK; ctx.fillRect(p.x - 0.6 * s, p.y - 0.45 * s, 0.07 * s, 0.45 * s); ctx.fillRect(p.x + 0.53 * s, p.y - 0.45 * s, 0.07 * s, 0.45 * s);
      break;
    }
    case 'puddle':
      drawGroundOval(p, 1.0, 'rgba(120,160,210,.55)');
      drawGroundOval({ ...p, x: p.x - 0.25 * s }, 0.35, 'rgba(220,235,255,.45)');
      break;
    case 'manhole': drawGroundOval(p, 0.45, '#3F474F', '#8A96A0'); break;
    case 'chevron': {
      // 黃黑轉彎箭頭牌：箭頭指向彎道的方向
      if (s < 2) return;
      ctx.fillStyle = '#5E6B74'; ctx.fillRect(p.x - 0.04 * s, p.y - 0.9 * s, 0.08 * s, 0.9 * s);
      ctx.fillStyle = YEL; ctx.fillRect(p.x - 0.32 * s, p.y - 1.4 * s, 0.64 * s, 0.5 * s);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 0.1 * s); ctx.lineJoin = 'miter'; ctx.beginPath();
      const ax = o.dir * 0.12 * s;
      ctx.moveTo(p.x - ax, p.y - 1.33 * s); ctx.lineTo(p.x + ax, p.y - 1.15 * s); ctx.lineTo(p.x - ax, p.y - 0.97 * s); ctx.stroke();
      break;
    }
    case 'curve': {
      // 彎道預告牌：黃色菱形 + 彎曲箭頭，下面一塊白牌寫建議速度
      ctx.fillStyle = '#8A96A0'; ctx.fillRect(p.x - 0.04 * s, p.y - 2.2 * s, 0.08 * s, 2.2 * s);
      const cy = p.y - 2.5 * s;
      ctx.fillStyle = YEL; ctx.beginPath(); ctx.moveTo(p.x, cy - 0.5 * s); ctx.lineTo(p.x + 0.5 * s, cy); ctx.lineTo(p.x, cy + 0.5 * s); ctx.lineTo(p.x - 0.5 * s, cy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 0.05 * s); ctx.stroke();
      ctx.lineWidth = Math.max(1, 0.08 * s); ctx.beginPath();
      ctx.moveTo(p.x - o.dir * 0.12 * s, cy + 0.25 * s); ctx.lineTo(p.x - o.dir * 0.12 * s, cy - 0.02 * s);
      ctx.quadraticCurveTo(p.x - o.dir * 0.12 * s, cy - 0.2 * s, p.x + o.dir * 0.12 * s, cy - 0.2 * s); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(p.x + o.dir * 0.24 * s, cy - 0.2 * s); ctx.lineTo(p.x + o.dir * 0.1 * s, cy - 0.31 * s); ctx.lineTo(p.x + o.dir * 0.1 * s, cy - 0.09 * s); ctx.closePath(); ctx.fill();
      if (s > 8) {
        ctx.fillStyle = '#fff'; rr(p.x - 0.35 * s, p.y - 1.9 * s, 0.7 * s, 0.32 * s, 0.05 * s); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.5, 0.03 * s); ctx.stroke();
        ctx.fillStyle = INK; ctx.font = `800 ${0.22 * s}px ${NUMF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${o.vRec} km/h`, p.x, p.y - 1.73 * s);
      }
      break;
    }
    case 'paint': {
      // 畫在地上的字：依距離壓扁
      if (s < 4) return;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, Math.min(1, V.camH / p.zc));
      ctx.fillStyle = '#FFFFFF'; ctx.font = `900 ${1.3 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.i < S.stopIdx ? '✓' : '停', 0, 0); ctx.restore();
      break;
    }
    case 'banner': {
      const l = projAt(o.s, sc.off - sc.half - 0.4, 0), r = projAt(o.s, sc.off + sc.half + 0.4, 0);
      if (!l || !r) return;
      const lt = l.y - 3.2 * l.sc, lb = l.y - 2.4 * l.sc;
      ctx.fillStyle = INK; ctx.fillRect(l.x - 0.07 * l.sc, lt, 0.14 * l.sc, l.y - lt); ctx.fillRect(r.x - 0.07 * r.sc, lt, 0.14 * r.sc, l.y - lt);
      ctx.fillStyle = RED; ctx.fillRect(l.x, lt, r.x - l.x, lb - lt);
      const cw = (lb - lt) / 2;
      for (let q = 0; q * cw < r.x - l.x; q++) { ctx.fillStyle = q % 2 ? '#fff' : INK; ctx.fillRect(l.x + q * cw, lb - cw * 0.5, Math.min(cw, r.x - l.x - q * cw), cw * 0.5); }
      if (l.sc > 4) { ctx.fillStyle = '#fff'; ctx.font = `900 ${0.45 * l.sc}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('終　點', (l.x + r.x) / 2, lt + (lb - lt) * 0.38); }
      break;
    }
  }
}

// ── 行人（斑馬線上）──
function drawPed(st, p) {
  const s = p.sc;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
  const ph = (st.t || 0) * 7, lf = Math.sin(ph) * 0.12;
  ctx.fillStyle = 'rgba(30,43,51,.18)'; ctx.beginPath(); ctx.ellipse(0, 0.02, 0.3, 0.06, 0, 0, TAU); ctx.fill();
  line([[-0.08, -0.85], [-0.1 + lf, 0]], 0.13, '#3A3F55');
  line([[0.08, -0.85], [0.1 - lf, 0]], 0.13, '#4A4F66');
  ctx.fillStyle = '#C86FA4'; rr(-0.22, -1.45, 0.44, 0.65, 0.12); ctx.fill();
  line([[-0.2, -1.35], [-0.28, -0.95 + lf * 0.5]], 0.09, '#C86FA4');
  line([[0.2, -1.35], [0.3, -0.95 - lf * 0.5]], 0.09, '#C86FA4');
  ctx.fillStyle = '#E7B48D'; ctx.beginPath(); ctx.arc(0, -1.62, 0.14, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2B2320'; ctx.beginPath(); ctx.arc(0, -1.66, 0.145, Math.PI, TAU); ctx.fill();
  ctx.restore();
}

// ── 腳踏車與騎士（從後方看）──
// 畫法在 js/rider.js（小骨架 + 膠囊 + 深度排序）；這裡只負責把遊戲狀態換成姿勢，並處理影子、翻車、傾斜
function drawBikeBack(st, cx, cy, s) {
  const c = CH[S.ch];
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  const sl = Math.sin(st.lean);
  ctx.fillStyle = 'rgba(30,43,51,.22)'; ctx.beginPath(); ctx.ellipse(sl * 0.55, 0.02, 0.3 + Math.abs(sl) * 0.6, 0.07, 0, 0, TAU); ctx.fill();
  if (st.pitch > 0) { ctx.translate(0, -Math.min(0.9, st.pitch * 0.45)); ctx.scale(1, 1 - Math.min(0.45, st.pitch * 0.22)); }
  ctx.rotate(st.lean);
  // 車頭朝向：鏡頭不跟車頭轉，所以畫在車上；加上「接下來 0.3 秒會轉多少」，傾斜時車頭就先偏過去
  const turning = Math.abs(st.lean) < LEAN_MAX ? E.turnRate(st, c) : 0;   // 倒下的車不預判轉向
  BikeSprite.draw(ctx, {
    yaw: clamp((st.psi || 0) + turning * 0.3, -1.2, 1.2),
    steer: E.frontWheelAngle(st, c),     // 騎士的操作 + 轉彎需要的角度：按 → 時先往左反打一下，再轉向右邊
    crank: st.crankVis,
    footDown: st.footDown,
    signing: st.sig && (st.t - st.sigT) < 1.6 ? st.sig : 0,
    number: c.id === 1 ? 5 : null,
    backpack: c.id >= 5,
    tailLight: !!(S.light && c.wet)
  });
  ctx.restore();
}

function drawDad(st, p) {
  const s = p.sc;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
  const holding = st.assist > 0.05, ph = st.dadPhase;
  ctx.fillStyle = 'rgba(30,43,51,.18)'; ctx.beginPath(); ctx.ellipse(0, 0.02, 0.35, 0.07, 0, 0, TAU); ctx.fill();
  const lf = Math.max(0, Math.sin(ph)) * 0.22, rf = Math.max(0, -Math.sin(ph)) * 0.22;
  line([[-0.12, -0.9], [-0.13, -0.45 - lf], [-0.14, -0.02 - lf]], 0.15, '#4A4F63');
  line([[0.12, -0.9], [0.13, -0.45 - rf], [0.14, -0.02 - rf]], 0.15, '#5A6078');
  ctx.fillStyle = '#6C8EBF'; rr(-0.26, -1.55, 0.52, 0.7, 0.14); ctx.fill();
  if (holding) {
    const ppm = V.bike.sc;
    const sx = V.bike.x + Math.sin(st.lean) * 0.95 * ppm, sy = V.bike.y - Math.cos(st.lean) * 0.95 * ppm;
    const hx = (sx - p.x) / s, hy = (sy - p.y) / s;
    line([[0.2, -1.45], [(0.2 + hx) / 2, (-1.45 + hy) / 2 + 0.1], [hx, hy]], 0.11, '#6C8EBF');
    line([[-0.2, -1.45], [-0.32, -1.05]], 0.11, '#6C8EBF');
  } else {
    const wave = Math.sin((st.t || 0) * 7) * 0.12;
    line([[0.2, -1.45], [0.36, -1.8], [0.38 + wave, -2.05]], 0.11, '#6C8EBF');
    line([[-0.2, -1.45], [-0.3, -1.05]], 0.11, '#6C8EBF');
  }
  ctx.fillStyle = '#E7B48D'; ctx.fillRect(-0.06, -1.62, 0.12, 0.1);
  ctx.fillStyle = '#3A2E28'; ctx.beginPath(); ctx.arc(0, -1.76, 0.15, 0, TAU); ctx.fill();
  ctx.restore();
}

// ── 夜晚：黑暗、車燈、路燈光暈、雨 ──
function drawNight(st) {
  const cx = W / 2, cy = V.hor + (V.baseY - V.hor) * 0.35, R = Math.max(W, H);
  const g = ctx.createRadialGradient(cx, cy, S.light ? 40 : 10, cx, cy, S.light ? R * 0.62 : R * 0.3);
  g.addColorStop(0, 'rgba(6,10,20,0.05)'); g.addColorStop(1, S.light ? 'rgba(6,10,20,0.78)' : 'rgba(6,10,20,0.9)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (S.light) {
    const bg = ctx.createRadialGradient(cx, cy, 5, cx, cy, R * 0.35);
    bg.addColorStop(0, 'rgba(255,230,160,.22)'); bg.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.5); ctx.translate(-cx, -cy);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, R * 0.35, 0, TAU); ctx.fill(); ctx.restore();
  }
  for (const l of V.glows) {
    const lg = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    lg.addColorStop(0, 'rgba(255,220,150,.45)'); lg.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, TAU); ctx.fill();
    const pg = ctx.createRadialGradient(l.x, l.gy, 0, l.x, l.gy, l.gr);
    pg.addColorStop(0, 'rgba(255,220,150,.18)'); pg.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(l.x, l.gy, l.gr, l.gr * 0.3, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // 雨
  ctx.strokeStyle = 'rgba(190,210,240,.35)'; ctx.lineWidth = 1.2; ctx.beginPath();
  const t = st.t || 0;
  for (let i = 0; i < 160; i++) {
    const x = (hash(i) * W * 1.2 + t * 90) % (W * 1.2) - W * 0.1;
    const y = (hash(i + 99) * H + t * (700 + hash(i + 7) * 300)) % H;
    ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14);
  }
  ctx.stroke();
}

// 所有物件用同一套順序畫：地上的東西（水坑、人孔蓋、地面文字）先畫；
// 其餘站著的東西（建築、柵欄、樹、車、人、主角）一律依距離由遠到近畫，近的蓋住遠的。
// 被坡頂擋住的部分用 V.clip 裁掉。
const GROUND = new Set(['puddle', 'manhole', 'paint']);
function drawWorld(st) {
  const c = CH[S.ch], sc = SCENES[c.scene], road = ROADS[S.ch];
  buildView(st);
  drawSky(st, sc);
  drawRoad(st, sc);

  const camS = st.x - CAM_D + 0.5, lo = st.x - CAM_D - 1, hi = st.x + DRAW - 2;
  const items = [];
  const zAt = (s, d) => { const p = projAt(s, d, 0); return p ? p.zc : null; };
  for (const o of road.sp) {
    if (o.t === 'wall') {
      if (o.s + o.len < lo || o.s > hi) continue;
      // 近處切細（轉角遮擋最需要），遠處切粗（省效能）
      const end = Math.min(o.s + o.len, hi);
      for (let a = Math.max(o.s, camS); a < end;) {
        const dist = a - st.x, step = dist < 25 ? 1 : dist < 60 ? 3 : 8;
        const b = Math.min(Math.floor(a / step) * step + step, o.s + o.len), z = zAt((a + b) / 2, o.d);
        if (z != null) items.push({ kind: 'wallSlice', o, a, b, z });
        a = b;
      }
      if (o.s >= camS) { const z = zAt(o.s, o.d + o.dir * 2.5); if (z != null) items.push({ kind: 'wallCap', o, z }); }
      continue;
    }
    if (o.t === 'fence') {
      if (o.s + o.len < lo || o.s > hi) continue;
      const z = zAt(Math.max(o.s, camS) + o.len / 2, o.d);
      if (z != null) items.push({ kind: 'fence', o, z });
      continue;
    }
    if (o.s < lo || o.s > hi) continue;
    const p = projAt(o.s, o.d, 0);
    if (p) items.push({ kind: 'sprite', o, p, z: p.zc, ground: GROUND.has(o.t) });
  }
  if (c.id === 1) {
    const p = projAt(st.dadX, -0.8, 0);
    if (p && p.zc > 0.9) items.push({ kind: 'dad', o: { s: st.dadX }, p, z: p.zc });
  }
  if (c.zebra != null && S.ped.active && !S.ped.gone) {
    const pd = st.pedD ?? S.ped.d, p = projAt(c.zebra + 2, pd, 0);
    if (p) items.push({ kind: 'ped', o: { s: c.zebra + 2 }, p, z: p.zc });
  }
  items.push({ kind: 'bike', z: V.bike.zc ?? CAM_D });
  items.sort((a, b) => (!!b.ground - !!a.ground) || (b.z - a.z));
  for (const it of items) {
    const { kind, o } = it;
    if (kind === 'bike') { drawBikeBack(st, V.bike.x, V.bike.y, V.bike.sc); continue; }
    if (kind === 'wallSlice') { clipAbove(clipFor(it.a), () => drawWallSlice(o, it.a, it.b)); continue; }
    if (kind === 'wallCap') { clipAbove(clipFor(o.s), () => drawWallCap(o)); continue; }
    if (kind === 'fence') { drawFence(o); continue; }
    const cy = clipFor(o.s), hidden = it.p.y > cy + 0.5;
    if (hidden) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, cy); ctx.clip(); }
    if (kind === 'dad') drawDad(st, it.p);
    else if (kind === 'ped') drawPed(st, it.p);
    else drawSprite(o, it.p, st);
    if (hidden) ctx.restore();
  }
  if (sc.dark) drawNight(st);
}
