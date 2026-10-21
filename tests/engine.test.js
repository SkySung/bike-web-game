// 執行：node --test tests/   或用瀏覽器打開 tests/index.html
const IN_NODE = typeof module === 'object' && typeof require === 'function';
const { test, assert, E, C } = IN_NODE
  ? { test: require('node:test'), assert: require('node:assert'), E: require('../engine.js'), C: require('../js/camera.js') }
  : window.__T;

const DT = 1 / 60;
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

function newRider(over = {}) {
  return { x: 0, d: 0, psi: 0, v: 0, lean: 0, leanV: 0, steer: 0, noise: 0, assist: 0, footDown: false, gear: 2, cad: 0, combo: 0, ...over };
}

// 模擬玩家：方向鍵代表「想往哪邊傾」，+1 = 按住 →、-1 = 按住 ←。
// 想要某個傾角時，用按鍵的比例去逼近（等同玩家輕點）。
function keysForLean(target) { return Math.max(-1, Math.min(1, target / E.P.LEAN_TARGET)); }

// 用踏頻維持大約某個速度（等同玩家穩定地交替踩踏）
function cadFor(v, gear = 2) { return E.cadenceFor(v, gear); }

function uTurn(dir, speed) {
  const c = { turn: 1, noise: 0, vmax: 7 };
  const track = E.buildTrack([{ L: 400 }]);
  const st = newRider({ v: speed, cad: cadFor(speed) });
  let minD = 0, maxD = 0, maxX = 0, t = 0, crashed = false;
  while (Math.abs(st.psi) < Math.PI && t < 10) {
    E.smoothInput(st, dir, DT);   // 一直按住方向鍵
    E.stepSpeed(st, c, track, { pedaling: true }, DT);
    if (E.stepLean(st, c, DT)) { crashed = true; break; }
    E.stepMove(st, c, track, DT);
    minD = Math.min(minD, st.d); maxD = Math.max(maxD, st.d); maxX = Math.max(maxX, st.x);
    t += DT;
  }
  return { crashed, t, turned: Math.abs(st.psi), width: maxD - minD, depth: maxX, endLean: st.lean };
}

test('做得到原地迴轉：往右 180° 迴轉，迴轉寬度小於 4 公尺', () => {
  const r = uTurn(1, 2.5);
  assert.equal(r.crashed, false, '迴轉途中摔車了');
  assert.ok(r.turned >= Math.PI, `只轉了 ${(r.turned * 180 / Math.PI).toFixed(0)}°`);
  assert.ok(r.width < 4, `迴轉寬度 ${r.width.toFixed(2)} m 太大`);
  assert.ok(r.t < 6, `花了 ${r.t.toFixed(1)} 秒`);
});

test('做得到原地迴轉：往左 180° 迴轉，迴轉寬度小於 4 公尺', () => {
  const r = uTurn(-1, 2.5);
  assert.equal(r.crashed, false, '迴轉途中摔車了');
  assert.ok(r.turned >= Math.PI);
  assert.ok(r.width < 4, `迴轉寬度 ${r.width.toFixed(2)} m 太大`);
});

test('慢速（約 7 km/h）也能迴轉，而且迴轉寬度更小', () => {
  const slow = uTurn(1, 2.0), fast = uTurn(1, 3.5);
  assert.equal(slow.crashed, false);
  assert.ok(slow.turned >= Math.PI);
  assert.ok(slow.width < fast.width, `慢速 ${slow.width.toFixed(2)} m 應小於快速 ${fast.width.toFixed(2)} m`);
});

test('迴轉寬度在公園步道內（道路寬 7 公尺）', () => {
  for (const v of [2, 2.5, 3, 3.5]) {
    const r = uTurn(1, v);
    assert.ok(r.width < 7, `${(v * 3.6).toFixed(0)} km/h 迴轉寬度 ${r.width.toFixed(2)} m 超出步道`);
  }
});

