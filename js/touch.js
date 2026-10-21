// 手機觸控：左半邊拖曳控制傾斜（類比量）、右半邊左右交替點擊踩踏、右下角按住（或往下滑）後煞；
// 依章節出現的小按鈕；提示文字的觸控說法在 i18n.js（CTL）

// ─────────────────────────── 狀態 ───────────────────────────
let touchShown = false;
const TT = {
  lean: null,          // 左手：{ id, x0, y0, x, y }，按下的位置當中心
  want: 0,             // 傾斜量 -1..1（+ = 往右）
  right: new Map(),    // 右手每根手指：id → { kind: 'L' | 'R' | 'brake', y0 }
  marks: []            // 點擊時閃一下的小圈：{ x, y, t, f }
};
const padEl = $('#pad'), pzEl = $('#pz');

function showTouch() {
  if (touchShown) return;
  touchShown = true; padEl.hidden = false; $('#app').classList.add('touch'); skipBtn.textContent = t('skip');
  if (S.mode === 'play') setupTouchExtras();
}
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) showTouch();
window.addEventListener('touchstart', showTouch, { passive: true });

// 傾斜量：拖越遠傾越多，約 R 像素按滿；超過就把中心跟著拖，往回拉時馬上有反應
const leanRange = () => clamp(Math.min(W, H) * 0.2, 50, 100);
const LEAN_DEAD = 6;
function updateLean() {
  const L = TT.lean;
  if (!L) { TT.want = 0; return; }
  const R = leanRange();
  let dx = L.x - L.x0;
  if (Math.abs(dx) > R) { L.x0 = L.x - Math.sign(dx) * R; dx = L.x - L.x0; }
  TT.want = Math.sign(dx) * clamp((Math.abs(dx) - LEAN_DEAD) / (R - LEAN_DEAD), 0, 1);
}
function touchLean() { return TT.want; }

// 右半邊：最下面一條是後煞，其餘左右兩塊是左腳、右腳
const brakeH = () => Math.max(64, H * 0.24);
function rightKind(x, y) { return y > H - brakeH() ? 'brake' : x < W * 0.75 ? 'L' : 'R'; }
function syncBrake() {
  const on = [...TT.right.values()].some(f => f.kind === 'brake');
  if (on && !K.rear) press('rear'); else if (!on && K.rear) release('rear');
}

