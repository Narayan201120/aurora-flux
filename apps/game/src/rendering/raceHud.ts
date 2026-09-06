import type { RacerSnapshot } from "../racer/racer.js";
import type { HazardSnapshot } from "../world/hazards.js";
import type { OpponentSnapshot } from "../racing/opponents.js";
import type { RaceSnapshot } from "../racing/raceState.js";
import type { TrackSystem } from "../racing/track.js";
import type { PositionSnapshot } from "../racing/position.js";

export interface RaceHudModel {
  race: RaceSnapshot;
  racer: RacerSnapshot;
  position: PositionSnapshot;
  routeProgress: number;
  hazards: HazardSnapshot;
  opponents: ReadonlyArray<OpponentSnapshot>;
}

export class RaceHud {
  private readonly lap: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly speed: HTMLElement;
  private readonly speedNeedle: HTMLElement;
  private readonly position: HTMLElement;
  private readonly positionLabel: HTMLElement;
  private readonly boostFill: HTMLElement;
  private readonly boostLabel: HTMLElement;
  private readonly hazard: HTMLElement;
  private readonly distance: HTMLElement;
  private readonly map: HTMLCanvasElement;
  private readonly mapContext: CanvasRenderingContext2D | null;
  private readonly results: HTMLElement | null;
  private readonly resultPlace: HTMLElement;
  private readonly resultTime: HTMLElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly routePoints: ReadonlyArray<{ x: number; z: number }>;
  private readonly mapBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  private readonly onRestart: () => void;

  constructor(
    private readonly root: HTMLElement,
    track: TrackSystem,
    onRestart: () => void,
  ) {
    this.onRestart = onRestart;
    this.root.innerHTML = `
      <div class="hud-brand"><span class="brand-mark">✦</span><span>Aurora Flux</span><small>NEBULA CIRCUIT / 01</small></div>
      <div class="hud-lap-panel" aria-label="Current lap">
        <span class="hud-kicker">Lap</span>
        <strong data-hud="lap">01 <i>/ 03</i></strong>
        <div class="lap-track"><span data-hud="lap-fill"></span></div>
      </div>
      <div class="hud-timer" aria-label="Race time"><span class="hud-kicker">Race time</span><strong data-hud="timer">00:00.00</strong></div>
      <div class="hud-position" aria-label="Race position"><strong data-hud="position">04</strong><span><b data-hud="position-label">of 04</b><small>position</small></span></div>
      <div class="hud-hazard" aria-live="assertive" aria-label="Course hazard"><span class="hazard-dot"></span><div><span class="hud-kicker">Course signal</span><strong data-hud="hazard">SCANNING</strong><small data-hud="distance">clear ahead</small></div></div>
      <div class="hud-map" aria-label="Circuit minimap"><span class="hud-kicker">Circuit trace</span><canvas data-hud="minimap" width="240" height="132"></canvas></div>
      <div class="hud-speed" aria-label="Current speed"><span data-hud="speed">000</span><small>km/h</small><i data-hud="speed-needle"></i></div>
      <div class="hud-boost" aria-label="Flux boost charge"><div class="boost-heading"><span>Flux charge</span><strong data-hud="boost-label">BUILDING</strong></div><div class="boost-track"><span data-hud="boost-fill"></span></div><small>Shift + steer to drift / release to boost</small></div>
      <div class="hud-controls" aria-label="Keyboard controls"><kbd>WASD</kbd> fly <kbd>Shift</kbd> drift <kbd>R</kbd> boost</div>
    `;
    this.lap = requiredElement(this.root, "[data-hud=lap]");
    this.timer = requiredElement(this.root, "[data-hud=timer]");
    this.speed = requiredElement(this.root, "[data-hud=speed]");
    this.speedNeedle = requiredElement(this.root, "[data-hud=speed-needle]");
    this.position = requiredElement(this.root, "[data-hud=position]");
    this.positionLabel = requiredElement(
      this.root,
      "[data-hud=position-label]",
    );
    this.boostFill = requiredElement(this.root, "[data-hud=boost-fill]");
    this.boostLabel = requiredElement(this.root, "[data-hud=boost-label]");
    this.hazard = requiredElement(this.root, "[data-hud=hazard]");
    this.distance = requiredElement(this.root, "[data-hud=distance]");
    this.map = requiredCanvas(this.root, "[data-hud=minimap]");
    this.mapContext = this.map.getContext("2d");
    this.results = document.getElementById("results-screen");
    this.resultPlace = requiredElementById("result-place");
    this.resultTime = requiredElementById("result-time");
    this.restartButton = requiredButtonById("restart-race");
    this.routePoints = track.curve
      .getPoints(96)
      .map((point) => ({ x: point.x, z: point.z }));
    this.mapBounds = findBounds(this.routePoints);
    this.restartButton.addEventListener("click", this.onRestart);
  }