// 沿著賽道自動騎：看前方彎道曲率決定目標傾角，同時修正偏離與航向
function autopilot(trackName, { seed = 1, half = 3.5, vCruise = 3.5, vLimit = null, autoGear = false, noise = 0.4, wet = false } = {}) {
  const c = { turn: 1, noise, vmax: 7, wet };
  const track = E.buildTrack(E.TRACKS[trackName], 40);
  const st = newRider({ v: 3, cad: cadFor(vCruise) });
  const rnd = rng(seed);
  let t = 0, maxOff = 0;
  while (st.x < track.len && t < 200) {
    if (autoGear) {
      const g = E.segAt(track.gr, st.x + 6);
      let best = 0;
      for (let i = 0; i < 5; i++) if (E.strain(i, g) < 0.95) best = i;
      st.gear = best; st.cad = cadFor(vCruise, best);
    }
    const kAhead = E.segAt(track.k, st.x + st.v * 1.0);   // 像玩家一樣看前方約 1 秒的路
    // 預判：用現在的轉彎量推算 1 秒後車頭的方向再修正（車身傾斜要約 1 秒才跟上，不預判會越修越晃）
    const psiAhead = st.psi + (E.turnRate(st, c) - st.v * E.segAt(track.k, st.x)) * 1.0;
    const wantK = kAhead - 0.05 * st.d - 0.35 * psiAhead;
    const target = Math.max(-0.7, Math.min(0.7, Math.atan(wantK * st.v * st.v / 9.8)));
    E.smoothInput(st, keysForLean(target), DT);
    const lim = vLimit ?? vCruise + 1;
    E.stepSpeed(st, c, track, { pedaling: st.v < vCruise, rear: st.v > lim }, DT);
    if (E.stepLean(st, c, DT, rnd)) return { ok: false, why: 'crash', x: st.x };
    E.stepMove(st, c, track, DT);
    maxOff = Math.max(maxOff, Math.abs(st.d));
    if (Math.abs(st.d) > half + 0.35) return { ok: false, why: 'offroad', x: st.x, maxOff };
    t += DT;
  }
  return { ok: st.x >= track.len, t, maxOff };
}

test('第 3 章公園步道（含 170° 髮夾彎）可以騎完', () => {
  for (const seed of [1, 7, 42]) {
    const r = autopilot('park', { seed });
    assert.ok(r.ok, `seed ${seed}：${r.why} @ ${r.x?.toFixed(1)} m`);
  }
});

test('第 4 章：上坡用輕檔踩得動，用重檔踩不動', () => {
  assert.ok(E.strain(0, 0.09) < 1, '1 檔爬 9% 應該踩得動');
  assert.ok(E.strain(4, 0.09) > 1, '5 檔爬 9% 應該踩不動');
  assert.ok(E.strain(4, 0) < 1, '平路用 5 檔應該踩得動');
});

test('第 4 章丘陵路線：會換檔、下坡控速就能騎完', () => {
  const r = autopilot('hills', { autoGear: true, vCruise: 3.5, vLimit: 4.0 });
  assert.ok(r.ok, `${r.why} @ ${r.x?.toFixed(1)} m`);
});

test('第 5、6 章路線可以騎完', () => {
  assert.ok(autopilot('city', { half: 4.5, vCruise: 3 }).ok, '城市路線');
  assert.ok(autopilot('night', { vCruise: 3.5, noise: 0.6, wet: true }).ok, '雨夜路線（濕地抓地力）');
});

test('60 拍（每秒一下）的踩踏能維持約 14 km/h', () => {
  const c = { turn: 1, noise: 0, vmax: 7 };
  const track = E.buildTrack([{ L: 500 }]);
  const st = newRider({ v: 0, cad: 1 });
  for (let t = 0; t < 12; t += DT) E.stepSpeed(st, c, track, { pedaling: true }, DT);
  assert.ok(Math.abs(st.v * 3.6 - 14) < 1.5, `穩定速度 ${(st.v * 3.6).toFixed(1)} km/h`);
});

// 不碰方向鍵、只維持速度，看多久會倒（第 1 章的擾動最大，noise = 1.0）
function handsOff(speed, seconds, seed) {
  const c = { turn: 0.35, noise: 1.0, vmax: 7, dLim: [-4, 4] };
  const track = E.buildTrack([{ L: 2000 }]);
  const st = newRider({ v: speed, cad: cadFor(speed) });
  const rnd = rng(seed);
  for (let t = 0; t < seconds; t += DT) {
    st.v = speed;   // 固定車速，只看平衡
    if (E.stepLean(st, c, DT, rnd)) return t;
    E.stepMove(st, c, track, DT);
  }
  return null;
}

test('速度越快，隨機晃動的影響越小', () => {
  assert.ok(E.noiseScale(5) < E.noiseScale(2) && E.noiseScale(2) < E.noiseScale(0));
  assert.ok(E.noiseScale(5) < 0.2, `18 km/h 時擾動還剩 ${(E.noiseScale(5) * 100).toFixed(0)}%`);
});

