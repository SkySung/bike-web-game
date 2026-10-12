// 腳踏車與騎士的畫法（從後方看）
//
// 做法：在車子座標裡定義一副小小的 3D 骨架與車架（單位公尺；x 右、y 上、z 往車頭，原點在後輪著地點），
// 依車頭朝向旋轉、用小透視投影到畫面，再把每個部位畫成圓頭膠囊（加深色外框）。
// 畫之前依深度排序：遠的先畫、近的後畫。所以往右轉時右手、右腳在近側完整露出來，
// 左手在遠側被背擋住，只露出握把的手——不必為每個角度手動處理遮擋。
//
// 呼叫前請先把 ctx 平移到後輪著地點、縮放成「每公尺幾像素」，並套用車身傾斜（ctx.rotate）。
(function (root) {
  const TAU = Math.PI * 2;
  const COL = {
    shirt: '#F4C542', sleeve: '#E5AE2C', pants: '#3D5A8C', pantsFar: '#33507F',
    skin: '#F2C29B', helmet: '#2A9D8F', helmetDark: '#23867B', ink: '#1E2B33',
    frame: '#E2483D', frameDark: '#B7372F', tire: '#1E2B33', tireFar: '#46525B', metal: '#8A96A0',
    pack: '#3D6FB0', packDark: '#2F5A93', white: '#F4F1E8'
  };
  // 精靈內部的小透視：鏡頭在後輪後方 PERSP_D、高 PERSP_H（只用來讓前方的部位稍微變小、變高）
  const PERSP_D = 6, PERSP_H = 2;
  const OUTLINE = 0.022;   // 外框粗細（公尺）

  function projector(yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return ([x, y, z]) => {
      const X = x * c + z * s, Z = -x * s + z * c;
      const k = PERSP_D / (PERSP_D + Z);
      return { x: X * k, y: (PERSP_H - y) * k - PERSP_H, z: Z, k };
    };
  }

  // 兩段式關節（膝蓋、手肘）：在「起點—終點」與 bend 方向構成的平面上找關節位置
  function joint(a, b, l1, l2, bend) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.min(Math.hypot(...d), l1 + l2 - 1e-3);
    const u = d.map(v => v / (Math.hypot(...d) || 1));
    // bend 去掉沿著 u 的分量，得到垂直方向
    const dot = bend[0] * u[0] + bend[1] * u[1] + bend[2] * u[2];
    let w = [bend[0] - dot * u[0], bend[1] - dot * u[1], bend[2] - dot * u[2]];
    const wl = Math.hypot(...w) || 1; w = w.map(v => v / wl);
    const along = (l1 * l1 - l2 * l2 + len * len) / (2 * len);
    const up = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    return [a[0] + u[0] * along + w[0] * up, a[1] + u[1] * along + w[1] * up, a[2] + u[2] * along + w[2] * up];
  }

  function draw(ctx, pose = {}) {
    const {
      yaw = 0,          // 車頭朝向（rad，+ = 往右）
      steer = 0,        // 前輪相對車身的角度（rad，+ = 往右）
      crank = 0,        // 右踏板的角度（0 = 最上方，往前轉為正）
      footDown = false, // 右腳踩地
      signing = 0,      // 手勢：-1 左手、+1 右手、0 沒有
      number = null,    // 背號（第 1 章是 5）
      backpack = false, // 書包（第 5、6 章）
      tailLight = false // 尾燈亮著
    } = pose;
    const P = projector(yaw);
    const parts = [];
    const add = (z, fn) => parts.push({ z, fn });
    const lineTo = (A, B, w, col) => {
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
      ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.stroke();
    };
    // 膠囊：a→b，寬 w，外框 ink
    const cap = (a, b, w, col, { outline = true, bias = 0, depth = null } = {}) => {
      const A = P(a), B = P(b), k = (A.k + B.k) / 2;
      add(depth ?? (A.z + B.z) / 2 + bias, () => { if (outline) lineTo(A, B, w * k + OUTLINE, COL.ink); lineTo(A, B, w * k, col); });
    };
    const dot = (c, r, col, { bias = 0 } = {}) => {
      const p = P(c);
      add(p.z + bias, () => {
        ctx.beginPath(); ctx.arc(p.x, p.y, r * p.k + OUTLINE / 2, 0, TAU); ctx.fillStyle = COL.ink; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, r * p.k, 0, TAU); ctx.fillStyle = col; ctx.fill();
      });
    };
    // 車輪：在車輪平面上取一圈點投影（車頭偏轉時自然變成橢圓）
    const wheel = (center, r, ang, col, w) => {
      const pts = [];
      for (let i = 0; i <= 28; i++) {
        const t = i / 28 * TAU, along = Math.cos(t) * r, up = Math.sin(t) * r;
        pts.push(P([center[0] + Math.sin(ang) * along, center[1] + up, center[2] + Math.cos(ang) * along]));
      }
      add(P(center).z, () => {
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath(); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
      });
    };

    // ── 車子 ──
    const rearHub = [0, 0.34, 0], frontHub = [0, 0.34, 1.0], bb = [0, 0.3, 0.42];
    const seatTop = [0, 0.86, 0.06], headTop = [0, 0.96, 0.8], headLow = [0, 0.76, 0.86];
    wheel(rearHub, 0.34, 0, COL.tire, 0.08);
    wheel(frontHub, 0.33, steer, COL.tireFar, 0.065);
    cap(rearHub, bb, 0.04, COL.frame, { outline: false });
    cap(rearHub, seatTop, 0.035, COL.frame, { outline: false });
    cap(bb, seatTop, 0.05, COL.frame, { outline: false });
    cap(seatTop, headTop, 0.045, COL.frame, { outline: false });
    cap(bb, headLow, 0.05, COL.frame, { outline: false });
    cap(headLow, frontHub, 0.04, COL.frameDark, { outline: false });
    cap([0, 0.9, -0.02], [0, 0.92, 0.2], 0.07, COL.ink, { outline: false });            // 座墊
    cap([0, 0.66, -0.14], [0, 0.7, 0.12], 0.1, COL.frame, { outline: false, bias: -0.2 }); // 後擋泥板
    const refl = P([0, 0.58, -0.17]);
    add(refl.z - 0.25, () => { ctx.fillStyle = tailLight ? '#FF3B2F' : '#FF8A7A'; ctx.fillRect(refl.x - 0.035, refl.y - 0.025, 0.07, 0.05); });
    // 龍頭：跟著前輪轉
    const stem = [0, 1.02, 0.78];
    const bar = [Math.cos(steer) * 0.29, 0, -Math.sin(steer) * 0.29];
    const gripL = [stem[0] - bar[0], stem[1], stem[2] - bar[2]], gripR = [stem[0] + bar[0], stem[1], stem[2] + bar[2]];
    cap(headTop, stem, 0.04, COL.ink, { outline: false });
    cap(gripL, gripR, 0.035, COL.ink, { outline: false });

    // ── 騎士 ──
    const hipL = [-0.11, 0.98, 0.06], hipR = [0.11, 0.98, 0.06];
    const shL = [-0.19, 1.4, 0.3], shR = [0.19, 1.4, 0.3], neck = [0, 1.47, 0.34];
    const headC = [0, 1.6, 0.4];

    // 軀幹的深度（腳的排序要參考它）
    const torsoPts = [hipL, [-0.17, 1.14, 0.14], shL, neck, shR, [0.17, 1.14, 0.14], hipR].map(P);
    const torsoZ = torsoPts.reduce((s, p) => s + p.z, 0) / torsoPts.length;

    // 腳：踏板在車架兩側繞圈，膝蓋往前彎
    const pedal = (side, a) => [side * 0.15, bb[1] + 0.17 * Math.cos(a), bb[2] + 0.17 * Math.sin(a)];
    const leg = (side, a) => {
      const hip = side < 0 ? hipL : hipR;
      const foot = side > 0 && footDown ? [0.42, 0.02, 0.22] : pedal(side, a);
      if (!(side > 0 && footDown)) cap(bb, foot, 0.025, COL.metal, { outline: false });
      const knee = joint(hip, foot, 0.47, 0.47, [side * 0.15, 0.2, 1]);
      const col = side < 0 ? COL.pantsFar : COL.pants;
      // 大腿排在軀幹後面，踩踏時根部才不會一下蓋住背、一下又沒有；
      // 只有車頭偏轉超過約 20° 時，近側那條大腿排到前面（看得到大腿側面蓋過背部）
      const nearSide = Math.sign(yaw) === side && Math.abs(yaw) > 0.35;
      cap(hip, knee, 0.15, col, { depth: nearSide ? torsoZ - 0.02 : torsoZ + 0.02 });
      cap(knee, foot, 0.12, col);
      cap(foot, [foot[0], foot[1] - 0.01, foot[2] + 0.11], 0.08, COL.ink, { outline: false, bias: -0.01 });
    };
    leg(-1, crank + Math.PI);
    leg(1, crank);

    // 軀幹：圓潤、上寬下窄的形狀（肩膀圓、腰收窄），不是方塊
    add(torsoZ, () => {
      const [hl, wl, sl, nk, sr, wr, hr] = torsoPts;
      ctx.beginPath();
      ctx.moveTo(hl.x, hl.y);
      ctx.quadraticCurveTo(wl.x, wl.y, sl.x, sl.y);                  // 左側腰線
      ctx.quadraticCurveTo(sl.x, nk.y - 0.06, nk.x, nk.y - 0.04);   // 左肩圓弧
      ctx.quadraticCurveTo(sr.x, nk.y - 0.06, sr.x, sr.y);           // 右肩圓弧
      ctx.quadraticCurveTo(wr.x, wr.y, hr.x, hr.y);                  // 右側腰線
      ctx.quadraticCurveTo((hl.x + hr.x) / 2, hl.y + 0.05, hl.x, hl.y);
      ctx.closePath();
      ctx.fillStyle = COL.shirt; ctx.fill();
      // 側面陰影：車頭偏轉時，看得到的那一側身體比較暗，偏越多越深
      const sy = Math.sin(yaw);
      if (Math.abs(sy) > 0.03) {
        ctx.save(); ctx.clip();
        const xs = torsoPts.map(p => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs), mid = (x0 + x1) / 2;
        const g = ctx.createLinearGradient(mid, 0, sy > 0 ? x1 : x0, 0);
        g.addColorStop(0, 'rgba(150,95,0,0)'); g.addColorStop(1, `rgba(150,95,0,${(0.45 * Math.min(1, Math.abs(sy) * 1.6)).toFixed(2)})`);
        ctx.fillStyle = g; ctx.fillRect(x0 - 0.1, nk.y - 0.2, x1 - x0 + 0.2, hl.y - nk.y + 0.4);
        ctx.restore();
      }
      ctx.lineWidth = OUTLINE; ctx.strokeStyle = COL.ink; ctx.lineJoin = 'round'; ctx.stroke();
      // 背脊線：跟著身體轉，看得出身體朝向
      const p0 = P([0, 1.0, 0.04]), p1 = P([0, 1.42, 0.27]);
      lineTo(p0, p1, 0.02, 'rgba(30,43,51,.18)');
    });
    // 背號：貼在背上，轉身時跟著變窄
    if (number != null) {
      // 貼在背部的平面上：橫向是身體左右、縱向沿著背脊往上（背部前傾，所以號碼也跟著傾）
      const cen = [0, 1.2, 0.15], spine = [0, 0.42, 0.23], sl = Math.hypot(...spine), up = spine.map(v => v / sl);
      const C0 = P(cen), Ax = P([cen[0] + 0.1, cen[1], cen[2]]), Up = P([cen[0], cen[1] + up[1] * 0.1, cen[2] + up[2] * 0.1]);
      add(torsoZ - 0.12, () => {
        ctx.save();
        ctx.transform((Ax.x - C0.x) / 0.1, (Ax.y - C0.y) / 0.1, -(Up.x - C0.x) / 0.1, -(Up.y - C0.y) / 0.1, C0.x, C0.y);
        ctx.beginPath(); ctx.arc(0, 0, 0.09, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.fillStyle = COL.frame; ctx.font = '800 0.14px "Baloo 2", system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(number), 0, 0.01);
        ctx.restore();
      });
    }
    // 書包：背在背後的圓角方塊
    if (backpack) {
      const corners = [[-0.15, 1.04, 0.0], [0.15, 1.04, 0.0], [0.15, 1.38, 0.12], [-0.15, 1.38, 0.12]].map(P);
      add(torsoZ - 0.15, () => {
        ctx.beginPath(); corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
        ctx.fillStyle = COL.pack; ctx.fill();
        ctx.lineWidth = 0.05; ctx.strokeStyle = COL.pack; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.lineWidth = 0.03; ctx.strokeStyle = COL.ink; ctx.stroke();
        const m0 = P([-0.11, 1.17, 0.05]), m1 = P([0.11, 1.17, 0.05]);
        lineTo(m0, m1, 0.04, COL.white);
      });
    }

    // 手臂：袖子比上衣深一點（像瑪利歐的吊帶褲，手臂和身體分得開）
    const arm = (side) => {
      const sh = side < 0 ? shL : shR;
      const signal = signing === side;
      const hand = signal ? [side * 0.78, 1.4, 0.32] : (side < 0 ? gripL : gripR);
      const elbow = signal ? [side * 0.48, 1.4, 0.31] : joint(sh, hand, 0.3, 0.3, [side * 1, -0.6, -0.4]);
      cap(sh, elbow, 0.1, COL.sleeve);
      cap(elbow, hand, 0.085, COL.sleeve);
      dot(hand, 0.045, COL.skin, { bias: -0.01 });
    };
    arm(-1); arm(1);

    // 頭：臉在安全帽前面一點，轉頭時臉頰自然從安全帽旁邊露出來
    cap([0, 1.46, 0.36], [0, 1.53, 0.4], 0.09, COL.skin, { outline: false });
    dot([0, 1.56, 0.55], 0.11, COL.skin);
    dot(headC, 0.15, COL.helmet);
    cap([-0.145, 1.55, 0.39], [0.145, 1.55, 0.39], 0.035, COL.helmetDark, { outline: false, bias: -0.16 });
    // 安全帽頂的白線：貼在球面上，從後腦經過頭頂到前額。逐點判斷那一點朝不朝向鏡頭，
    // 轉頭時往前勾下去的那一段會被球體擋住，只畫看得到的部分
    const cyaw = Math.cos(yaw), syaw = Math.sin(yaw), R = 0.15;
    const rot = ([x, y, z]) => [x * cyaw + z * syaw, y, -x * syaw + z * cyaw];
    const hc = rot(headC), camPos = [0, PERSP_H, -PERSP_D];
    const stripe = [];
    for (let i = 0; i <= 24; i++) {
      const th = (-110 + 220 * i / 24) * Math.PI / 180;           // -110°（後腦）→ +110°（前額）
      const q = [headC[0], headC[1] + R * Math.cos(th), headC[2] + R * Math.sin(th)];
      const Q = rot(q), n = [Q[0] - hc[0], Q[1] - hc[1], Q[2] - hc[2]], v = [camPos[0] - Q[0], camPos[1] - Q[1], camPos[2] - Q[2]];
      stripe.push({ p: P(q), vis: n[0] * v[0] + n[1] * v[1] + n[2] * v[2] > 0 });
    }
    add(P(headC).z - 0.16, () => {
      ctx.lineWidth = 0.045; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
      for (let i = 1; i < stripe.length; i++) {
        if (!stripe[i - 1].vis || !stripe[i].vis) continue;
        ctx.beginPath(); ctx.moveTo(stripe[i - 1].p.x, stripe[i - 1].p.y); ctx.lineTo(stripe[i].p.x, stripe[i].p.y); ctx.stroke();
      }
    });

    parts.sort((a, b) => b.z - a.z);
    for (const p of parts) p.fn();
  }

  root.BikeSprite = { draw, COL };
})(typeof self !== 'undefined' ? self : this);
