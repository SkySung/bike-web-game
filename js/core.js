// 共用常數、DOM、畫布、工具函式、存檔與提示訊息

const E = window.BikeEngine;
const TAU = Math.PI * 2;
const FONT = '"Noto Sans TC", system-ui, -apple-system, "PingFang TC", sans-serif';
const NUMF = '"Baloo 2", "Noto Sans TC", system-ui, sans-serif';
const INK = '#1E2B33', RED = '#E2483D', YEL = '#F4C542', TEAL = '#2A9D8F', SKIN = '#F2C29B', PANTS = '#3D5A8C';
const LEAN_MAX = E.P.LEAN_MAX;
const ZONE = 7;              // 停車格長度（公尺）
const CAM = BikeCamera.DEF;  // 鏡頭設定（camera.js）
const CAM_H = CAM.camH, CAM_D = CAM.camD, DRAW = CAM.draw;
const cam = BikeCamera.create();   // 鏡頭狀態：只記錄橫向位置
const SUBSTEP = 1 / 120;     // 物理最大步長：每一幀都更新，畫面不會一格一格

const $ = s => document.querySelector(s);
const cv = $('#c'), ctx = cv.getContext('2d');
const ov = $('#ov'), toastEl = $('#toast'), skipBtn = $('#skip'), txEl = $('#tx');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = k => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const norm = a => ((a % TAU) + TAU) % TAU;
const par = n => ((Math.floor(n / 2) % 2) + 2) % 2;

let W = 0, H = 0, DPR = 1;
function resize() {
  const r = cv.parentElement.getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = r.width; H = r.height;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
}
window.addEventListener('resize', resize);
resize();

// ─────────────────────────── 存檔 ───────────────────────────
const SAVE_KEY = 'balance-way-v1';
function loadDone() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}').done || []; } catch { return []; } }
function markDone(id) {
  const d = loadDone(); if (!d.includes(id)) d.push(id);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ done: d })); } catch {}
}

// ─────────────────────────── 提示 ───────────────────────────
let toastTimer;
function toast(msg, dur = 2800) {
  if (LANG === 'en') dur = Math.max(dur, msg.length * 55);   // 英文比較長，讀的時間跟著加長
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), dur);
}
function toastOnce(key, msg, cool = 3, dur) {
  if ((S.toastT[key] ?? -99) + cool > S.t) return;
  S.toastT[key] = S.t; toast(msg, dur);
}
function hideToast() { clearTimeout(toastTimer); toastEl.classList.remove('show'); }