test('高速（約 18 km/h）不碰方向鍵騎 30 秒也不會倒', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const t = handsOff(5, 30, seed);
    assert.equal(t, null, `seed ${seed} 在 ${t?.toFixed(1)} 秒倒了`);
  }
});

test('中速（約 14 km/h）不碰方向鍵騎 15 秒也不會倒', () => {
  for (const seed of [1, 2, 3]) {
    const t = handsOff(3.9, 15, seed);
    assert.equal(t, null, `seed ${seed} 在 ${t?.toFixed(1)} 秒倒了`);
  }
});

test('慢速（約 2 km/h）不碰方向鍵，20 秒內一定會倒', () => {
  for (const seed of [1, 2, 3]) {
    const t = handsOff(0.5, 20, seed);
    assert.ok(t !== null, `seed ${seed} 騎這麼慢居然沒倒`);
  }
});

// ─────────────── 鏡頭 ───────────────
function viewAt(track, s, camX) {
  const { P, base, n } = C.points(track, s, camX);
  return { P, base, n, F: 600, hor: 250, W: 800 };
}

test('鏡頭只負責從哪裡看：不管鏡頭橫向在哪，車子與路面中心的相對位置都不變', () => {
  const track = E.buildTrack(E.TRACKS.park, 200);
  for (const s of [5, 30.4, 61.7, 95.2]) {       // 直線、彎道中、髮夾彎
    const d = 1.5;
    const gaps = [-2, 0, 1.5, 3].map(camX => {
      const v = viewAt(track, s, camX);
      const bike = C.project(v, s, d), road = C.project(v, s, 0);
      return (bike.x - road.x) / bike.sc;          // 換回公尺
    });
    for (const g of gaps) assert.ok(Math.abs(g - d) < 1e-6, `s=${s}：車子離路中心 ${g.toFixed(3)} m，應為 ${d} m`);
  }
});

test('鏡頭不跟著車頭轉：道路投影只和位置有關', () => {
  const track = E.buildTrack(E.TRACKS.park, 200);
  // points() 的參數裡根本沒有車頭方向；確認同一位置每次算出來都一樣
  const a = viewAt(track, 40.3, 0.5), b = viewAt(track, 40.3, 0.5);
  assert.equal(JSON.stringify(a.P), JSON.stringify(b.P));
  // 車子所在位置的道路方向就是正前方（鏡頭置中時，腳下這段路在畫面正中間往前延伸）
  const c0 = viewAt(track, 40.3, 0);
  const here = C.project(c0, 40.3, 0), ahead = C.project(c0, 40.8, 0);
  assert.ok(Math.abs(here.x - 400) < 0.5 && Math.abs(ahead.x - 400) < 3, `腳下的路偏了 ${(ahead.x - 400).toFixed(1)} px`);
});

test('鏡頭橫向跟隨：會追上車子，而且車子不會離鏡頭中心超過 1.2 公尺', () => {
  const cam = C.create(0);
  let maxGap = 0;
  for (let t = 0; t < 4; t += DT) {
    const d = Math.sin(t * 3) * 3;                  // 車子左右大幅擺動
    C.follow(cam, d, DT);
    maxGap = Math.max(maxGap, Math.abs(d - cam.x));
  }
  assert.ok(maxGap <= C.DEF.maxLag + 1e-9, `最大偏離 ${maxGap.toFixed(2)} m`);
  const cam2 = C.create(0);
  for (let t = 0; t < 3; t += DT) C.follow(cam2, 2, DT);
  assert.ok(Math.abs(cam2.x - 2) < 0.01, '靜止時鏡頭應該追上車子');
});

test('彎道上前進時畫面連續，不會一格一格跳', () => {
  const track = E.buildTrack(E.TRACKS.park, 200);
  const target = 70;                               // 看前方髮夾彎上的一個固定點
  let prev = null, maxJump = 0;
  for (let s = 40; s < 50; s += 0.01) {
    const p = C.project(viewAt(track, s, 0), target, 0);
    if (prev) maxJump = Math.max(maxJump, Math.abs(p.x - prev.x));
    prev = p;
  }
  assert.ok(maxJump < 3, `每前進 1 公分，畫面最多跳了 ${maxJump.toFixed(1)} 像素`);
});

