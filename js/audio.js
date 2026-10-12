// 音效（Web Audio 即時合成）

// ─────────────────────────── 音效 ───────────────────────────
const sfx = {
  ac: null, muted: false, brakeG: null, rollG: null, rainG: null,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      const ac = this.ac = new (window.AudioContext || window.webkitAudioContext)();
      const noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = noise;
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 2400;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 12;
      this.brakeG = ac.createGain(); this.brakeG.gain.value = 0;
      o.connect(bp).connect(this.brakeG).connect(ac.destination); o.start();
      const loop = (freq, type) => {
        const ns = ac.createBufferSource(); ns.buffer = noise; ns.loop = true;
        const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
        const g = ac.createGain(); g.gain.value = 0;
        ns.connect(f).connect(g).connect(ac.destination); ns.start();
        return g;
      };
      this.rollG = loop(500, 'lowpass');
      this.rainG = loop(3000, 'highpass');
    } catch { this.ac = null; }
  },
  tone(f, dur, type = 'sine', vol = 0.1, when = 0) {
    if (!this.ac || this.muted) return;
    const t = this.ac.currentTime + when, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ac.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  burst(dur, freq, vol, type = 'lowpass') {
    if (!this.ac || this.muted) return;
    const t = this.ac.currentTime, s = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.ac.destination); s.start(t); s.stop(t + dur);
  },
  pedal(f, combo) { this.tone((f === 'L' ? 330 : 392) * (combo >= 4 ? 1.5 : 1), 0.08, 'triangle', 0.07); },
  bell() { this.tone(2093, 1.1, 'sine', 0.12); this.tone(2637, 0.8, 'sine', 0.06); this.tone(2093, 0.9, 'sine', 0.08, 0.14); },
  clunk() { this.tone(110, 0.14, 'square', 0.05); },
  tick() { this.tone(900, 0.03, 'square', 0.03); },
  shift() { this.tone(520, 0.05, 'square', 0.04); this.tone(260, 0.06, 'square', 0.03, 0.04); },
  splash() { this.burst(0.35, 1800, 0.25, 'highpass'); },
  creak() { this.tone(180, 0.4, 'sawtooth', 0.05); },
  thud() { this.burst(0.45, 380, 0.5); this.tone(70, 0.3, 'sine', 0.25); },
  ding() { this.tone(880, 0.18, 'sine', 0.1); this.tone(1320, 0.35, 'sine', 0.08, 0.1); },
  buzz() { this.tone(160, 0.25, 'square', 0.05); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.09, i * 0.12)); },
  update() {
    if (!this.ac) return;
    const on = S.mode === 'play' && !this.muted;
    const braking = on && (K.rear || K.front) && S.v > 1 && !S.crashT;
    // 煞車聲；輪胎快抓不住時也會發出尖銳的摩擦聲
    const squeal = on && !S.crashT && (S.grip || 0) > 0.8 && S.v > 2;
    this.brakeG.gain.setTargetAtTime(braking ? 0.018 : squeal ? 0.012 : 0, this.ac.currentTime, 0.05);
    this.rollG.gain.setTargetAtTime(on ? Math.min(0.06, S.v * 0.01) : 0, this.ac.currentTime, 0.1);
    this.rainG.gain.setTargetAtTime(on && CH[S.ch].wet ? 0.025 : 0, this.ac.currentTime, 0.3);
  }
};
