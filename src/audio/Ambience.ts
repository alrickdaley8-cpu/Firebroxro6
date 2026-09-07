import { seededRandom } from '../utils/math';

/** A small, original generative soundscape. No audio requests and no autoplay. */
export class Ambience {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private enabled = false;
  private volume = .35;
  private paused = false;

  private initialize(): void {
    if (this.context) return;
    this.context = new AudioContext();
    const context = this.context;
    this.master = context.createGain();
    this.master.gain.value = 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -16; compressor.ratio.value = 4;
    this.master.connect(compressor); compressor.connect(context.destination);
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass'; lowpass.frequency.value = 350; lowpass.Q.value = .5;
    lowpass.connect(this.master);
    [55, 82.4069, 110.14, 164.6].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      const gain = context.createGain(); gain.gain.value = index === 0 ? .10 : .024;
      oscillator.connect(gain); gain.connect(lowpass); oscillator.start(); this.sources.push(oscillator);
    });
    const noise = context.createBuffer(1, context.sampleRate * 5, context.sampleRate);
    const channel = noise.getChannelData(0), random = seededRandom(917);
    let smooth = 0;
    for (let i = 0; i < channel.length; i++) { smooth = (smooth + (random() * 2 - 1) * .02) / 1.02; channel[i] = smooth * .3; }
    const wind = context.createBufferSource(); wind.buffer = noise; wind.loop = true;
    wind.connect(lowpass); wind.start(); this.sources.push(wind);
  }
  async toggle(): Promise<boolean> {
    this.initialize();
    this.enabled = !this.enabled;
    if (this.enabled && !this.paused) await this.context!.resume();
    this.updateGain();
    return this.enabled;
  }
  setVolume(volume: number): void { this.volume = volume; this.updateGain(); }
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.updateGain();
    if (!this.context) return;
    if (paused) void this.context.suspend().catch(() => undefined);
    else if (this.enabled) void this.context.resume().catch(() => undefined);
  }
  private updateGain(): void {
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.enabled && !this.paused ? this.volume : 0, this.context.currentTime, .25);
  }
  private tone(frequency: number, duration: number, delay = 0, sweep?: number): void {
    if (!this.enabled || !this.context || !this.master || this.paused) return;
    const start = this.context.currentTime + delay;
    const tone = this.context.createOscillator(), gain = this.context.createGain();
    tone.type = 'sine'; tone.frequency.setValueAtTime(frequency, start);
    if (sweep) tone.frequency.exponentialRampToValueAtTime(sweep, start + duration);
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.07, start + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    tone.connect(gain); gain.connect(this.master); tone.start(start); tone.stop(start + duration + .05);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  }
  click(): void { this.tone(587.33, .13); }
  scan(): void { this.tone(164.81, 2.9, 0, 659.25); }
  discovery(): void { this.tone(392, .8); this.tone(493.88, .9, .16); this.tone(587.33, 1.2, .32); }
  dispose(): void {
    this.sources.forEach(source => { try { source.stop(); source.disconnect(); } catch { /* Already stopped. */ } });
    if (this.context) void this.context.close().catch(() => undefined);
    this.sources = []; this.context = null; this.master = null;
  }
}
