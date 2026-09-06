import type { RacerSnapshot } from "../racer/racer.js";
import type { HazardSnapshot } from "../world/hazards.js";
import type { RaceSnapshot } from "../racing/raceState.js";

export interface AudioFrame {
  racer: RacerSnapshot;
  race: RaceSnapshot;
  hazards: HazardSnapshot;
}

/** Small procedural soundtrack. It stays silent until a user gesture unlocks it. */
export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private ambient: OscillatorNode | null = null;
  private lastStatus = "";
  private lastBoost = false;
  private lastDrift = false;
  private lastImpact = false;
  private lastHazard = "";

  unlock(): void {
    if (!this.context) this.createGraph();
    if (this.context?.state === "suspended") void this.context.resume();
  }

  update(frame: AudioFrame): void {
    const context = this.context;
    if (!context || context.state !== "running") return;

    const speedRatio = Math.min(
      1,
      Math.max(0, Math.abs(frame.racer.speed) / 90),
    );
    this.engine?.frequency.setTargetAtTime(
      70 + speedRatio * 210,
      context.currentTime,
      0.04,
    );
    this.engineGain?.gain.setTargetAtTime(
      0.018 + speedRatio * 0.05,
      context.currentTime,
      0.06,
    );
    this.ambient?.frequency.setTargetAtTime(
      41 + speedRatio * 4,
      context.currentTime,
      0.15,
    );

    if (
      frame.race.statusLabel !== this.lastStatus &&
      frame.race.statusLabel.length > 0
    ) {
      this.lastStatus = frame.race.statusLabel;
      if (frame.race.statusLabel === "GO!")
        this.playTone(520, 0.16, 0.11, "square");
      else if (frame.race.statusLabel === "FINISH!") this.playFinish();
      else if (frame.race.statusLabel !== "WRONG WAY")
        this.playTone(260, 0.12, 0.08, "square");
    }
    if (frame.racer.boostActive && !this.lastBoost)
      this.playTone(160, 0.38, 0.18, "sawtooth");
    if (frame.racer.drifting && !this.lastDrift)
      this.playTone(340, 0.5, 0.035, "triangle");
    if (frame.racer.lastImpact !== null && !this.lastImpact)
      this.playTone(68, 0.22, 0.16, "square");
    if (
      frame.hazards.activeLabel !== this.lastHazard &&
      frame.hazards.activeLabel.length > 0
    ) {
      this.playTone(740, 0.1, 0.05, "triangle");
    }
    this.lastBoost = frame.racer.boostActive;
    this.lastDrift = frame.racer.drifting;
    this.lastImpact = frame.racer.lastImpact !== null;
    this.lastHazard = frame.hazards.activeLabel;
  }

  dispose(): void {
    this.engine?.stop();
    this.ambient?.stop();
    void this.context?.close();
    this.context = null;
  }

  private createGraph(): void {
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0.25;
    master.connect(context.destination);

    const engineGain = context.createGain();
    engineGain.gain.value = 0.018;
    engineGain.connect(master);
    const engine = context.createOscillator();
    engine.type = "sawtooth";
    engine.frequency.value = 70;
    engine.connect(engineGain);
    engine.start();

    const ambient = context.createOscillator();
    ambient.type = "sine";
    ambient.frequency.value = 41;
    const ambientGain = context.createGain();
    ambientGain.gain.value = 0.018;
    ambient.connect(ambientGain);
    ambientGain.connect(master);
    ambient.start();

    this.context = context;
    this.master = master;
    this.engine = engine;
    this.engineGain = engineGain;
    this.ambient = ambient;
  }

  private playTone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(30, frequency * 0.58),
      now + duration,
    );
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private playFinish(): void {
    this.playTone(392, 0.22, 0.12, "square");
    window.setTimeout(() => this.playTone(587, 0.34, 0.13, "square"), 110);
  }
}
