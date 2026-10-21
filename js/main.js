// 流程與面板、主迴圈、啟動

// ─────────────────────────── 流程與面板 ───────────────────────────
function openOv(html) {
  skipBtn.hidden = true; txEl.hidden = true;
  ov.innerHTML = touchShown ? html.replace(/（Enter）/g, '') : html; ov.hidden = false;
  const p = ov.querySelector('[data-primary]'); if (p) setTimeout(() => p.focus({ preventScroll: true }), 30);
}
function closeOv() { ov.hidden = true; ov.innerHTML = ''; }
const on = (sel, fn) => { const el = ov.querySelector(sel); if (el) el.onclick = () => { sfx.init(); fn(); }; };

function keysHTML(c) {
  if (touchShown) return `<ul class="pts lead"><li>左手放在左半邊任何地方，左右拖曳：拖越遠傾越多，放開回正</li>
    <li>右手在右半邊左右交替點：左腳、右腳踩踏板</li><li>右下角按住（或踩踏的手指往下滑）是後煞</li>
    <li>${c ? '本章特殊按鈕在右上角；點左上角章節名稱暫停' : '每章需要的按鈕會出現在右上角；點左上角章節名稱暫停'}</li></ul>`;
  const k = [['A', 'D', '左右腳交替踩'], ['←', '→', '往左／往右傾'], ['S', '', '後煞'], ['W', '', '前煞（很猛）'], ['F', '', '伸腳落地'], ['↑', '', '倒轉踏板'], ['空白鍵', '', '鈴鐺'], ['Esc', '', '暫停']];
  if (!c || c.gears) k.push(['Z', 'X', '換輕檔／重檔']);
  if (!c || c.safety) k.push(['Q', 'E', '左轉／右轉手勢']);
  if (!c || c.wet) k.push(['L', '', '車燈']);
  return '<div class="keys">' + k.map(([a, b, t]) => `<span><kbd>${a}</kbd>${b ? `<kbd>${b}</kbd>` : ''}${t}</span>`).join('') + '</div>';
}

function showMenu() {
  S.mode = 'menu'; clearKeys(); hideToast();
  const done = loadDone();
  let firstOpen = -1;
  let html = `<div class="card"><p class="eyebrow">腳踏車學騎遊戲</p><h1>平衡之道</h1>
    <p class="lead">從跌倒到飛馳。每一章學一個真正騎車用得到的技巧，摔車時會用慢動作告訴你原因。</p><div class="chs">`;
  CH.forEach((c, i) => {
    const open = i === 0 || done.includes(CH[i - 1].id) || location.hash.includes('all'), ok = done.includes(c.id);
    if (open && !ok && firstOpen < 0) firstOpen = i;
    html += `<button class="ch" data-ch="${i}" ${open ? '' : 'disabled'}><span class="num">${c.id}</span>
      <span class="meta"><b>${c.name}</b><small>${c.sub}</small></span>
      <span class="st ${ok ? 'ok' : ''}">${ok ? '已通關' : open ? '開始' : '先完成上一章'}</span></button>`;
  });
  html += `</div>${keysHTML()}</div>`;
  openOv(html);
  const btns = ov.querySelectorAll('[data-ch]');
  btns.forEach(b => b.onclick = () => { sfx.init(); selectCh(+b.dataset.ch); });
  const pick = btns[firstOpen < 0 ? 0 : firstOpen];
  pick.setAttribute('data-primary', ''); pick.focus({ preventScroll: true });
}

function selectCh(i) { S.ch = i; S.attempts = 0; resetRun(); showIntro(); }

function showIntro() {
  const c = CH[S.ch];
  S.mode = 'intro';
  openOv(`<div class="card"><p class="eyebrow">第 ${c.id} 章．${c.sub}</p><h2>${c.name}</h2>
    <p class="story">${c.story}</p><p class="goal">目標：${c.goalText}</p>
    <ul class="pts">${c.points.map(p => `<li>${forTouch(p)}</li>`).join('')}</ul>
    <div class="row"><button class="btn primary" id="go" data-primary>開始騎（Enter）</button><button class="btn" id="back">回選單</button></div></div>`);
  on('#go', startPlay); on('#back', showMenu);
}

function startPlay() {
  const c = CH[S.ch];
  closeOv(); clearKeys(); resetRun(); S.mode = 'play'; last = performance.now();
  setupTouchExtras();
  const msg = {
    1: touchShown ? '右手在右半邊左右交替點，大約每秒一下，爸爸會扶著你' : '按 A、D 左右交替踩踏板，大約每秒一下就好，爸爸會扶著你',
    2: '你一腳踩地停著。先看左下角的踏板鐘，按 ↑ 把紅色踏板轉進綠色區，再按 D 起步',
    3: '公園彎道：車身往哪邊傾斜，就會往哪邊轉',
    4: '郊外丘陵：右下角是檔位和坡度，上坡前記得換輕檔',
    5: '從家門口出發，一腳踩地。按 D 起步，右上角是安全分數',
    6: '天黑又下雨，先按 L 打開車燈'
  }[c.id];
  toast(msg, 4000);
}