// ─────────────── 轉彎操作 ───────────────
function holdKey(key, seconds, speed = 3.9, st = newRider({ v: speed, cad: cadFor(speed) }), c = { turn: 1, noise: 0, vmax: 7 }, seed = 3) {
  const rnd = rng(seed);
  const track = E.buildTrack([{ L: 2000 }]);
  const log = [];
  let crashed = false;
  for (let t = 0; t < seconds; t += DT) {
    E.smoothInput(st, key, DT);
    st.v = speed;
    if (E.stepLean(st, c, DT, rnd)) { crashed = true; break; }
    E.stepMove(st, c, track, DT);
    log.push({ t, lean: st.lean, wheel: E.frontWheelAngle(st, c), psi: st.psi });
  }
  return { st, log, crashed };
}

test('按住 → 3 秒：車身傾到目標角度就停住，不會一路倒到摔車', () => {
  const { log, crashed } = holdKey(1, 3);
  assert.equal(crashed, false);
  const maxLean = Math.max(...log.map(l => l.lean));
  const tail = log.slice(-30), end = tail.reduce((a, l) => a + l.lean, 0) / tail.length;   // 最後半秒平均
  assert.ok(maxLean < E.P.LEAN_MAX * 0.7, `最大傾角 ${(maxLean * 57.3).toFixed(0)}° 太接近摔車`);
  assert.ok(Math.abs(end - E.P.LEAN_TARGET) < 0.1, `最後傾角 ${(end * 57.3).toFixed(0)}°，目標 ${(E.P.LEAN_TARGET * 57.3).toFixed(0)}°`);
  assert.ok(log[log.length - 1].psi > 1, '按住 → 應該要往右轉');
});

test('按 → 時前輪先往左反打一下，接著轉向右邊撐住傾斜', () => {
  const { log } = holdKey(1, 2);
  const early = Math.min(...log.filter(l => l.t < 0.3).map(l => l.wheel));
  const late = log.filter(l => l.t > 1.5).map(l => l.wheel);
  assert.ok(early < -0.02, `一開始前輪應該往左，實際 ${early.toFixed(3)}`);
  assert.ok(late.every(w => w > 0.02), '傾斜穩定後前輪應該朝右（彎道內側）');
});

test('前輪角度跟畫面上實際的軌跡一致：前兩章轉彎縮小時，按住方向鍵前輪也只轉一點點', () => {
  const c1 = { turn: 0.35, noise: 0, vmax: 5, dLim: [-4, 4] };
  const { log } = holdKey(1, 3, 3, undefined, c1);
  const maxWheel = Math.max(...log.map(l => Math.abs(l.wheel)));
  assert.ok(maxWheel < 0.26, `第 1 章按住 → 前輪轉到 ${(maxWheel * 57.3).toFixed(0)}°，畫面上的軌跡卻幾乎沒彎`);
  // 第 3 章（真實轉彎）：前輪角度大致等於軸距 / 轉彎半徑
  const { st, log: l3 } = holdKey(1, 2);
  const R = st.v / E.turnRate(st, { turn: 1 }), want = Math.atan(E.P.WHEELBASE / R);
  assert.ok(Math.abs(l3[l3.length - 1].wheel - want) < 0.13, `前輪 ${(l3[l3.length - 1].wheel * 57.3).toFixed(0)}°，半徑 ${R.toFixed(1)} m 需要 ${(want * 57.3).toFixed(0)}°`);
});

test('放開方向鍵，車身會自己回正', () => {
  const { st } = holdKey(1, 1.5);
  const { log } = holdKey(0, 2.5, 3.9, st);
  const end = log[log.length - 1].lean;
  assert.ok(Math.abs(end) < 0.05, `放開 2.5 秒後還傾斜 ${(end * 57.3).toFixed(0)}°`);
});

test('踩踏節奏輕鬆就好：45 拍就有 12 km/h 以上，猛按兩倍快只多不到兩成', () => {
  const steady = cad => {
    const c = { turn: 1, noise: 0, vmax: 7 };
    const track = E.buildTrack([{ L: 500 }]);
    const st = newRider({ v: 0, cad });
    for (let t = 0; t < 15; t += DT) E.stepSpeed(st, c, track, { pedaling: true }, DT);
    return st.v * 3.6;
  };
  const relaxed = steady(0.75), normal = steady(1), mash = steady(2);
  assert.ok(relaxed > 12, `45 拍只有 ${relaxed.toFixed(1)} km/h`);
  assert.ok(mash / normal < 1.2, `猛按 ${mash.toFixed(1)} km/h 比 60 拍 ${normal.toFixed(1)} km/h 快太多`);
});

