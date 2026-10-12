// 鏡頭：永遠朝著「車子所在位置的道路方向」看，不跟著車頭轉；只在橫向平滑跟隨車子。
// 彎道靠沿路累積的航向算出遠處的路往哪邊偏（經典偽 3D 賽車的做法），
// 所以車子和路面的相對位置永遠是真實的，鏡頭只決定「從哪裡看」。
// 瀏覽器與 Node 測試共用。
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BikeCamera = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const DEF = {
    camH: 2.0,     // 鏡頭高度（公尺）
    camD: 4,       // 鏡頭在車後方的距離（公尺，整數）
    draw: 150,     // 可視距離（公尺）
    follow: 2.5,   // 橫向跟隨速度（每秒追上差距的比例）
    maxLag: 1.2,   // 車子最多偏離鏡頭中心幾公尺
    elevScale: 3,  // 畫面上的高低起伏放大倍數（只影響畫面，不影響物理），斜坡才看得出來
    lookDown: 30,  // 偷看前方幾公尺有沒有下坡
    riseMax: 2.5,  // 下坡前攝影機最多升高幾公尺
    riseGain: 0.4, // 前方每往下掉 1 公尺（畫面上），攝影機升高多少
    riseRate: 1.5  // 升降的平滑速度
  };

  function lerpAt(arr, s) {
    if (s <= 0) return arr[0];
    const i = Math.floor(s), t = s - i, n = arr.length - 1;
    const a = arr[Math.min(i, n)], b = arr[Math.min(i + 1, n)];
    return a + (b - a) * t;
  }

  function create(x = 0) { return { x, rise: 0 }; }

  // 橫向跟隨：鏡頭慢慢追上車子的橫向位置，但不讓車子離畫面中心太遠
  function follow(cam, d, dt, cfg = DEF) {
    cam.x += (d - cam.x) * Math.min(1, dt * cfg.follow);
    cam.x = Math.max(d - cfg.maxLag, Math.min(d + cfg.maxLag, cam.x));
  }

  // 下坡視角：前方的路如果會往下掉（坡頂後面看不到），攝影機就慢慢升高，從更高的角度看下去；
  // 主角固定在畫面同一個位置，所以攝影機越高、主角看起來越小，下坡的路面就露出來了
  function riseTarget(road, s, cfg = DEF) {
    const here = lerpAt(road.el, s);
    let low = here;
    for (let q = 5; q <= cfg.lookDown; q += 1) low = Math.min(low, lerpAt(road.el, s + q));
    return Math.min(cfg.riseMax, (here - low) * cfg.elevScale * cfg.riseGain);
  }
  function rise(cam, road, s, dt, cfg = DEF) {
    cam.rise += (riseTarget(road, s, cfg) - cam.rise) * Math.min(1, dt * cfg.riseRate);
  }
  // 這一幀攝影機的實際高度
  function height(cam, cfg = DEF) { return cfg.camH + (cam.rise || 0); }

  // 以車子所在位置的道路切線為「正前方」，從車子的位置往前後每 1 公尺取樣道路中心在鏡頭座標的位置。
  // 車子腳下正好是一個取樣點，所以不管車子在一公尺裡的哪裡，畫面都不會晃動或跳格。
  // x：橫向（右正），z：相對車子的前後距離，th：該點道路相對正前方的角度，y：相對車子的高度。
  // 注意：這裡完全不用車頭方向（psi），所以轉龍頭不會讓路面跟著轉。
  function points(road, s, camX, cfg = DEF) {
    const k = i => (i < 0 ? 0 : road.k[i] ?? 0);
    // 曲率在 [a, b] 的積分（曲率每公尺一格，是分段常數）
    const kint = (a, b) => {
      let sum = 0, x = a;
      while (x < b - 1e-9) { const nx = Math.min(b, Math.floor(x) + 1); sum += k(Math.floor(x)) * (nx - x); x = nx; }
      return sum;
    };
    const back = cfg.camD + 2, n = back + cfg.draw + 1, base = s - back;
    const P = new Array(n), el0 = lerpAt(road.el, s);
    const yAt = q => (lerpAt(road.el, q) - el0) * cfg.elevScale;
    P[back] = { x: -camX, z: 0, th: 0, y: 0 };
    // 每一步用這一段「中點」的方向推進位置
    let x = -camX, z = 0, th = 0;
    for (let j = back + 1; j < n; j++) {
      const a = base + j - 1;
      const mid = th + kint(a, a + 0.5);
      x += Math.sin(mid); z += Math.cos(mid); th += kint(a, a + 1);
      P[j] = { x, z, th, y: yAt(a + 1) };
    }
    x = -camX; z = 0; th = 0;
    for (let j = back - 1; j >= 0; j--) {
      const b = base + j + 1;
      const mid = th - kint(b - 0.5, b);
      x -= Math.sin(mid); z -= Math.cos(mid); th -= kint(b - 1, b);
      P[j] = { x, z, th, y: yAt(b - 1) };
    }
    return { P, base, n };
  }

  // 把道路座標 (s 沿路距離, d 橫向, h 高度) 投影到螢幕。view 需要 P、base、F、hor、W。
  function project(view, s, d, h = 0, cfg = DEF) {
    const fi = s - view.base, i = Math.floor(fi), t = fi - i;
    const a = view.P[i], b = view.P[i + 1];
    if (!a || !b) return null;
    const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, th = a.th + (b.th - a.th) * t, y = a.y + (b.y - a.y) * t;
    const zc = z - d * Math.sin(th) + cfg.camD;
    if (zc < 0.35) return null;
    const sc = view.F / zc;
    return { x: view.W / 2 + (x + d * Math.cos(th)) * sc, y: view.hor + ((view.camH ?? cfg.camH) - y - h) * sc, sc, zc };
  }

  return { DEF, create, follow, riseTarget, rise, height, points, project };
});
