// 流程與面板、主迴圈、啟動

// ─────────────────────────── 流程與面板 ───────────────────────────
function openOv(html) {
  skipBtn.hidden = true; txEl.hidden = true;
  ov.innerHTML = html; ov.hidden = false;
  const p = ov.querySelector('[data-primary]'); if (p) setTimeout(() => p.focus({ preventScroll: true }), 30);
}
function closeOv() { ov.hidden = true; ov.innerHTML = ''; }
const on = (sel, fn) => { const el = ov.querySelector(sel); if (el) el.onclick = () => { sfx.init(); fn(); }; };
const enter = () => touchShown ? '' : t('enter');   // 觸控時按鈕上不寫（Enter）
const tx = s => fill(s);                           // 章節內容裡的操作說法

function keysHTML(c) {
  if (touchShown) return `<ul class="pts lead"><li>${t('touch1')}</li><li>${t('touch2')}</li><li>${t('touch3')}</li><li>${t(c ? 'touch4ch' : 'touch4')}</li></ul>`;
  const k = [['A', 'D', 'keyPedal'], ['←', '→', 'keyLean'], ['S', '', 'keyRear'], ['W', '', 'keyFront'], ['F', '', 'keyFoot'], ['↑', '', 'keyCrank'], [t('keySpace'), '', 'keyBell'], ['Esc', '', 'keyPause']];
  if (!c || c.gears) k.push(['Z', 'X', 'keyGear']);
  if (!c || c.safety) k.push(['Q', 'E', 'keySig']);
  if (!c || c.wet) k.push(['L', '', 'keyLight']);
  return '<div class="keys">' + k.map(([a, b, key]) => `<span><kbd>${a}</kbd>${b ? `<kbd>${b}</kbd>` : ''}${t(key)}</span>`).join('') + '</div>';
}

function showMenu() {
  S.mode = 'menu'; clearKeys(); hideToast();
  const done = loadDone();
  let firstOpen = -1;
  const other = LANG === 'en' ? 'zh-TW' : 'en';
  let html = `<div class="card"><div class="top"><p class="eyebrow">${t('eyebrow')}</p>
    <button class="btn lang" id="lang" lang="${other}">${LANGS[other]}</button></div><h1>${t('title')}</h1>
    <p class="lead">${t('lead')}</p><div class="chs">`;
  CH.forEach((c, i) => {
    const open = i === 0 || done.includes(CH[i - 1].id) || location.hash.includes('all'), ok = done.includes(c.id);
    if (open && !ok && firstOpen < 0) firstOpen = i;
    html += `<button class="ch" data-ch="${i}" ${open ? '' : 'disabled'}><span class="num">${c.id}</span>
      <span class="meta"><b>${c.name}</b><small>${c.sub}</small></span>
      <span class="st ${ok ? 'ok' : ''}">${t(ok ? 'chDone' : open ? 'chOpen' : 'chLocked')}</span></button>`;
  });
  html += `</div>${keysHTML()}</div>`;
  openOv(html);
  on('#lang', () => { applyLang(other); skipBtn.textContent = t(touchShown ? 'skip' : 'skipKey'); showMenu(); });
  const btns = ov.querySelectorAll('[data-ch]');
  btns.forEach(b => b.onclick = () => { sfx.init(); selectCh(+b.dataset.ch); });
  const pick = btns[firstOpen < 0 ? 0 : firstOpen];
  pick.setAttribute('data-primary', ''); pick.focus({ preventScroll: true });
}

function selectCh(i) { S.ch = i; S.attempts = 0; resetRun(); showIntro(); }

function showIntro() {
  const c = CH[S.ch];
  S.mode = 'intro';
  openOv(`<div class="card"><p class="eyebrow">${t('chEyebrow', { n: c.id, sub: c.sub })}</p><h2>${c.name}</h2>
    <p class="story">${c.story}</p><p class="goal">${t('goal')}${c.goalText}</p>
    <ul class="pts">${c.points.map(p => `<li>${tx(p)}</li>`).join('')}</ul>
    <div class="row"><button class="btn primary" id="go" data-primary>${t('go')}${enter()}</button><button class="btn" id="back">${t('back')}</button></div></div>`);
  on('#go', startPlay); on('#back', showMenu);
}