// ─────────────── 低速、抓地力、濕滑處 ───────────────
test('約 2 km/h 按住方向鍵：2 秒內就會倒', () => {
  const { log, crashed } = holdKey(-1, 2, 0.55);
  assert.ok(crashed, '騎這麼慢還能撐 2 秒，太難倒了');
  assert.ok(log.length / 60 < 2);
});

test('低速時轉彎量受龍頭角度限制，倒下前不會原地打橫', () => {
  const { log } = holdKey(-1, 2, 0.55);
  const turned = Math.abs(log[log.length - 1].psi);
  assert.ok(turned < 0.9, `倒下前車頭已經轉了 ${(turned * 57.3).toFixed(0)}°`);
});

test('同樣按住方向鍵，速度越快車身晃得越厲害（抓地力用越多越不穩）', () => {
  const wobble = v => {
    let sum = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const { log } = holdKey(1, 3, v, undefined, undefined, seed);
      const tail = log.slice(-90).map(l => l.leanV ?? 0);
      const lean = log.slice(-90).map(l => l.lean), m = lean.reduce((a, b) => a + b, 0) / lean.length;
      sum += Math.sqrt(lean.reduce((a, b) => a + (b - m) ** 2, 0) / lean.length);
    }
    return sum / 5;
  };
  const slow = wobble(2.5), fast = wobble(5.5);
  assert.ok(fast > slow * 1.3, `快 ${(fast * 57.3).toFixed(2)}° vs 慢 ${(slow * 57.3).toFixed(2)}°`);
});

test('雨天同樣的傾角比乾地更容易打滑', () => {
  const st = { v: 4, lean: 0.38 };
  assert.ok(E.gripUsage(st, { wet: true }) > 1, '雨天全力傾斜應該超過抓地極限');
  assert.ok(E.gripUsage(st, {}) < 1, '乾地全力傾斜應該還抓得住');
});

test('踩到水坑：直立通過大多沒事，傾斜著踩上去容易倒，但都不是一踩就倒', () => {
  const trial = (want, seed) => {
    const c = { turn: 1, noise: 0.6, vmax: 7, wet: true };
    const track = E.buildTrack([{ L: 2000 }]);
    const st = newRider({ v: 3.5, cad: cadFor(3.5) });
    const rnd = rng(seed);
    for (let t = 0; t < 1.5; t += DT) { E.smoothInput(st, want, DT); st.v = 3.5; E.stepLean(st, c, DT, rnd); E.stepMove(st, c, track, DT); }
    E.hitSlick(st, rnd, false);
    for (let t = 0; t < 2.5; t += DT) {
      E.smoothInput(st, 0, DT);           // 踩到之後玩家放開方向鍵
      st.v = 3.5;
      st.slick = t < 2 / 3.5 ? 1 : 0;     // 只有輪子壓在約 2 公尺長的水坑上時抓地力變差
      if (E.stepLean(st, c, DT, rnd)) return true;
      E.stepMove(st, c, track, DT);
    }
    return false;
  };
  const seeds = Array.from({ length: 40 }, (_, i) => i + 1);
  const upright = seeds.filter(sd => trial(0, sd)).length;
  const leaning = seeds.filter(sd => trial(1, sd)).length;
  assert.ok(upright <= 8, `直立通過 40 次摔了 ${upright} 次`);
  assert.ok(leaning > upright, `傾斜通過摔 ${leaning} 次，應該比直立的 ${upright} 次多`);
  assert.ok(leaning < 40, '傾斜通過也不該每次都摔');
});

test('第 4 章下坡彎道是真正的考驗：完全不煞車會衝出去或摔倒，進彎前煞車就過得去', () => {
  const noBrake = [1, 2, 3].map(seed => autopilot('hills', { autoGear: true, vCruise: 3.5, vLimit: 99, seed }));
  const brake = [1, 2, 3].map(seed => autopilot('hills', { autoGear: true, vCruise: 3.5, vLimit: 4.0, seed }));
  assert.ok(noBrake.every(r => !r.ok), `不煞車居然騎完了：${JSON.stringify(noBrake.map(r => r.ok))}`);
  assert.ok(brake.every(r => r.ok), `有煞車卻沒騎完：${JSON.stringify(brake.map(r => r.why + '@' + (r.x || 0).toFixed(0)))}`);
});

