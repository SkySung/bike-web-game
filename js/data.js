// 場景配色、章節規則與數值（文字在 i18n.js）

// ─────────────────────────── 場景配色 ───────────────────────────
const SCENES = {
  yard: {
    sky: ['#6FC3E0', '#D6F1F4'], hill: '#A4D38E', sun: '#FFE08A',
    ground: ['#7DB65F', '#86BF67'], rumble: ['#B89A64', '#C4A874'], road: ['#D9C79A', '#D2BF90'],
    half: 4.5, rumW: 0.3, off: 0, lane: null, side: null
  },
  street: {
    sky: ['#76AFD4', '#F7D9A6'], hill: '#B9C3D3', sun: '#FFC673', skyline: true,
    ground: ['#CFC6B8', '#C7BEAF'], side: { w: 2.6, col: ['#DCD3C4', '#D4CABA'] },
    rumble: ['#F4F1E8', '#9AA3AA'], road: ['#4A5560', '#505B66'],
    half: 4.5, rumW: 0.2, off: -2.0, lane: '#F4F1E8'
  },
  park: {
    sky: ['#78C6E4', '#DDF3EE'], hill: '#9FCF86', sun: '#FFE08A',
    ground: ['#86C06C', '#7EB864'], rumble: ['#B8975E', '#C4A46A'], road: ['#EBD9A6', '#E4D19C'],
    half: 3.5, rumW: 0.3, off: 0, lane: 'rgba(255,255,255,.75)', side: null
  },
  hills: {
    sky: ['#5DB7E0', '#E3F4F7'], hill: '#8FC47A', sun: '#FFE08A',
    ground: ['#79B35C', '#83BD65'], rumble: ['#F4F1E8', '#E2483D'], road: ['#6E767C', '#737B81'],
    half: 3.5, rumW: 0.25, off: 0, lane: '#F4F1E8', side: null
  },
  city: {
    sky: ['#8DB8D8', '#F1E3C8'], hill: '#AEB9CA', sun: '#FFE08A', skyline: true,
    ground: ['#CFC6B8', '#C7BEAF'], side: { w: 2.6, col: ['#DCD3C4', '#D4CABA'] },
    rumble: ['#F4F1E8', '#9AA3AA'], road: ['#4A5560', '#505B66'],
    half: 4.5, rumW: 0.2, off: 0, lane: '#F4C542'
  },
  night: {
    sky: ['#10172A', '#2E3D58'], hill: '#1B2638', sun: '#E8EEF7', dark: true,
    ground: ['#1C2A22', '#213027'], rumble: ['#7D8A94', '#56626B'], road: ['#29313A', '#2E3740'],
    half: 3.5, rumW: 0.25, off: 0, lane: 'rgba(244,241,232,.75)', side: null
  }
};

// ─────────────────────────── 章節資料 ───────────────────────────
const CH = [
  {
    id: 1, scene: 'yard', track: 'yard', vmax: 5, noise: 1.0, turn: 0.35, dLim: [-4, 4]
  },
  {
    id: 2, scene: 'street', track: 'street', vmax: 6, noise: 0.8, turn: 0.35, dLim: [-2.4, 2.2],
    stops: [40, 88, 136], footStart: true, badCrank: true
  },
  {
    id: 3, scene: 'park', track: 'park', vmax: 7, noise: 0.4, turn: 1, startV: 3.2
  },
  {
    id: 4, scene: 'hills', track: 'hills', vmax: 8, noise: 0.45, turn: 1, startV: 3, gears: true
  },
  {
    id: 5, scene: 'city', track: 'city', vmax: 6, noise: 0.4, turn: 1, footStart: true, startD: 1.2,
    lights: [40, 211], zebra: 70, parked: [120, 162], door: 141, safety: true
  },
  {
    id: 6, scene: 'night', track: 'night', vmax: 7, noise: 0.6, turn: 1, startV: 2.5, wet: true
  }
];

// 文字（章節名稱、故事、重點、知識卡、摔車原因）在 i18n.js，切換語言時寫進來
const REASONS = {};