function startReplay() { S.mode = 'replay'; S.rp = 0; S.rpDone = false; clearKeys(); skipBtn.hidden = false; txEl.hidden = true; }
function skipReplay() { if (S.mode !== 'replay') return; S.rpDone = true; S.rp = S.frames.length - 1; showCrash(); }

function showCrash() {
  const r = REASONS[S.crashKey] || ['摔車了', ''];
  S.mode = 'crash';
  openOv(`<div class="card"><p class="eyebrow">${S.crashKey === 'redlight' ? '違規了' : '摔車了'}．第 ${S.attempts} 次</p><h2>${r[0]}</h2><p>${forTouch(r[1])}</p>
    <div class="row"><button class="btn primary" id="retry" data-primary>再試一次（Enter）</button>
    <button class="btn" id="again">再看重播</button><button class="btn" id="back">回選單</button></div></div>`);
  on('#retry', startPlay); on('#again', () => { closeOv(); startReplay(); }); on('#back', showMenu);
}

function win() {
  const c = CH[S.ch];
  S.mode = 'win'; clearKeys(); hideToast(); markDone(c.id); sfx.win(); txEl.hidden = true;
  const next = S.ch + 1 < CH.length;
  const t = S.t, mm = Math.floor(t / 60), ss = Math.floor(t % 60).toString().padStart(2, '0');
  openOv(`<div class="card"><p class="eyebrow">${next ? '過關！' : '全部通關！'}</p><h2>${c.name}</h2>
    <div class="stats"><div class="stat"><b>${mm}:${ss}</b><small>用時</small></div><div class="stat"><b>${S.attempts}</b><small>摔車次數</small></div>
    ${c.safety ? `<div class="stat"><b>${S.safety}</b><small>安全分數</small></div>` : ''}</div>
    <div class="know"><b>騎車小知識：${c.card[0]}</b><p>${c.card[1]}</p></div>
    <div class="row">${next ? '<button class="btn primary" id="next" data-primary>下一章（Enter）</button>' : ''}
    <button class="btn ${next ? '' : 'primary'}" id="back" ${next ? '' : 'data-primary'}>回選單</button></div>
    ${next ? '' : '<p class="lead">從扶著後座的第一圈，到雨夜裡自己騎回家。你已經學會騎腳踏車了。</p>'}</div>`);
  on('#next', () => selectCh(S.ch + 1)); on('#back', showMenu);
}

function togglePause() {
  if (S.mode === 'play') {
    S.mode = 'pause'; clearKeys();
    openOv(`<div class="card"><p class="eyebrow">暫停</p><h2>${CH[S.ch].name}</h2>${keysHTML(CH[S.ch])}
      <div class="row"><button class="btn primary" id="res" data-primary>繼續（Enter）</button><button class="btn" id="rst">重來</button>
      <button class="btn" id="mute">${sfx.muted ? '開啟音效' : '靜音'}</button><button class="btn" id="back">回選單</button></div></div>`);
    on('#res', resume); on('#rst', startPlay); on('#back', showMenu);
    on('#mute', () => { sfx.muted = !sfx.muted; ov.querySelector('#mute').textContent = sfx.muted ? '開啟音效' : '靜音'; });
  } else if (S.mode === 'pause') resume();
}
function resume() { closeOv(); S.mode = 'play'; last = performance.now(); setupTouchExtras(); }

// ─────────────────────────── 主迴圈 ───────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000), t0 = performance.now(); last = now;
  if (PERF.on && dt > 0) PERF.fps += (1 / dt - PERF.fps) * 0.05;
  if (S.mode === 'play') {
    // 依照這一幀實際經過的時間推進物理（切成小步），畫面每一幀都是最新狀態
    let rem = dt;
    while (rem > 1e-6 && S.mode === 'play') { const h = Math.min(rem, SUBSTEP); step(h); rem -= h; }
  } else if (S.mode === 'replay') {
    S.rp += dt * 60 * 0.35;
    if (S.rp >= S.frames.length - 1) {
      S.rp = S.frames.length - 1;
      if (!S.rpDone) { S.rpDone = true; setTimeout(() => { if (S.mode === 'replay') showCrash(); }, 600); }
    }
  }
  sfx.update();
  render();
  if (PERF.on) PERF.ms += (performance.now() - t0 - PERF.ms) * 0.05;   // 物理 + 送出繪圖指令的時間
  requestAnimationFrame(frame);
}

resetRun();
showMenu();
requestAnimationFrame(frame);