// ─────────────── 下坡視角 ───────────────
test('下坡前攝影機會升高，坡頂後面的下坡路面因此露出來；平地不升高', () => {
  const track = E.buildTrack(E.TRACKS.hills, 200);
  const crest = 90;                                     // 第 4 章第一個坡頂
  assert.equal(C.riseTarget(track, 5), 0, '起點前面是上坡，不該升高');
  const rise = C.riseTarget(track, crest - 4);
  assert.ok(rise > 1, `坡頂前只升高 ${rise.toFixed(2)} m`);

  // 從坡頂前 4 公尺看坡頂後 12 公尺的路面：前面有沒有更近的路面擋住它
  const visible = camH => {
    const { P, base, n } = C.points(track, crest - 4, 0);
    const F = 600 * C.DEF.camD / camH;                  // 主角固定在畫面同一個位置，攝影機越高焦距越短
    const v = { P, base, n, F, hor: 250, W: 800, camH };
    const target = C.project(v, crest + 12, 0);
    let blockY = Infinity;
    for (let s = crest - 3; s < crest + 12; s += 0.5) { const p = C.project(v, s, 0); if (p) blockY = Math.min(blockY, p.y); }
    return blockY - target.y;                           // 正數 = 看得到，數字越大露出越多
  };
  const low = visible(C.DEF.camH), high = visible(C.DEF.camH + rise);
  assert.ok(high > low, `升高後露出 ${high.toFixed(1)} px，沒升高 ${low.toFixed(1)} px`);
});

// ─────────────── 轉彎鏡頭 ───────────────
test('轉彎鏡頭：往右轉時往右看、往外側（左）平移，有上限；回正後會回來', () => {
  const cam = C.create(0);
  for (let t = 0; t < 3; t += DT) C.steerLook(cam, 1.2, DT);          // 全力右轉
  assert.ok(cam.yaw > 0 && cam.yaw <= C.DEF.yawMax + 1e-9, `偏轉 ${(cam.yaw * 57.3).toFixed(1)}°`);
  assert.ok(cam.shift < 0 && cam.shift >= -C.DEF.shiftMax - 1e-9, `平移 ${cam.shift.toFixed(2)} m`);
  for (let t = 0; t < 4; t += DT) C.steerLook(cam, 0, DT);            // 回正
  assert.ok(Math.abs(cam.yaw) < 0.01 && Math.abs(cam.shift) < 0.02, '回正後鏡頭應該回到原位');
});

test('轉彎鏡頭只是換個角度看：旋轉後車子與路面的實際距離不變', () => {
  const track = E.buildTrack(E.TRACKS.park, 200);
  const at = (P, base, s, d) => {                     // 道路座標 → 鏡頭座標（和 project 的換算一致）
    const fi = s - base, i = Math.floor(fi), t = fi - i, a = P[i], b = P[i + 1];
    const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, th = a.th + (b.th - a.th) * t;
    return [x + d * Math.cos(th), z - d * Math.sin(th)];
  };
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const measure = yaw => {
    const { P, base } = C.points(track, 40.3, 0.5, C.DEF, yaw);
    const bike = at(P, base, 40.3, 1.5);
    return { toCenter: dist(bike, at(P, base, 40.3, 0)), toAhead: dist(bike, at(P, base, 52, -1)) };
  };
  const straight = measure(0);
  for (const yaw of [0.15, -0.26]) {
    const m = measure(yaw);
    assert.ok(Math.abs(m.toCenter - 1.5) < 1e-6, `偏轉 ${yaw}：車子離路中心 ${m.toCenter.toFixed(4)} m`);
    assert.ok(Math.abs(m.toAhead - straight.toAhead) < 1e-6, `偏轉 ${yaw}：和前方路面的距離變了`);
  }
});

test('踩到水坑：傾角往原本傾斜的方向加大，傾越多加越多，但那一下不會直接超過摔車角度', () => {
  const kick = lean => { const st = newRider({ v: 3.5, lean, leanV: 0 }); E.hitSlick(st, rng(1)); return st; };
  const small = kick(0.15), big = kick(-0.4), upright = kick(0);
  assert.ok(small.lean > 0.15 && small.leanV > 0, '右傾時應該往右加大');
  assert.ok(big.lean < -0.4 && big.leanV < 0, '左傾時應該往左加大');
  assert.ok(Math.abs(big.lean) - 0.4 > small.lean - 0.15, '傾得越多，加大得越多');
  assert.ok(Math.abs(big.lean) < E.P.LEAN_MAX * E.P.SLICK_LEAN_CAP + 1e-9, '那一下不能直接推過上限');
  assert.ok(Math.abs(upright.lean) < 0.05, '直立踩到只會小晃一下');
});
