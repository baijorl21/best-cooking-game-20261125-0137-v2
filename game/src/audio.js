// Warung Kilat — every sound is synthesized with WebAudio: short oscillator
// blips for picking and serving, a filtered noise loop for the grill sizzle.
// No audio files, no network. The context is created on the first user
// gesture, so the page stays silent until the player starts playing.

export class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
    this.sizzle = null;
  }

  // Create (or resume) the audio context. Safe to call on every gesture.
  ensure() {
    if (this.muted) return false;
    try {
      if (!this.context) {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioContext) return false;
        this.context = new AudioContext();
      }
      if (this.context.state === 'suspended') void this.context.resume();
      return true;
    } catch {
      return false;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) this.stopSizzle();
  }

  tone(freq, duration, type = 'sine', volume = 0.15, slideTo = 0) {
    if (!this.ensure()) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // A click on an ingredient bin or the grill.
  pick() {
    this.tone(520, 0.07, 'triangle', 0.12, 760);
  }

  // A plate item added or a cooked piece collected.
  plop() {
    this.tone(300, 0.09, 'sine', 0.14, 180);
  }

  // Coins landing after a correct serve: two rising notes.
  ding() {
    this.tone(880, 0.12, 'sine', 0.16);
    setTimeout(() => this.tone(1318, 0.18, 'sine', 0.16), 90);
  }

  // Wrong serve, burnt food or an expired order.
  buzz() {
    this.tone(160, 0.22, 'sawtooth', 0.12, 90);
  }

  // The plate hitting the trash.
  trash() {
    this.tone(220, 0.12, 'square', 0.08, 110);
  }

  // A fresh order ticket arriving.
  ticket() {
    this.tone(660, 0.08, 'triangle', 0.1, 660);
    setTimeout(() => this.tone(990, 0.08, 'triangle', 0.1), 80);
  }

  // Start the grill sizzle loop while anything cooks; idempotent.
  startSizzle() {
    if (!this.ensure() || this.sizzle) return;
    const ctx = this.context;
    const length = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4200;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    this.sizzle = { source, gain };
  }

  stopSizzle() {
    if (!this.sizzle) return;
    try {
      this.sizzle.gain.gain.setValueAtTime(0.0001, this.context.currentTime);
      this.sizzle.source.stop(this.context.currentTime + 0.1);
    } catch {
      // The context may already be closed; silence is the goal either way.
    }
    this.sizzle = null;
  }
}
