// 平衡之道：腳踏車物理核心（瀏覽器與 Node 測試共用）
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BikeEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const P = {
    G: 1.1,            // 重力讓車傾倒的力道
    STEER: 1.3,        // 轉向把車扶正的力道（乘上速度）
    STEER_BASE: 0.25,  // 靜止時仍保有的一點點修正能力
    SELF: 0.35,        // 車子本身的自穩（速度越快越穩）
    DAMP: 2.0,         // 傾倒阻尼
    NOISE: 2.6,        // 隨機擾動強度（靜止時）
    NOISE_V: 2.0,      // 速度越快擾動越小：影響 = 1 / (1 + (v / NOISE_V)²)
    LEAN_MAX: 0.9,     // 超過這個傾角（約 50°）就摔車
    TURN_G: 9.8,
    STEER_RATE: 7,     // 按鍵輸入的平滑速度
    LEAN_TARGET: 0.4,  // 方向鍵按滿時想要的傾角（約 23°）
    RIDER_KP: 6,       // 騎士把傾角帶到目標的力道
    RIDER_KD: 3,       // 騎士抑制搖晃的力道
    ASSIST: 0.33,      // 沒按方向鍵時，騎士自動扶正只出這個比例的力，其餘要靠玩家補救
    ASSIST_V0: 0.6,    // 低於這個速度（約 2 km/h）幾乎沒有輔助
    ASSIST_V1: 2.0,    // 高於這個速度（約 7 km/h）輔助完整
    ASSIST_MIN: 0.25,  // 停著時還剩的輔助比例
    WHEELBASE: 1.0,    // 軸距（公尺），用來算轉彎時前輪轉多少
    STEER_CUE: 0.12, // 畫面上前輪的反打提示最多幾弧度（約 7°）
    MAX_STEER: 0.7,    // 龍頭最多能轉的角度（約 40°）：低速時轉彎量受它限制，不會原地打橫
    G_SLOW: 5,         // 低速時額外的傾倒力：越慢越容易倒（只影響 V_SLOW 以下）
    BODY: 1.5,         // 按方向鍵時身體重心移動，直接把車身往那邊推的力道；高速時騎士會用龍頭抵消，低速抵消不了就會倒
    V_SLOW: 2.0,       // 約 7 km/h
    MU_DRY: 0.6,       // 乾地抓地力（能撐住的 tan(傾角)）
    MU_WET: 0.38,      // 雨天抓地力（全力傾斜就會超過）
    GRIP_WOBBLE: 0.6,  // 抓地力用到這個比例以上，車身開始晃
    GRIP_SHAKE: 1.0,   // 晃動強度（再乘上速度：越快晃越大）
    SLIDE_PUSH: 4,     // 超過抓地極限時，輪胎往外滑、車身往內倒的力道
    SLIDE_CAP: 0.5,    // 往內倒的力道上限（超過極限的部分最多算到 0.5）：還救得回來，救太慢才會倒
    SLICK_MU: 0.35,    // 踩在水坑、人孔蓋上時抓地力剩下的比例（離開就恢復）
    SLICK_KICK: 0.5,   // 踩上去那一下，傾角再加大「目前傾角 × 這個比例」
    SLICK_LEAN_CAP: 0.75, // 那一下最多只把傾角推到摔車角度的 75%，不會直接倒
    DRAG0: 0.15,       // 滾動阻力
    DRAG2: 0.005,      // 空氣阻力（× 速度²）：下坡不煞車會越衝越快
    REAR: 2.6, FRONT: 5.5,
    PEDAL_RATE: 1.1,
    CRUISE: 4.6,       // 3 檔踩到很快時的極速（m/s，約 16.5 km/h）
    CAD_K: 0.5,        // 踏頻曲線：輕鬆的節奏就有不錯的速度，越快效果越小
    PEDAL_WINDOW: 2.4  // 上一腳之後幾秒內都還算在踩（節奏慢一點也不會掉速）
  };
  const GEARS = [0.55, 0.75, 1.0, 1.25, 1.5];

  // 各章道路：L = 直線長度；R/deg = 彎道半徑與角度（正 = 右彎）；g = 坡度（正 = 上坡）
  const TRACKS = {
    yard: [{ L: 120 }],
    street: [{ L: 175 }],
    park: [{ L: 25 }, { R: 14, deg: 90 }, { L: 14 }, { R: 12, deg: -110 }, { L: 12 }, { R: 9, deg: 170 }, { L: 18 }, { R: 15, deg: -80 }, { L: 10 }, { R: 11, deg: 60 }, { L: 22 }],
    // 丘陵：上坡 → 下坡直接衝進彎道（彎道本身也在下坡）→ 再一次上坡 → 下坡彎道 → 平地終點
    hills: [{ L: 30 }, { L: 50, g: 0.06 }, { L: 10, g: 0.02 }, { L: 22, g: -0.09 }, { R: 9, deg: 110, g: -0.08 }, { L: 15, g: -0.03 }, { L: 15 }, { L: 40, g: 0.09 }, { L: 8 }, { L: 22, g: -0.08 }, { R: 10, deg: -100, g: -0.07 }, { L: 12, g: -0.02 }, { L: 25 }],
    city: [{ L: 100 }, { R: 8, deg: 90 }, { L: 60 }, { R: 8, deg: -90 }, { L: 65 }],
    night: [{ L: 30 }, { R: 20, deg: -45 }, { L: 30 }, { R: 16, deg: 80 }, { L: 25 }, { R: 18, deg: -60 }, { L: 30 }, { R: 25, deg: 30 }, { L: 30 }]
  };

  // 把分段描述展開成每公尺一格的曲率、坡度、航向、高度
  function buildTrack(segs, extra = 0) {
    const k = [], gr = [], curves = [];
    for (const s of segs) {
      const g = s.g || 0;
      if (s.R) {
        const n = Math.round(s.R * Math.abs(s.deg) * Math.PI / 180);
        curves.push({ s: k.length, dir: Math.sign(s.deg), R: s.R, n, g });
        for (let i = 0; i < n; i++) { k.push(Math.sign(s.deg) / s.R); gr.push(g); }
      } else {
        for (let i = 0; i < s.L; i++) { k.push(0); gr.push(g); }
      }
    }
    const len = k.length;
    for (let i = 0; i < extra; i++) { k.push(0); gr.push(0); }
    const hd = [0], el = [0];
    for (let i = 0; i < k.length; i++) { hd.push(hd[i] + k[i]); el.push(el[i] + gr[i]); }
    return { k, gr, hd, el, curves, len };
  }
  const segAt = (arr, s) => (s < 0 ? 0 : arr[Math.floor(s)] ?? 0);
  function lerpAt(arr, s) {
    if (s <= 0) return arr[0];
    const i = Math.floor(s), t = s - i, n = arr.length - 1;
    const a = arr[Math.min(i, n)], b = arr[Math.min(i + 1, n)];
    return a + (b - a) * t;
  }

  // 方向鍵代表「想往哪邊傾」：+1 = 往右、-1 = 往左；平滑化後輕點就是小幅傾斜
  function smoothInput(st, key, dt) { st.want = (st.want || 0) + (key - (st.want || 0)) * Math.min(1, dt * P.STEER_RATE); }

  // 騎士的反射動作：決定龍頭怎麼打（+ = 往右）。
  // 想往右傾時先往左反打一下讓車身倒下去，倒到目標角度就把龍頭回正撐住；
  // 速度越慢力道越小，所以騎太慢還是撐不住。
  function riderSteer(st) {
    const K = P.STEER * (P.STEER_BASE + st.v);
    const target = (st.want || 0) * P.LEAN_TARGET;
    const desired = -P.RIDER_KP * (st.lean - target) - P.RIDER_KD * st.leanV;
    const need = (gravity(st.v) * Math.sin(st.lean) + (st.want || 0) * P.BODY - P.SELF * st.v * st.lean - damping(st.v) * st.leanV - desired) / K;
    const ramp = Math.max(P.ASSIST_MIN, Math.min(1, (st.v - P.ASSIST_V0) / (P.ASSIST_V1 - P.ASSIST_V0)));
    // 按著方向鍵時騎士全力配合（轉彎反應快）；沒按鍵時只出 ASSIST 比例，晃動要玩家自己補救
    const effort = P.ASSIST + (1 - P.ASSIST) * Math.min(1, Math.abs(st.want || 0));
    return Math.max(-1, Math.min(1, need * effort * ramp));
  }
  // 畫面上的前輪角度 = 車子實際走的軌跡需要的角度 + 一點點反向轉向的提示。
  // 軌跡角度用「車頭在世界裡實際轉多快」算（含前兩章的轉彎縮小與自動回正），所以前輪轉多少，畫面上就真的彎多少；
  // 高速時同樣的傾角轉彎半徑大，前輪只轉幾度（跟真的腳踏車、經典機車遊戲一樣，傾斜才是主要的視覺）。
  // 騎士的操作量 steer 是 -1..1 的出力，不是角度，只取一小部分當反打提示，最多約 7°
  function frontWheelAngle(st, c = {}) {
    const world = turnRate(st, c) - ((c.turn ?? 1) < 1 ? 1.5 * (st.psi || 0) : 0);
    const geom = Math.atan(P.WHEELBASE * world / Math.max(st.v, 0.5));
    const cue = Math.max(-P.STEER_CUE, Math.min(P.STEER_CUE, st.steer * 0.6));
    return cue + Math.max(-P.MAX_STEER, Math.min(P.MAX_STEER, geom));
  }

  // 傾倒的力道：越慢越容易倒（低於 V_SLOW 時額外加上 G_SLOW）
  function gravity(v) { return P.G + P.G_SLOW * Math.max(0, 1 - v / P.V_SLOW); }

  // 抓地力：路面本身（乾 / 濕）× 輪子正壓在濕滑處上時變差（st.slick 由遊戲依位置設定）
  function surfaceMu(st, c = {}) { return (c.wet ? P.MU_WET : P.MU_DRY) * ((st.slick || 0) > 0 ? P.SLICK_MU : 1); }
  // 抓地力用掉的比例：傾得越多用得越多（傾角決定轉彎的側向力）；1 以上就開始打滑
  // 低速時龍頭轉不了那麼多，實際轉彎的側向力有上限，所以慢慢騎不太會打滑
  function gripUsage(st, c = {}) {
    if (st.v < 0.8) return 0;
    const lean = Math.max(-P.LEAN_MAX, Math.min(P.LEAN_MAX, st.lean));
    const lateral = Math.min(Math.abs(Math.tan(lean)), st.v * st.v * Math.tan(P.MAX_STEER) / (P.WHEELBASE * P.TURN_G));
    return lateral / surfaceMu(st, c);
  }
  // 剛踩上水坑或人孔蓋的那一下：車身突然晃一下。傾得越多、還在煞車，晃得越兇
  // 傾斜時踩到：車身往原本傾斜的方向再推一點，傾得越多推得越多（更接近摔倒），
  // 但這一下最多只推到 SLICK_LEAN_CAP × 摔車角度，單靠它不會直接倒；直立踩到只會小晃一下
  function hitSlick(st, rnd = Math.random, braking = false) {
    const a = Math.abs(st.lean);
    const dir = a > 0.03 ? Math.sign(st.lean) : (rnd() < 0.5 ? -1 : 1);
    const extra = Math.max(0, Math.min(P.SLICK_KICK * a + 0.05, P.SLICK_LEAN_CAP * P.LEAN_MAX - a));
    st.lean += dir * extra * 0.5;          // 一半立刻反映
    st.leanV += dir * extra * 2;           // 另一半變成往那邊倒的速度
    if (braking) st.leanV += dir * 0.4;    // 還在煞車：更不穩
  }

  // 高速時輪子的陀螺效應讓車身比較不受路面顛簸、風吹影響
  function noiseScale(v) { return 1 / (1 + (v / P.NOISE_V) ** 2); }

  // 倒單擺 + 轉向修正（與速度成正比）+ 自穩 + 阻尼 + 隨機擾動
  // 低速時阻尼也變小（輪子幾乎沒在轉，倒下去沒什麼東西擋）
  function damping(v) { return P.DAMP * Math.max(0.4, Math.min(1, v / P.V_SLOW)); }
  function leanAccel(st, c) {
    let acc = gravity(st.v) * Math.sin(st.lean) - P.STEER * (P.STEER_BASE + st.v) * st.steer
      - P.SELF * st.v * st.lean - damping(st.v) * st.leanV + (st.want || 0) * P.BODY + st.noise * (c.noise || 0) * noiseScale(st.v);
    if (st.assist > 0) acc += -st.assist * (14 * st.lean + 5 * st.leanV);
    return acc;
  }
  function stepLean(st, c, dt, rnd = Math.random) {
    if (st.footDown) { st.lean *= Math.pow(0.002, dt); st.leanV = 0; st.steer = 0; return false; }
    st.steer = riderSteer(st);
    st.noise += -2 * st.noise * dt + (rnd() * 2 - 1) * P.NOISE * Math.sqrt(dt);
    let acc = leanAccel(st, c);
    // 抓地力用得越多、速度越快，車身越不穩；超過極限時輪胎往外滑、車身往內倒（不是一超過就摔）
    const u = st.grip = gripUsage(st, c);
    if (u > P.GRIP_WOBBLE) st.leanV += (rnd() * 2 - 1) * (u - P.GRIP_WOBBLE) * st.v * P.GRIP_SHAKE * Math.sqrt(dt);
    if (u > 1) acc += Math.sign(st.lean) * Math.min(u - 1, P.SLIDE_CAP) * P.SLIDE_PUSH;
    st.leanV += acc * dt;
    st.lean += st.leanV * dt;
    return Math.abs(st.lean) > P.LEAN_MAX;
  }

  // 傾斜產生轉彎：角速度 = g·tan(傾角) / 速度；道路本身的彎曲讓相對航向改變
  // 傾角最多只算到摔車角度：倒在地上的車不會再轉彎（否則 tan 會暴增、畫面天旋地轉）
  // 另外有兩個上限：龍頭最多轉 MAX_STEER（低速時不會原地打橫）、側向力不能超過抓地力（太快會往外滑）
  function turnRate(st, c = {}) {
    const lean = Math.max(-P.LEAN_MAX, Math.min(P.LEAN_MAX, st.lean));
    const v = Math.max(st.v, 0.05);
    const w = P.TURN_G * Math.tan(lean) / Math.max(v, 0.3);
    const capSteer = v * Math.tan(P.MAX_STEER) / P.WHEELBASE;
    const capGrip = surfaceMu(st, c) * P.TURN_G / Math.max(v, 0.5);
    return Math.sign(w) * Math.min(Math.abs(w), capSteer, capGrip) * (c.turn ?? 1);
  }
  function stepMove(st, c, track, dt) {
    const turn = c.turn ?? 1;
    st.psi += (turnRate(st, c) - st.v * segAt(track.k, st.x)) * dt;
    if (turn < 1) st.psi -= st.psi * 1.5 * dt;
    st.d += st.v * Math.sin(st.psi) * dt;
    st.x += st.v * Math.cos(st.psi) * dt;
    if (c.dLim) {
      if (st.d < c.dLim[0]) { st.d = c.dLim[0]; st.psi = Math.max(0, st.psi); }
      if (st.d > c.dLim[1]) { st.d = c.dLim[1]; st.psi = Math.min(0, st.psi); }
    }
  }

  // 踩踏負荷：檔位越重、坡越陡越吃力；超過 1 就踩不動
  function strain(gear, grade) { return GEARS[gear] * (0.55 + 12 * Math.max(0, grade)); }
  // 踩踏頻率對應的目標速度（3 檔）：每 2 秒一下約 10 km/h、45 拍約 13 km/h、60 拍約 14 km/h，
  // 再快也只多一點點——不需要猛按，難度留給轉彎和煞車
  function cadenceTarget(cad, vmax, gear, combo = 0) {
    const v = P.CRUISE * GEARS[gear] * (1 - Math.exp(-cad / P.CAD_K));
    return Math.min(vmax, v) * (1 + Math.min(combo, 10) * 0.02);
  }
  // 反過來：要維持某個速度需要的踏頻（測試與教學用）
  function cadenceFor(v, gear = 2) {
    const r = Math.min(0.995, Math.max(0, v / (P.CRUISE * GEARS[gear])));
    return -P.CAD_K * Math.log(1 - r);
  }
  // ctl: { pedaling, rear, front, rearEff, frontEff }
  function stepSpeed(st, c, track, ctl, dt) {
    const gear = st.gear ?? 2;
    const grade = segAt(track.gr, st.x);
    const sn = strain(gear, grade);
    const target = cadenceTarget(st.cad || 0, c.vmax, gear, st.combo) / Math.max(1, sn);
    const braking = (ctl.rear ? P.REAR * (ctl.rearEff ?? 1) : 0) + (ctl.front ? P.FRONT * (ctl.frontEff ?? 1) : 0);
    if (ctl.pedaling && !braking && !st.footDown && st.v < target) {
      st.v += (target - st.v) * P.PEDAL_RATE / Math.max(1, sn * sn) * dt;
      // 下坡時重力照樣會讓車加速（不然邊踩邊下坡，速度會被卡在踏頻對應的速度）
      const downhill = -9.8 * grade - (P.DRAG0 + P.DRAG2 * st.v * st.v);
      if (downhill > 0) st.v += downhill * dt;
    } else {
      const a = -(P.DRAG0 + P.DRAG2 * st.v * st.v) - braking - 9.8 * grade - (st.footDown ? 3 : 0);
      st.v = Math.max(0, st.v + a * dt);
    }
    return { grade, strain: sn, target };
  }

  return { P, GEARS, TRACKS, buildTrack, segAt, lerpAt, smoothInput, riderSteer, frontWheelAngle, gravity, surfaceMu, gripUsage, hitSlick, noiseScale, leanAccel, stepLean, turnRate, stepMove, strain, cadenceTarget, cadenceFor, stepSpeed };
});