function startPlay() {
  const c = CH[S.ch];
  closeOv(); clearKeys(); resetRun(); S.mode = 'play'; last = performance.now();
  setupTouchExtras();
  toast(t('start' + c.id), 4000);
}

function startReplay() { S.mode = 'replay'; S.rp = 0; S.rpDone = false; clearKeys(); skipBtn.hidden = false; txEl.hidden = true; }
function skipReplay() { if (S.mode !== 'replay') return; S.rpDone = true; S.rp = S.frames.length - 1; showCrash(); }

function showCrash() {
  const r = REASONS[S.crashKey] || [t('crashed'), ''];
  S.mode = 'crash';
  openOv(`<div class="card"><p class="eyebrow">${t('attempt', { what: t(S.crashKey === 'redlight' ? 'violation' : 'crashed'), n: S.attempts })}</p><h2>${r[0]}</h2><p>${tx(r[1])}</p>
    <div class="row"><button class="btn primary" id="retry" data-primary>${t('retry')}${enter()}</button>
    <button class="btn" id="again">${t('again')}</button><button class="btn" id="back">${t('back')}</button></div></div>`);
  on('#retry', startPlay); on('#again', () => { closeOv(); startReplay(); }); on('#back', showMenu);
}

function win() {
  const c = CH[S.ch];
  S.mode = 'win'; clearKeys(); hideToast(); markDone(c.id); sfx.win(); txEl.hidden = true;
  const next = S.ch + 1 < CH.length;
  const sec = S.t, mm = Math.floor(sec / 60), ss = Math.floor(sec % 60).toString().padStart(2, '0');
  openOv(`<div class="card"><p class="eyebrow">${t(next ? 'cleared' : 'allCleared')}</p><h2>${c.name}</h2>
    <div class="stats"><div class="stat"><b>${mm}:${ss}</b><small>${t('time')}</small></div><div class="stat"><b>${S.attempts}</b><small>${t('crashes')}</small></div>
    ${c.safety ? `<div class="stat"><b>${S.safety}</b><small>${t('safety')}</small></div>` : ''}</div>
    <div class="know"><b>${t('tip')}${c.card[0]}</b><p>${tx(c.card[1])}</p></div>
    <div class="row">${next ? `<button class="btn primary" id="next" data-primary>${t('next')}${enter()}</button>` : ''}
    <button class="btn ${next ? '' : 'primary'}" id="back" ${next ? '' : 'data-primary'}>${t('back')}</button></div>
    ${next ? '' : `<p class="lead">${t('finale')}</p>`}</div>`);
  on('#next', () => selectCh(S.ch + 1)); on('#back', showMenu);
}

function togglePause() {
  if (S.mode === 'play') {
    S.mode = 'pause'; clearKeys();
    openOv(`<div class="card"><p class="eyebrow">${t('paused')}</p><h2>${CH[S.ch].name}</h2>${keysHTML(CH[S.ch])}
      <div class="row"><button class="btn primary" id="res" data-primary>${t('resume')}${enter()}</button><button class="btn" id="rst">${t('restart')}</button>
      <button class="btn" id="mute">${t(sfx.muted ? 'unmute' : 'mute')}</button><button class="btn" id="back">${t('back')}</button></div></div>`);
    on('#res', resume); on('#rst', startPlay); on('#back', showMenu);
    on('#mute', () => { sfx.muted = !sfx.muted; ov.querySelector('#mute').textContent = t(sfx.muted ? 'unmute' : 'mute'); });
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
skipBtn.textContent = t(touchShown ? 'skip' : 'skipKey');
showMenu();
requestAnimationFrame(frame);