function padXY(e) { const r = padEl.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
padEl.addEventListener('pointerdown', e => {
  e.preventDefault(); sfx.init();
  if (S.mode !== 'play') return;
  try { padEl.setPointerCapture(e.pointerId); } catch {}
  const [x, y] = padXY(e);
  if (x < W / 2) {
    if (!TT.lean) { TT.lean = { id: e.pointerId, x0: x, y0: y, x, y }; updateLean(); }
    return;
  }
  const kind = rightKind(x, y);
  TT.right.set(e.pointerId, { kind, y0: y });
  if (kind === 'brake') syncBrake();
  else {
    press(kind); release(kind);
    TT.marks.push({ x, y, t: performance.now(), f: kind });
    navigator.vibrate?.(8);
  }
});
padEl.addEventListener('pointermove', e => {
  const [x, y] = padXY(e);
  if (TT.lean && TT.lean.id === e.pointerId) { TT.lean.x = x; TT.lean.y = y; updateLean(); return; }
  const f = TT.right.get(e.pointerId);
  // 踩踏的手指往下滑就變成後煞，放開才停
  if (f && f.kind !== 'brake' && y - f.y0 > 36) { f.kind = 'brake'; syncBrake(); }
});
function padUp(e) {
  if (TT.lean && TT.lean.id === e.pointerId) { TT.lean = null; updateLean(); }
  if (TT.right.delete(e.pointerId)) syncBrake();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => padEl.addEventListener(t, padUp));
padEl.addEventListener('contextmenu', e => e.preventDefault());

function touchReset() { TT.lean = null; TT.want = 0; TT.right.clear(); TT.marks.length = 0; }

// ─────────────────────────── 依章節出現的小按鈕 ───────────────────────────
function bindTouch(b) {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on'); sfx.init(); if (S.mode === 'play') press(k); });
  const up = () => { b.classList.remove('on'); release(k); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
}
function setupTouchExtras() {
  const c = CH[S.ch], btns = [];
  if (c.footStart) btns.push(['crank', 'tbCrank'], ['foot', 'tbFoot']);
  if (c.id === 2) btns.push(['front', 'tbFront']);
  if (c.gears) btns.push(['gearDown', 'tbLow'], ['gearUp', 'tbHigh']);
  if (c.safety) btns.push(['sigL', 'tbSigL'], ['sigR', 'tbSigR'], ['bell', 'tbBell']);
  if (c.wet) btns.push(['light', 'tbLight']);
  txEl.innerHTML = btns.map(([k, key]) => `<button class="tb" data-k="${k}">${t(key)}</button>`).join('');
  txEl.querySelectorAll('[data-k]').forEach(bindTouch);
  txEl.hidden = !(touchShown && btns.length);
}
pzEl.addEventListener('click', () => { if (S.mode === 'play') togglePause(); });

// 每一幀同步按鈕狀態（放腳、車燈亮著時標成黃色；暫停鈕蓋在章節名稱上）
function syncTouchDOM(labelW) {
  const playing = touchShown && S.mode === 'play';
  if (pzEl.hidden === playing) pzEl.hidden = !playing;
  if (playing && pzEl.style.width !== labelW + 'px') pzEl.style.width = labelW + 'px';
  if (txEl.hidden) return;
  for (const b of txEl.children) {
    const lit = b.dataset.k === 'foot' ? S.footDown : b.dataset.k === 'light' ? S.light : false;
    if (b.classList.contains('lit') !== lit) b.classList.toggle('lit', lit);
    // 腳踩著地時，同一顆按鈕是「起步」（蹬地）
    if (b.dataset.k === 'foot') { const tx = t(S.footDown && S.v < 0.3 ? 'tbPush' : 'tbFoot'); if (b.textContent !== tx) b.textContent = tx; }
  }
}

// ─────────────────────────── 觸控時畫在畫面上的指示 ───────────────────────────
function drawTouchUI() {
  const now = performance.now(), c = CH[S.ch], dark = SCENES[c.scene].dark;
  const faint = dark ? 'rgba(238,243,248,.32)' : 'rgba(30,43,51,.28)';
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // 右半邊的區域提示：只有很淡的字和煞車區的淡色底
  const bh = brakeH();
  ctx.fillStyle = dark ? 'rgba(238,243,248,.06)' : 'rgba(30,43,51,.06)';
  rr(W / 2 + 8, H - bh + 6, W / 2 - 16, bh - 12, 16); ctx.fill();
  ctx.font = `900 13px ${FONT}`; ctx.fillStyle = faint;
  ctx.fillText(t(K.rear ? 'tzBraking' : 'tzBrake'), W * 0.75, H - bh / 2);
  ctx.fillText(t('tzLeft'), W * 0.625, H - bh - 18); ctx.fillText(t('tzRight'), W * 0.875, H - bh - 18);

  // 左手：按下的位置畫一條弧線，亮的那段是現在的傾斜量
  const L = TT.lean;
  if (L) {
    const R = leanRange(), cx = L.x0, cy = L.y0 + R * 0.55, span = 0.9;
    const a0 = -Math.PI / 2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, a0 - span, a0 + span); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 8; ctx.stroke();
    if (Math.abs(TT.want) > 0.01) {
      const a1 = a0 + TT.want * span;
      ctx.beginPath(); ctx.arc(cx, cy, R, Math.min(a0, a1), Math.max(a0, a1)); ctx.strokeStyle = Math.abs(TT.want) > 0.95 ? RED : YEL; ctx.lineWidth = 8; ctx.stroke();
    }
    const ka = a0 + TT.want * span;
    ctx.beginPath(); ctx.arc(cx + R * Math.cos(ka), cy + R * Math.sin(ka), 11, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  } else if (c.id === 1 && S.t < 7) drawThumbHint(now);

  // 右手：點一下閃一個圈，連續好節奏時圈裡顯示次數
  TT.marks = TT.marks.filter(m => now - m.t < 320);
  for (const m of TT.marks) {
    const k = (now - m.t) / 320;
    ctx.beginPath(); ctx.arc(m.x, m.y, 18 + 26 * k, 0, TAU);
    ctx.strokeStyle = `rgba(244,197,66,${0.9 * (1 - k)})`; ctx.lineWidth = 5; ctx.stroke();
    if (S.combo >= 3) { ctx.font = `800 16px ${NUMF}`; ctx.fillStyle = `rgba(226,72,61,${1 - k})`; ctx.fillText(`×${S.combo}`, m.x, m.y - 34); }
  }
  ctx.restore();
}

// 第 1 章開頭：半透明的拇指示範「左手左右拖、右手左右交替點」
function drawThumbHint(now) {
  const sec = now / 1000, a = Math.min(1, S.t / 0.5) * Math.min(1, (7 - S.t) / 1);
  const thumb = (x, y, r, alpha) => {
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r, 0, 0, TAU);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
    ctx.strokeStyle = `rgba(30,43,51,${alpha})`; ctx.lineWidth = 2; ctx.stroke();
  };
  const lx = W * 0.22 + Math.sin(sec * 2.4) * 34, ly = H * 0.72;
  ctx.beginPath(); ctx.moveTo(W * 0.22 - 44, ly + 30); ctx.lineTo(W * 0.22 + 44, ly + 30);
  ctx.strokeStyle = `rgba(255,255,255,${0.6 * a})`; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
  thumb(lx, ly, 22, 0.55 * a);
  const beat = Math.floor(sec * 2) % 2, p = (sec * 2) % 1;
  [W * 0.625, W * 0.875].forEach((x, i) => thumb(x, H * 0.55 + (i === beat ? p * 6 : 0), 20, (i === beat ? 0.6 : 0.25) * a));
  ctx.font = `900 14px ${FONT}`; ctx.fillStyle = `rgba(30,43,51,${0.8 * a})`;
  ctx.fillText(t('thumbLean'), W * 0.22, ly - 40);
  ctx.fillText(t('thumbPedal'), W * 0.75, H * 0.55 - 42);
}
