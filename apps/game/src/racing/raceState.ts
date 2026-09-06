export type RacePhase = "countdown" | "racing" | "finished";

export interface RaceUpdateInput {
  deltaSeconds: number;
  lapsCompleted: number;
  routeAlignment: number;
  speed: number;
}

export interface RaceSnapshot {
  phase: RacePhase;
  canControl: boolean;
  statusLabel: string;
  lap: number;
  totalLaps: number;
  wrongWay: boolean;
  raceTimeSeconds: number;
  countdownSeconds: number;
}

/** Owns the player-facing race phase, timer, and direction warning. */
export class RaceState {
  readonly totalLaps = 3;

  private countdownSeconds = 3;
  private goSeconds = 0;
  private phase: RacePhase = "countdown";
  private completedLaps = 0;
  private raceTimeSeconds = 0;
  private wrongWaySeconds = 0;
  private wrongWay = false;

  update(input: RaceUpdateInput): RaceSnapshot {
    const deltaSeconds = Math.max(0, input.deltaSeconds);
    this.completedLaps = Math.max(this.completedLaps, input.lapsCompleted);

    if (this.phase === "countdown") {
      this.countdownSeconds = Math.max(0, this.countdownSeconds - deltaSeconds);
      if (this.countdownSeconds === 0) {
        this.phase = "racing";
        this.goSeconds = 0.75;
      }
    } else if (this.phase === "racing") {
      this.raceTimeSeconds += deltaSeconds;
      this.goSeconds = Math.max(0, this.goSeconds - deltaSeconds);
      if (this.completedLaps >= this.totalLaps) {
        this.phase = "finished";
        this.wrongWay = false;
      }
    }

    if (
      this.phase === "racing" &&
      Math.abs(input.speed) > 8 &&
      input.routeAlignment < -0.3
    ) {
      this.wrongWaySeconds += deltaSeconds;
    } else {
      this.wrongWaySeconds = Math.max(
        0,
        this.wrongWaySeconds - deltaSeconds * 2.5,
      );
    }
    this.wrongWay = this.wrongWaySeconds >= 0.55;
    return this.snapshot();
  }

  snapshot(): RaceSnapshot {
    const lap = Math.min(this.totalLaps, this.completedLaps + 1);
    if (this.phase === "countdown") {
      return {
        phase: this.phase,
        canControl: false,
        statusLabel: String(Math.max(1, Math.ceil(this.countdownSeconds))),
        lap: 1,
        totalLaps: this.totalLaps,
        wrongWay: false,
        raceTimeSeconds: 0,
        countdownSeconds: this.countdownSeconds,
      };
    }

    if (this.phase === "finished") {
      return {
        phase: this.phase,
        canControl: false,
        statusLabel: "FINISH!",
        lap: this.totalLaps,
        totalLaps: this.totalLaps,
        wrongWay: false,
        raceTimeSeconds: this.raceTimeSeconds,
        countdownSeconds: 0,
      };
    }

    return {
      phase: this.phase,
      canControl: true,
      statusLabel: this.wrongWay
        ? "WRONG WAY"
        : this.goSeconds > 0
          ? "GO!"
          : "",
      lap,
      totalLaps: this.totalLaps,
      wrongWay: this.wrongWay,
      raceTimeSeconds: this.raceTimeSeconds,
      countdownSeconds: 0,
    };
  }

  reset(): void {
    this.countdownSeconds = 3;
    this.goSeconds = 0;
    this.phase = "countdown";
    this.completedLaps = 0;
    this.raceTimeSeconds = 0;
    this.wrongWaySeconds = 0;
    this.wrongWay = false;
  }
}
