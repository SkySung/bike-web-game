// 遊戲狀態、輸入操作、每一步的物理與各章規則

// ─────────────────────────── 狀態 ───────────────────────────
const K = {};
const S = { mode: 'menu', ch: 0, attempts: 0, frames: [], rp: 0, toastT: {}, flags: {} };

function resetRun() {
  const c = CH[S.ch];
  Object.assign(S, {
    t: 0, x: 0, d: c.startD || 0, psi: 0, v: c.startV || 0, lean: 0, leanV: 0, steer: 0, want: 0, noise: 0,
    crank: c.badCrank ? Math.PI * 1.05 : Math.PI / 3, crankVis: 0,
    lastFoot: null, lastPedalT: -9, lastInt: 0, combo: 0, cad: c.startV ? 0.8 : 0,
    footDown: !!c.footStart, assist: c.id === 1 ? 1 : 0, dadPushing: false, dadX: -0.3, dadV: 0, dadPhase: 0,
    frontHold: 0, pitch: 0, crashT: 0, crashType: null, crashKey: null,
    frames: [], lastRec: -1, stopIdx: 0, toastT: {}, flags: {},
    gear: 2, grade: 0, strain: 0, rearHeat: 0, faded: false,
    sig: 0, sigT: -9, light: false, safety: 100, hzDone: new Set(), slick: 0, grip: 0,
    tl: (c.lights || []).map(() => ({ ph: 'green', t: 0, wait: 0, trig: false })),
    ped: { d: -5.5, v: 0, active: false, rung: false, gone: false, judged: false }, doorOpen: false
  });
  if (c.startV) S.lastPedalT = 0;
  cam.x = S.d; cam.rise = BikeCamera.riseTarget(ROADS[S.ch], S.x, CAM);
  S.crankVis = S.crank;
}

// ─────────────────────────── 操作 ───────────────────────────
function pedal(f) {
  if (S.mode !== 'play' || S.crashT) return;
  const c = CH[S.ch];
  S.footDown = false;
  if (c.id === 1 && !S.dadPushing) { S.dadPushing = true; toast('爸爸扶著你往前推，繼續 A、D 交替踩！'); }
  if (S.lastFoot === f) {
    S.v *= 0.85; S.combo = 0; S.leanV += (Math.random() - 0.5) * 0.6;
    toastOnce('same', '同一隻腳連踩，踏板卡住了！要 A、D 左右交替', 2.5);
    sfx.clunk(); return;
  }
  const interval = S.t - S.lastPedalT;
  if (S.lastFoot && interval < 1.2 && S.lastInt > 0 && Math.abs(interval - S.lastInt) / S.lastInt < 0.3) S.combo++;
  else if (interval >= 1.2) S.combo = 0;
  // 踩踏頻率（每秒幾下），平滑處理；太久沒踩就重新計算
  S.cad = interval < 3 ? (S.cad ? S.cad * 0.5 + (1 / interval) * 0.5 : 1 / interval) : 0.6;
  S.lastInt = interval; S.lastPedalT = S.t; S.lastFoot = f;

  let imp;
  if (S.v < 0.6) {
    // 起步：看踩下去的那隻腳的踏板在不在「兩點鐘」附近
    const a = norm(S.crank + (f === 'L' ? Math.PI : 0));
    if (a > 0.3 && a < 1.8) {
      imp = 2.2;
      if (c.id === 2) toast('漂亮的起步！踏板在高位，第一腳最有力');
    } else {
      imp = 0.7; S.leanV += (Math.random() < 0.5 ? -1 : 1) * 0.5;
      if (c.id >= 2) toastOnce('lowstart', '踏板在低位，起步沒力又搖晃。停下時按 ↑ 把踏板轉到約 2 點鐘', 4, 3400);
    }
  } else imp = 0.12;
  S.v += imp / Math.max(1, S.strain);
  S.crank += Math.PI;
  sfx.pedal(f, S.combo);
}
function toggleFoot() {
  if (S.mode !== 'play' || S.crashT) return;
  S.footDown = !S.footDown; sfx.tick();
}
function adjustCrank() {
  if (S.mode !== 'play' || S.crashT) return;
  if (S.v < 0.6) { S.crank -= Math.PI / 6; sfx.tick(); }
  else toastOnce('crankmove', '騎行中不用調踏板，停下來再轉', 4);
}
function setGear(g) {
  if (!CH[S.ch].gears || S.mode !== 'play') return;
  g = clamp(g, 0, 4); if (g === S.gear) return;
  S.gear = g; sfx.shift();
}
function signal(dir) {
  if (S.mode !== 'play' || S.crashT) return;
  S.sig = dir; S.sigT = S.t; sfx.tick();
}
function toggleLight() {
  if (S.mode !== 'play' || !CH[S.ch].wet) return;
  S.light = !S.light; sfx.tick();
  toast(S.light ? '車燈打開了，前面的路看得清楚多了' : '車燈關掉了', 1600);
}
function ringBell() {
  sfx.bell();
  const c = CH[S.ch];
  if (S.mode === 'play' && c.zebra != null && S.ped.active && !S.ped.gone && !S.ped.rung && S.x > c.zebra - 32 && S.x < c.zebra + 1) {
    S.ped.rung = true; S.ped.v = 2.6;
    toast('行人聽到鈴聲，加快腳步通過了', 2400);
  }
}

