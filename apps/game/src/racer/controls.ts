import type { RacerInput } from "./racer.js";

export interface ControlState extends RacerInput {
  handbrake: boolean;
}

export interface KeyBindings {
  forward: string[];
  backward: string[];
  left: string[];
  right: string[];
  brake: string[];
  handbrake: string[];
  boost: string[];
}

export const DEFAULT_BINDINGS: KeyBindings = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  brake: ["Space"],
  handbrake: ["ShiftLeft", "ShiftRight"],
  boost: ["KeyR", "KeyE"],
};

export class KeyboardControls {
  private readonly state: Map<string, boolean> = new Map();
  private readonly bindings: KeyBindings;
  private readonly detach: () => void;

  constructor(target: Window = window, bindings: KeyBindings = DEFAULT_BINDINGS) {
    this.bindings = bindings;
    const onKey = (event: KeyboardEvent, pressed: boolean): void => {
      if (this.isRelevant(event)) {
        this.state.set(event.code, pressed);
      }
    };
    const down = (e: KeyboardEvent): void => onKey(e, true);
    const up = (e: KeyboardEvent): void => onKey(e, false);
    const blur = (): void => this.state.clear();
    target.addEventListener("keydown", down);
    target.addEventListener("keyup", up);
    target.addEventListener("blur", blur);
    this.detach = (): void => {
      target.removeEventListener("keydown", down);
      target.removeEventListener("keyup", up);
      target.removeEventListener("blur", blur);
    };
  }

  dispose(): void {
    this.detach();
  }

  sample(): ControlState {
    const { bindings, state } = this;
    const forward = bindings.forward.some((k) => state.get(k)) ? 1 : 0;
    const backward = bindings.backward.some((k) => state.get(k)) ? 1 : 0;
    const left = bindings.left.some((k) => state.get(k)) ? 1 : 0;
    const right = bindings.right.some((k) => state.get(k)) ? 1 : 0;
    return {
      throttle: forward - backward,
      steer: left - right,
      brake: bindings.brake.some((k) => state.get(k)),
      handbrake: bindings.handbrake.some((k) => state.get(k)),
      boost: bindings.boost.some((k) => state.get(k)),
    };
  }

  private isRelevant(event: KeyboardEvent): boolean {
    if (event.target instanceof HTMLElement) {
      const tag = event.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) {
        return false;
      }
    }
    return true;
  }
}
