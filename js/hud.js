// 畫面上的儀表：水平儀、踏板鐘、檔位、小地圖、重播標題

// ─────────────────────────── HUD ───────────────────────────
function chip(x, y, text, bg = INK, fg = '#fff', align = 'left') {
  ctx.font = `900 13px ${FONT}`;
  const w = ctx.measureText(text).width + 22, x0 = align === 'right' ? x - w : x;
  ctx.fillStyle = bg; rr(x0, y, w, 26, 13); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.fillText(text, x0 + w / 2, y + 14);
  return w;
}
function drawHUD(st) {
  const c = CH[S.ch], top = 14, sc = SCENES[c.scene];
  const ink = sc.dark ? '#EEF3F8' : INK;
  ctx.textBaseline = 'middle';
  ctx.font = `900 14px ${FONT}`; ctx.textAlign = 'left';
  // 觸控時章節名稱前面加暫停符號，整塊可以點（#pz 蓋在上面）
  const label = `${touchShown ? 'Ⅱ  ' : ''}第 ${c.id} 章　${c.name}`, lw = ctx.measureText(label).width + 28;
  if (touchShown) syncTouchDOM(lw);
  ctx.fillStyle = INK; rr(16, top, lw, 32, 16); ctx.fill();
  if (sc.dark) { ctx.strokeStyle = '#EEF3F8'; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.fillText(label, 30, top + 17);
  const pw = Math.min(240, W * 0.42), prog = clamp(st.x / c.goal, 0, 1);
  ctx.fillStyle = 'rgba(255,255,255,.75)'; rr(16, top + 42, pw, 10, 5); ctx.fill();
  ctx.fillStyle = YEL; rr(16, top + 42, Math.max(10, pw * prog), 10, 5); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(16, top + 42, pw, 10, 5); ctx.stroke();
  ctx.textAlign = 'left'; ctx.font = `700 12px ${FONT}`; ctx.fillStyle = ink;
  if (c.id === 2) ctx.fillText(`停車 ${Math.min(S.stopIdx, 3)} / 3`, 16 + pw + 10, top + 48);

  ctx.textAlign = 'right'; ctx.fillStyle = ink;
  ctx.font = `800 34px ${NUMF}`; ctx.fillText(String(Math.round(st.v * 3.6)), W - 62, top + 20);
  ctx.font = `700 12px ${FONT}`; ctx.fillText('km/h', W - 18, top + 24);
  if (c.safety) chip(W - 16, top + 42, `安全分數 ${S.safety}`, S.safety >= 80 ? TEAL : S.safety >= 60 ? '#D98B1C' : RED, '#fff', 'right');
  if (c.wet) chip(W - 16, top + 42, S.light ? '車燈 開' : touchShown ? '車燈 關' : '車燈 關（L）', S.light ? YEL : RED, S.light ? INK : '#fff', 'right');

  // 水平儀
  // 手機橫向畫面矮：縮小放到最上排（章節名稱和速度之間），不擋前面的路
  const slim = touchShown && W > H;
  const vw = slim ? clamp(W - 2 * (lw + 40), 140, 260) : Math.min(320, W - 60), vx = (W - vw) / 2;
  const vy = slim ? top + 7 : top + 70, vh = slim ? 18 : 22, bw = slim ? 11 : 14;
  const grd = ctx.createLinearGradient(vx, 0, vx + vw, 0);
  grd.addColorStop(0, '#F4A08F'); grd.addColorStop(0.18, '#E8F6C9'); grd.addColorStop(0.82, '#E8F6C9'); grd.addColorStop(1, '#F4A08F');
  ctx.fillStyle = grd; rr(vx, vy, vw, vh, vh / 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; rr(vx, vy, vw, vh, vh / 2); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(30,43,51,.5)';
  for (const f of [-0.5, 0, 0.5]) { const x = W / 2 + f * (vw / 2 - bw - 2); ctx.beginPath(); ctx.moveTo(x, vy + 4); ctx.lineTo(x, vy + vh - 4); ctx.stroke(); }
  const bxp = W / 2 + clamp(st.lean / LEAN_MAX, -1, 1) * (vw / 2 - bw - 2);
  ctx.fillStyle = Math.abs(st.lean) > 0.55 ? '#FFD7CF' : '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(bxp, vy + vh / 2, bw, bw / 2, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(bxp - 4, vy + vh / 2 - 2, 4, 2, 0, 0, TAU); ctx.fill();
  ctx.font = `900 16px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillStyle = st.want < -0.15 ? RED : sc.dark ? 'rgba(238,243,248,.35)' : 'rgba(30,43,51,.3)'; ctx.fillText('◀', vx - 12, vy + vh / 2 + 1);
  ctx.fillStyle = st.want > 0.15 ? RED : sc.dark ? 'rgba(238,243,248,.35)' : 'rgba(30,43,51,.3)'; ctx.fillText('▶', vx + vw + 12, vy + vh / 2 + 1);
  ctx.font = `700 11px ${FONT}`; ctx.fillStyle = ink; if (!slim) ctx.fillText('平衡', W / 2, vy + vh + 12);

  if (touchShown) { drawTouchColumn(st, c, ink, top + (slim ? 64 : 112)); ctx.textBaseline = 'alphabetic'; return; }

  // 左下：踏板鐘 + 節奏
  const base = H - 16;
  const dx = 16 + 34, dy = base - 38;
  drawPedalClock(dx, dy, st, ink);

  const fx0 = dx + 32 + 14;
  ['L', 'R'].forEach((f, i) => {
    const lit = S.lastFoot === f && S.t - S.lastPedalT < 0.18;
    ctx.fillStyle = lit ? YEL : 'rgba(255,255,255,.85)';
    rr(fx0 + i * 34, base - 56, 28, 36, 10); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `800 15px ${NUMF}`; ctx.textAlign = 'center'; ctx.fillText(f === 'L' ? 'A' : 'D', fx0 + i * 34 + 14, base - 38);
  });
  ctx.textAlign = 'left';
  if (S.combo >= 3) { ctx.font = `800 13px ${FONT}`; ctx.fillStyle = RED; ctx.fillText(`節奏 ×${S.combo}`, fx0, base - 68); }
  if (st.footDown) { ctx.font = `700 12px ${FONT}`; ctx.fillStyle = ink; ctx.fillText('腳踩地中', fx0, base - 8); }

  // 右下：第 4 章變速面板；有彎道的章節顯示小地圖
  if (c.gears) drawGearPanel(W - 16 - 168, base - 112);
  else if (ROADS[S.ch].curves.length) drawMinimap(st, W - 16 - 104, base - 104, 104);
  // 紅綠燈提示
  drawTrafficLight(W - 16 - 34, top + 76, ink);
  ctx.textBaseline = 'alphabetic';
}

// 觸控時：兩手拇指在下方，儀表改成從左上方往右排；踏板鐘只在第 2 章或停下時出現，小地圖縮小
function drawTouchColumn(st, c, ink, y) {
  let x = 16;
  if (c.gears) { drawGearPanel(x, y); x += 168 + 12; }
  else if (ROADS[S.ch].curves.length) { drawMinimap(st, x, y, 72); x += 72 + 12; }
  if (c.id === 2 || st.v < 0.6) { drawPedalClock(x + 32, y + 50, st, ink); x += 64 + 12; }
  drawTrafficLight(x, y, ink);
}

function drawPedalClock(dx, dy, st, ink) {
  ctx.beginPath(); ctx.arc(dx, dy, 32, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(dx, dy, 26, -Math.PI / 2 + 0.3, -Math.PI / 2 + 1.8); ctx.strokeStyle = '#9ED9A0'; ctx.lineWidth = 8; ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    line([[dx + 27 * Math.sin(a), dy - 27 * Math.cos(a)], [dx + 31 * Math.sin(a), dy - 31 * Math.cos(a)]], i % 3 ? 1 : 2, INK);
  }
  const ca = st.crankVis;
  line([[dx, dy], [dx - 18 * Math.sin(ca), dy + 18 * Math.cos(ca)]], 3, '#9AA6AE');
  line([[dx, dy], [dx + 20 * Math.sin(ca), dy - 20 * Math.cos(ca)]], 4, RED);
  ctx.beginPath(); ctx.arc(dx + 20 * Math.sin(ca), dy - 20 * Math.cos(ca), 4.5, 0, TAU); ctx.fillStyle = RED; ctx.fill();
  ctx.beginPath(); ctx.arc(dx, dy, 32, 0, TAU); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = ink; ctx.font = `700 11px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('右踏板', dx, dy - 44);
}

function drawTrafficLight(x, y, ink) {
  const c = CH[S.ch];
  if (c.lights) c.lights.forEach((L, i) => {
    const dist = L - S.x;
    if (dist > 0 && dist < 45) {
      const tl = S.tl[i];
      ctx.fillStyle = INK; rr(x, y, 34, 84, 10); ctx.fill();
      [['red', '#FF5A4A'], ['yellow', '#FFC93C'], ['green', '#3CD17A']].forEach(([ph, col], k) => {
        ctx.fillStyle = tl.ph === ph ? col : 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(x + 17, y + 16 + k * 26, 9, 0, TAU); ctx.fill();
      });
      ctx.font = `700 11px ${FONT}`; ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.fillText(`${Math.round(dist)}m`, x + 17, y + 96);
    }
  });
  ctx.textBaseline = 'alphabetic';
}

function drawGearPanel(x, y) {
  const w = 168, h = 112;
  ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.font = `700 11px ${FONT}`;
  ctx.fillText(touchShown ? '檔位' : '檔位（Z 輕 / X 重）', x + 12, y + 16);
  for (let g = 0; g < 5; g++) {
    const bh = 10 + g * 5, bx = x + 12 + g * 22;
    ctx.fillStyle = g === S.gear ? RED : g < S.gear ? '#F4A08F' : '#DCE6EA';
    rr(bx, y + 52 - bh, 16, bh, 3); ctx.fill();
  }
  ctx.font = `800 26px ${NUMF}`; ctx.fillStyle = INK; ctx.fillText(String(S.gear + 1), x + 128, y + 40);
  const gp = Math.round(S.grade * 100);
  ctx.font = `700 12px ${FONT}`; ctx.fillStyle = INK;
  ctx.fillText(`坡度 ${gp > 0 ? '+' : ''}${gp}%`, x + 12, y + 68);
  const bar = (label, v, yy) => {
    ctx.fillStyle = INK; ctx.font = `700 11px ${FONT}`; ctx.fillText(label, x + 12, yy);
    ctx.fillStyle = '#DCE6EA'; rr(x + 70, yy - 5, 84, 10, 5); ctx.fill();
    ctx.fillStyle = v > 1 ? RED : v > 0.8 ? '#E9A23B' : TEAL; rr(x + 70, yy - 5, Math.max(6, 84 * Math.min(1, v)), 10, 5); ctx.fill();
  };
  bar('踩踏負荷', S.strain / 1.3, y + 86);
  bar('煞車溫度', S.rearHeat / 3.5, y + 102);
  if (S.strain > 1 && S.t - S.lastPedalT < E.P.PEDAL_WINDOW) { ctx.fillStyle = RED; ctx.font = `900 12px ${FONT}`; ctx.fillText('踩不動！', x + 100, y + 68); }
}

function drawMinimap(st, mx, my, box) {
  const map = ROADS[S.ch].map;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const m of map) { x0 = Math.min(x0, m.x); x1 = Math.max(x1, m.x); y0 = Math.min(y0, m.y); y1 = Math.max(y1, m.y); }
  const k = (box - box * 0.2) / Math.max(x1 - x0, y1 - y0), ox = mx + (box - (x1 - x0) * k) / 2, oy = my + (box - (y1 - y0) * k) / 2;
  ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(mx, my, box, box, 12); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); map.forEach((m, i) => { const X = ox + (m.x - x0) * k, Y = oy + (m.y - y0) * k; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = '#C4A46A'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  const m = map[clamp(Math.floor(st.x), 0, map.length - 1)];
  ctx.beginPath(); ctx.arc(ox + (m.x - x0) * k, oy + (m.y - y0) * k, 5, 0, TAU); ctx.fillStyle = RED; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawReplay() {
  const r = REASONS[S.crashKey] || ['摔車了', ''];
  ctx.fillStyle = 'rgba(30,43,51,.18)'; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';
  const bw = Math.min(W - 32, 420), bx = (W - bw) / 2, by = H * 0.26;
  ctx.fillStyle = '#fff'; rr(bx, by, bw, 64, 14); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(bx + 22, by + 20, 6, 0, TAU); ctx.fill();
  ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.fillText('慢動作重播 ×0.35', bx + 34, by + 20);
  ctx.font = `900 20px ${FONT}`; ctx.fillText(r[0], bx + 16, by + 45);
  ctx.textBaseline = 'alphabetic';
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const st = (S.mode === 'replay' || S.mode === 'crash') && S.frames.length
    ? Object.assign({}, S, S.frames[Math.floor(Math.min(S.rp, S.frames.length - 1))]) : S;
  drawWorld(st);
  if (['play', 'replay', 'pause', 'crash'].includes(S.mode)) drawHUD(st);
  else if (touchShown) syncTouchDOM(0);
  if (S.mode === 'play' && touchShown) drawTouchUI();
  if (S.mode === 'replay') drawReplay();
  if (PERF.on) drawPerf();
}

// 效能顯示：網址加 #fps，在實際裝置上看幀率與每幀耗時（main.js 量測）
const PERF = { on: location.hash.includes('fps'), fps: 0, ms: 0 };
function drawPerf() {
  const text = `${Math.round(PERF.fps)} fps  ${PERF.ms.toFixed(1)} ms  ${W}×${H}@${DPR}`;
  ctx.font = `700 12px ${NUMF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 16;
  ctx.fillStyle = 'rgba(30,43,51,.75)'; rr(W / 2 - w / 2, H - 28, w, 20, 10); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText(text, W / 2, H - 18);
  ctx.textBaseline = 'alphabetic';
}