const KEYMAP = {
  KeyA: 'L', KeyD: 'R', ArrowLeft: 'left', ArrowRight: 'right', KeyS: 'rear', ArrowDown: 'rear', KeyW: 'front',
  KeyF: 'foot', ArrowUp: 'crank', Space: 'bell', KeyZ: 'gearDown', KeyX: 'gearUp',
  Digit1: 'g1', Digit2: 'g2', Digit3: 'g3', Digit4: 'g4', Digit5: 'g5', KeyQ: 'sigL', KeyE: 'sigR', KeyL: 'light'
};
function press(a) {
  if (K[a]) return; K[a] = true;
  if (a === 'L' || a === 'R') pedal(a);
  else if (a === 'foot') toggleFoot();
  else if (a === 'crank') adjustCrank();
  else if (a === 'bell') ringBell();
  else if (a === 'gearDown') setGear(S.gear - 1);
  else if (a === 'gearUp') setGear(S.gear + 1);
  else if (a[0] === 'g' && a.length === 2) setGear(+a[1] - 1);
  else if (a === 'sigL') signal(-1);
  else if (a === 'sigR') signal(1);
  else if (a === 'light') toggleLight();
}
function release(a) { K[a] = false; }
function clearKeys() { for (const k in K) K[k] = false; document.querySelectorAll('.tb.on').forEach(b => b.classList.remove('on')); }

window.addEventListener('keydown', e => {
  if (S.mode === 'replay' && ['Enter', 'Space', 'Escape'].includes(e.code)) { e.preventDefault(); skipReplay(); return; }
  if (e.code === 'Escape') { e.preventDefault(); togglePause(); return; }
  if (e.code === 'Enter' && !ov.hidden) {
    const p = ov.querySelector('[data-primary]'); if (p) { e.preventDefault(); p.click(); } return;
  }
  if (e.code === 'KeyM') { sfx.muted = !sfx.muted; toast(sfx.muted ? '已靜音（M 恢復）' : '已開啟音效', 1400); return; }
  const a = KEYMAP[e.code]; if (!a) return;
  e.preventDefault();
  if (e.repeat) return;
  if (S.mode === 'play') press(a);
});
window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) release(a); });
window.addEventListener('blur', () => { clearKeys(); if (S.mode === 'play') togglePause(); });