  render(model: RaceHudModel): void {
    const speedKph = Math.max(0, model.racer.speed * 3.6);
    const boostAmount = model.racer.boostActive ? 1 : model.racer.driftCharge;
    const lapFraction = Math.min(
      1,
      Math.max(
        0,
        (model.race.lap - 1 + model.routeProgress) / model.race.totalLaps,
      ),
    );
    this.lap.textContent = `${String(model.race.lap).padStart(2, "0")} / ${String(model.race.totalLaps).padStart(2, "0")}`;
    this.timer.textContent = formatTime(model.race.raceTimeSeconds);
    this.speed.textContent = String(Math.round(speedKph)).padStart(3, "0");
    this.speedNeedle.style.transform = `rotate(${-118 + Math.min(236, speedKph / 1.8)}deg)`;
    this.position.textContent = String(model.position.place).padStart(2, "0");
    this.positionLabel.textContent = `of ${String(model.position.total).padStart(2, "0")}`;
    this.boostFill.style.width = `${Math.round(boostAmount * 100)}%`;
    this.boostLabel.textContent = model.racer.boostActive
      ? "OVERCLOCK"
      : model.racer.driftCharge >= 0.4
        ? "READY"
        : "BUILDING";
    this.root.style.setProperty("--lap-progress", `${lapFraction * 100}%`);
    this.renderHazard(model.hazards);
    this.renderMap(model.routeProgress, model.opponents);
    if (this.results) this.results.hidden = model.race.phase !== "finished";
    this.resultPlace.textContent = `${String(model.position.place).padStart(2, "0")} / ${String(model.position.total).padStart(2, "0")}`;
    this.resultTime.textContent = formatTime(model.race.raceTimeSeconds);
  }

  dispose(): void {
    this.restartButton.removeEventListener("click", this.onRestart);
  }

  private renderHazard(hazards: HazardSnapshot): void {
    const nearest = hazards.warnings[0];
    this.root.classList.toggle("hazard-active", hazards.effect.active);
    if (hazards.effect.active) {
      this.hazard.textContent = hazards.activeLabel;
      this.distance.textContent = "CONTROL DISTORTION";
      return;
    }
    if (nearest) {
      this.hazard.textContent = nearest.label;
      this.distance.textContent = `${Math.max(1, Math.round(nearest.distance))}m ahead`;
      return;
    }
    this.hazard.textContent = "SCANNING";
    this.distance.textContent = "clear ahead";
  }

  private renderMap(
    playerProgress: number,
    opponents: ReadonlyArray<OpponentSnapshot>,
  ): void {
    const context = this.mapContext;
    if (!context) return;
    context.clearRect(0, 0, this.map.width, this.map.height);
    context.fillStyle = "rgba(7, 13, 33, 0.74)";
    context.fillRect(0, 0, this.map.width, this.map.height);
    context.beginPath();
    this.routePoints.forEach((point, index) => {
      const mapped = mapPoint(
        point.x,
        point.z,
        this.mapBounds,
        this.map.width,
        this.map.height,
      );
      if (index === 0) context.moveTo(mapped.x, mapped.y);
      else context.lineTo(mapped.x, mapped.y);
    });
    context.closePath();
    context.strokeStyle = "rgba(95, 143, 255, 0.62)";
    context.lineWidth = 3;
    context.stroke();
    const player = mapPointForProgress(
      playerProgress,
      this.routePoints,
      this.mapBounds,
      this.map.width,
      this.map.height,
    );
    drawMarker(context, player.x, player.y, "#f5ffff", 4.5);
    opponents.forEach((opponent, index) => {
      const marker = mapPointForProgress(
        opponent.progress,
        this.routePoints,
        this.mapBounds,
        this.map.width,
        this.map.height,
      );
      drawMarker(
        context,
        marker.x,
        marker.y,
        index === 0 ? "#ff8dba" : index === 1 ? "#a990ff" : "#76ffd5",
        3.2,
      );
    });
  }
}

function requiredElement(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLElement))
    throw new Error(`Missing HUD element ${selector}`);
  return element;
}

function requiredCanvas(
  root: HTMLElement,
  selector: string,
): HTMLCanvasElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLCanvasElement))
    throw new Error(`Missing HUD canvas ${selector}`);
  return element;
}

function requiredElementById(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement))
    throw new Error(`Missing element #${id}`);
  return element;
}

function requiredButtonById(id: string): HTMLButtonElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLButtonElement))
    throw new Error(`Missing button #${id}`);
  return element;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(2).padStart(5, "0")}`;
}

function findBounds(points: ReadonlyArray<{ x: number; z: number }>): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  });
  return { minX, maxX, minZ, maxZ };
}

function mapPoint(
  x: number,
  z: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  width: number,
  height: number,
): { x: number; y: number } {
  const padding = 12;
  const nx = (x - bounds.minX) / Math.max(1, bounds.maxX - bounds.minX);
  const nz = (z - bounds.minZ) / Math.max(1, bounds.maxZ - bounds.minZ);
  return {
    x: padding + nx * (width - padding * 2),
    y: height - padding - nz * (height - padding * 2),
  };
}

function mapPointForProgress(
  progress: number,
  points: ReadonlyArray<{ x: number; z: number }>,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  width: number,
  height: number,
): { x: number; y: number } {
  const index = Math.min(
    points.length - 1,
    Math.floor(progress * points.length),
  );
  const point = points[index] ?? points[0]!;
  return mapPoint(point.x, point.z, bounds, width, height);
}

function drawMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
): void {
  context.beginPath();
  context.arc(x, y, radius + 3, 0, Math.PI * 2);
  context.fillStyle = `${color}33`;
  context.fill();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}
