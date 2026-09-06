import type { RaceSnapshot } from "../racing/raceState.js";

export class RaceStatusOverlay {
  private lastLabel = "";

  constructor(private readonly root: HTMLElement) {}

  render(snapshot: RaceSnapshot): void {
    if (snapshot.statusLabel !== this.lastLabel) {
      this.lastLabel = snapshot.statusLabel;
      this.root.textContent = snapshot.statusLabel;
    }
    this.root.dataset.state =
      snapshot.statusLabel === "WRONG WAY" ? "warning" : snapshot.phase;
    this.root.classList.toggle("visible", snapshot.statusLabel.length > 0);
  }
}