let touchShown = false;
function showTouch() { if (touchShown) return; touchShown = true; touchEl.hidden = false; }
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) showTouch();
window.addEventListener('touchstart', showTouch, { passive: true });
function bindTouch(b) {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on'); sfx.init(); if (S.mode === 'play') press(k); });
  const up = () => { b.classList.remove('on'); release(k); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
}
touchEl.querySelectorAll('[data-k]').forEach(bindTouch);
function setupTouchExtras() {
  const c = CH[S.ch], btns = [];
  if (c.gears) btns.push(['gearDown', 'Z 輕檔'], ['gearUp', 'X 重檔']);
  if (c.safety) btns.push(['sigL', 'Q 左手勢'], ['sigR', 'E 右手勢'], ['bell', '鈴 🔔']);
  if (c.wet) btns.push(['light', 'L 車燈']);
  txEl.innerHTML = btns.map(([k, t]) => `<button class="tb" data-k="${k}">${t}</button>`).join('');
  txEl.querySelectorAll('[data-k]').forEach(bindTouch);
  txEl.hidden = !(touchShown && btns.length);
}
skipBtn.addEventListener('click', () => skipReplay());

// ─────────────────────────── 物理與規則 ───────────────────────────
function crash(type) {
  if (S.crashT) return;
  const road = ROADS[S.ch];
  let key = type;
  if (type === 'lean') {
    const curvy = Math.abs(kAt(road, Math.floor(S.x))) > 0 || Math.abs(kAt(road, Math.floor(S.x) + 5)) > 0;
    key = S.slick > 0 ? 'wetslip' : (curvy && S.v >= 2) || S.grip > 1 ? 'slip' : S.v < 0.9 ? 'slow' : (S.lean < 0 ? 'left' : 'right');
  }
  S.crashType = type; S.crashKey = key; S.crashT = 1e-4; S.attempts++;
  if (type === 'flip') S.pitch = Math.max(S.pitch, 0.2);
  hideToast(); sfx.thud();
}

function record(force) {
  if (!force && S.t - S.lastRec < 1 / 60) return;
  S.lastRec = S.t;
  S.frames.push({ x: S.x, d: S.d, psi: S.psi, v: S.v, lean: S.lean, steer: S.steer, want: S.want, crankVis: S.crankVis, pitch: S.pitch,
    footDown: S.footDown, dadX: S.dadX, dadPhase: S.dadPhase, assist: S.assist, t: S.t, sig: S.sig, sigT: S.sigT,
    pedD: S.ped.d, doorOpen: S.doorOpen, camX: cam.x, camH: BikeCamera.height(cam, CAM) });
  if (S.frames.length > 210) S.frames.shift();
}

function move(dt) {
  E.stepMove(S, CH[S.ch], ROADS[S.ch], dt);
  BikeCamera.follow(cam, S.d, dt, CAM);
  BikeCamera.rise(cam, ROADS[S.ch], S.x, dt, CAM);
  S.crankVis += (S.crank - S.crankVis) * Math.min(1, dt * 12);
  if (S.assist > 0.05) { S.dadX = S.x - 0.3; S.dadV = S.v; }
  else { S.dadV = Math.max(0, S.dadV - 2.5 * dt); S.dadX += S.dadV * dt; }
  S.dadPhase += S.dadV * dt * 3.2;
  if (S.ped.active && !S.ped.gone) { S.ped.d += S.ped.v * dt; if (S.ped.d > 5.8) S.ped.gone = true; }
}

function step(dt) {
  const c = CH[S.ch], road = ROADS[S.ch], sc = SCENES[c.scene];
  S.t += dt;

  if (S.crashT) {
    S.crashT += dt;
    if (S.crashType === 'flip') { S.pitch = Math.min(1.9, S.pitch + dt * 4.5); S.v *= Math.pow(0.002, dt); }
    else if (S.crashType === 'overrun' || S.crashType === 'redlight') { S.v = Math.max(0, S.v - 2 * dt); }
    else { S.lean = clamp(S.lean + Math.sign(S.lean || 1) * dt * 3.5, -1.5, 1.5); S.v = Math.max(0, S.v - 6 * dt); }
    // 摔車中：車子順著原本的方向滑停，不再轉向
    S.psi -= S.v * kAt(ROADS[S.ch], Math.floor(S.x)) * dt;   // 世界方向不變，只是道路在彎
    S.x += S.v * Math.cos(S.psi) * dt; S.d += S.v * Math.sin(S.psi) * dt;
    BikeCamera.follow(cam, S.d, dt, CAM);
    BikeCamera.rise(cam, ROADS[S.ch], S.x, dt, CAM);
    record();
    if (S.crashT > 0.8) startReplay();
    return;
  }

  // 方向鍵代表「想往哪邊傾」（+ = 往右）；龍頭怎麼打交給引擎裡的騎士反射（engine.js riderSteer）
  E.smoothInput(S, (K.right ? 1 : 0) - (K.left ? 1 : 0), dt);

  // 煞車：濕地效果變差；一直捏著後煞會過熱
  const wet = c.wet ? 0.6 : 1;
  if (c.gears) {
    if (K.rear && S.v > 1.5) S.rearHeat = Math.min(5, S.rearHeat + dt); else S.rearHeat = Math.max(0, S.rearHeat - dt * 1.5);
    if (S.rearHeat > 3.5 && !S.faded) { S.faded = true; toast('煞車一直捏著過熱了，越來越煞不住！放開讓它冷卻，改成一下一下點放', 3600); }
    if (S.faded && S.rearHeat < 1) S.faded = false;
  }
  const frontLimit = c.wet ? 2.5 : 3.4;
  if (K.front) {
    if (S.v > frontLimit) S.frontHold += dt; else S.frontHold = Math.max(0, S.frontHold - dt);
    if (S.v > 2.5) toastOnce('front', c.wet ? '雨天前煞很容易打滑！改用 S 後煞' : '前煞很猛！高速時用力按會翻車，主要用 S 後煞', 8);
  } else S.frontHold = Math.max(0, S.frontHold - dt * 2);
  S.pitch = c.wet ? 0 : S.frontHold * 0.4;
  if (S.frontHold > (c.wet ? 0.25 : 0.35)) return crash(c.wet ? 'wetfront' : 'flip');
  if (S.footDown && S.v > 2.3) return crash('foot');

  const info = E.stepSpeed(S, c, road, {
    pedaling: S.t - S.lastPedalT < E.P.PEDAL_WINDOW, rear: K.rear, front: K.front,
    rearEff: wet * (S.faded ? 0.35 : 1), frontEff: wet
  }, dt);
  S.grade = info.grade; S.strain = info.strain; S.target = info.target;
  if (c.id === 1 && S.dadPushing && S.assist > 0) S.v = Math.max(S.v, 1.4 * S.assist);

  if (E.stepLean(S, c, dt)) return crash('lean');
  if (S.grip > 0.85 && S.v > 2)
    toastOnce('grip', c.wet ? '雨天輪胎快抓不住了！少傾一點、先減速' : '太快了，輪胎快抓不住！先減速再轉', 6, 2200);
  if (c.turn < 1 && S.assist < 0.5 && Math.abs(S.lean) > 0.4 && S.v > 0.9)
    toastOnce('lean', S.lean < 0 ? '往左倒了！按 → 把車扶正' : '往右倒了！按 ← 把車扶正', 4, 1800);

  move(dt);
  if (c.turn === 1 && Math.abs(S.d) > sc.half + 0.35) return crash('offroad');

  if (c.id === 1) rulesYard(c);
  else if (c.id === 2) { if (rulesStreet(c)) return; }
  else if (c.id === 3) rulesPark(c, road);
  else if (c.id === 4) { if (rulesHills(c, road)) return; }
  else if (c.id === 5) { if (rulesCity(c, road, dt)) return; }
  else if (c.id === 6) { if (rulesNight(c, road)) return; }
  if (S.mode !== 'play' || S.crashT) return;
  if (S.x >= c.goal) return win();
  record();
}

function rulesYard() {
  if (S.dadPushing && S.x > 20) S.assist = Math.max(0, 1 - (S.x - 20) / 26);
  if (!S.flags.steer && S.x > 5) { S.flags.steer = 1; toast('車往左倒就按 →、往右倒就按 ←，把車扶正', 3400); }
  if (!S.flags.release && S.x > 38) { S.flags.release = 1; toast('爸爸偷偷放手了！你自己在騎了！', 3400); sfx.ding(); }
  if (!S.flags.fast && S.x > 66) { S.flags.fast = 1; toast('發現了嗎？騎快一點，車子反而更穩'); }
}

function rulesStreet(c) {
  const z = c.stops[S.stopIdx];
  if (z == null) return false;
  if (!S.flags['near' + S.stopIdx] && S.x > z - 16) { S.flags['near' + S.stopIdx] = 1; toast('前方停車格：按住 S 後煞減速，快停住時按 F 伸腳', 3400); }
  if (S.x >= z - 0.3 && S.x <= z + ZONE && S.v < 0.05 && S.footDown) {
    S.stopIdx++; sfx.ding();
    toast(S.stopIdx < c.stops.length ? `第 ${S.stopIdx} 次停車成功！起步前先看踏板鐘` : '三次停車都成功！騎到終點', 3200);
  } else if (S.x > z + ZONE + 0.4) { crash('overrun'); return true; }
  return false;
}

function rulesPark(c, road) {
  for (const cvv of road.curves) {
    const k = 'curve' + cvv.s;
    if (!S.flags[k] && S.x > cvv.s - 11 && S.x < cvv.s) {
      S.flags[k] = 1;
      toast(cvv.dir > 0 ? '前方右彎：按住 → 讓車身往右傾，過完彎就放開' : '前方左彎：按住 ← 讓車身往左傾，過完彎就放開', 3200);
    }
    if (cvv.R < 10 && S.x > cvv.s - 15 && S.x < cvv.s + 5 && S.v > 4.6) toastOnce('fast', '這是急彎！先按 S 減速', 5);
  }
  if (!S.flags.intro2 && S.t > 3.5) { S.flags.intro2 = 1; toast('轉彎靠傾斜：按住方向鍵讓車身傾斜，傾斜越多轉得越急', 3600); }
}

function rulesHills(c, road) {
  const gAhead = E.segAt(road.gr, S.x + 12);
  const pedaling = S.t - S.lastPedalT < E.P.PEDAL_WINDOW;
  if (gAhead > 0.04 && S.grade <= 0.03 && S.gear > 1) toastOnce('up', `前面上坡 ${Math.round(gAhead * 100)}%：按 Z 換到輕檔（1、2 檔）`, 8, 3200);
  if (gAhead < -0.04 && S.grade >= -0.03) toastOnce('down', '前面下坡：換重檔（X），用 S 一下一下點放煞車控制速度', 8, 3400);
  if (pedaling && S.strain > 1.15) toastOnce('strain', '踩不動了！按 Z 換輕檔', 4);
  if (pedaling && S.grade <= 0 && S.gear <= 1 && S.v > S.target + 0.5) toastOnce('spin', '檔位太輕，腳在空轉。按 X 換重檔', 6);
  let inZone = null;
  for (const z of road.zones) if (S.x > z.s0 && S.x < z.s1) inZone = z;
  // 限速是建議：太快的話要傾很多才轉得過去，輪胎抓地力不夠就會開始晃、打滑（engine.js 的抓地力模型）
  if (inZone && S.v * 3.6 > inZone.lim + 2) toastOnce('over', `超過彎道建議速度 ${inZone.lim} km/h，點放 S 煞車`, 4, 1800);
  for (const z of road.zones) {
    if (!S.flags['lim' + z.s0] && S.x > z.s0 - 25 && S.x < z.s0) { S.flags['lim' + z.s0] = 1; toast(`前方下坡彎道限速 ${z.lim} km/h，現在開始點放煞車`, 3000); }
  }
  return false;
}

function rulesCity(c, road, dt) {
  // 紅綠燈：接近時變黃再變紅；在停止線前停好等一下就會變綠
  c.lights.forEach((L, i) => {
    const tl = S.tl[i];
    if (!tl.trig && S.x > L - 34) { tl.trig = true; tl.ph = 'yellow'; tl.t = 0; toast('前面變黃燈了！準備在停止線前停下（S 煞車、F 放腳）', 3200); }
    tl.t += dt;
    if (tl.ph === 'yellow' && tl.t > 2) { tl.ph = 'red'; tl.t = 0; }
    if (tl.ph === 'red') {
      if (S.v < 0.05 && S.x < L && S.x > L - 16) {
        tl.wait += dt;
        if (tl.wait > 2.5) { tl.ph = 'green'; sfx.ding(); toast('綠燈了！起步（記得先看踏板鐘）', 2600); }
      }
      if (S.x > L + 0.3) { S.flags.crashLight = true; crash('redlight'); }
    }
  });
  if (S.crashT) return true;
  // 斑馬線行人
  const P = S.ped, zs = c.zebra + 2;
  if (!P.active && S.x > zs - 26) { P.active = true; P.v = 1.1; toast('斑馬線有行人！按空白鍵按鈴提醒，並減速禮讓', 3200); }
  if (P.active && !P.gone && Math.abs(S.x - zs) < 0.7 && Math.abs(S.d - P.d) < 0.75) { crash('pedestrian'); return true; }
  if (P.active && !P.judged && S.x > zs + 1) {
    P.judged = true;
    if (!P.rung && !P.gone) { S.safety -= 10; toast('經過行人前要先按鈴、放慢（安全分數 −10）', 2600); sfx.buzz(); }
    else if (P.rung) toast('按鈴提醒、禮讓行人，做得好！', 2000);
  }
  // 轉彎手勢
  for (const cvv of road.curves) {
    const k = 'sig' + cvv.s, name = cvv.dir > 0 ? '右' : '左', key = cvv.dir > 0 ? 'E' : 'Q';
    if (!S.flags[k + 'hint'] && S.x > cvv.s - 36) { S.flags[k + 'hint'] = 1; toast(`前面路口${name}轉：先按 ${key} 伸${name}手示意，再傾斜轉彎`, 3400); }
    if (!S.flags[k] && S.sigT > 0 && S.x > cvv.s - 32 && S.x < cvv.s + 2 && S.t - S.sigT < 0.05) {
      if (S.sig === cvv.dir) { S.flags[k] = 'ok'; toast('手勢正確！', 1400); }
      else if (!S.flags[k + 'wrong']) { S.flags[k + 'wrong'] = 1; S.safety -= 5; toast(`方向打錯了，${name}轉要按 ${key}（安全分數 −5）`, 2400); sfx.buzz(); }
    }
    if (!S.flags[k] && S.x > cvv.s + 1) { S.flags[k] = 'miss'; S.safety -= 15; toast(`轉彎前忘了打手勢（安全分數 −15）`, 2600); sfx.buzz(); }
  }
  // 路邊停車與車門
  const [p0, p1] = c.parked;
  if (!S.flags.parkHint && S.x > p0 - 18) { S.flags.parkHint = 1; toast('路邊停車區：往左騎一點，和車子保持一公尺', 3200); }
  if (!S.doorOpen && S.x > c.door - 9) { S.doorOpen = true; sfx.creak(); }
  if (S.x > p0 - 2.5 && S.x < p1 + 2.5 && S.d > 2.5) { crash('door'); return true; }
  if (S.doorOpen && Math.abs(S.x - (c.door + 0.9)) < 0.45 && S.d > 1.5) { crash('door'); return true; }
  if (!S.flags.doorOk && S.x > c.door + 2) { S.flags.doorOk = 1; toast('車門突然打開了，還好你離得夠遠！', 2400); }
  return false;
}

function rulesNight(c, road) {
  if (!S.light && S.t > 1.2) toastOnce('light', '天黑又下雨，按 L 打開車燈！', 7, 3000);
  // 輪子壓在水坑、人孔蓋上時抓地力變差，離開就恢復（跟畫面一致）
  S.slick = road.hazards.some(hz => Math.abs(S.x - hz.s) < (hz.k === 'puddle' ? 0.9 : 0.45) && Math.abs(S.d - hz.d) < (hz.k === 'puddle' ? 1.0 : 0.45)) ? 1 : 0;
  for (const hz of road.hazards) {
    if (S.hzDone.has(hz)) continue;
    if (!S.flags.hzHint && S.light && S.x > hz.s - 18) { S.flags.hzHint = 1; toast('前面有水窪和人孔蓋：經過時保持直立、不要轉向或煞車，也可以繞開', 3400); }
    if (Math.abs(S.x - hz.s) < 0.5 && Math.abs(S.d - hz.d) < 0.9) {
      S.hzDone.add(hz);
      // 踩上去不會直接摔：車身會突然晃一下、抓地力暫時大降；傾越多、還在煞車就越危險
      E.hitSlick(S, Math.random, K.front || (K.rear && S.v > 3));
      if (hz.k === 'puddle') { S.v *= 0.9; sfx.splash(); } else sfx.clunk();
      toastOnce('slick', Math.abs(S.lean) > 0.2 ? '濕滑！傾斜時踩到最危險，快扶正' : '好滑！保持直立就能穩住', 5, 1800);
    } else if (S.x > hz.s + 1) S.hzDone.add(hz);
  }
  return false;
}
