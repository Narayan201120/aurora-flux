import { PerspectiveCamera } from "three";

export interface ResizeTarget {
  element: HTMLElement;
  camera: PerspectiveCamera;
  setSize: (width: number, height: number) => void;
}

export class ResizeHandler {
  private observer: ResizeObserver | null = null;
  private listener = (): void => this.handleResize();

  constructor(private readonly targets: ResizeTarget[]) {}

  attach(): void {
    window.addEventListener("resize", this.listener);
    window.addEventListener("orientationchange", this.listener);

    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(this.listener);
      for (const target of this.targets) {
        this.observer.observe(target.element);
      }
    }

    this.handleResize();
  }

  detach(): void {
    window.removeEventListener("resize", this.listener);
    window.removeEventListener("orientationchange", this.listener);
    this.observer?.disconnect();
    this.observer = null;
  }

  private handleResize(): void {
    const first = this.targets[0];
    if (!first) return;
    const width = first.element.clientWidth;
    const height = first.element.clientHeight;
    if (width <= 0 || height <= 0) return;

    for (const target of this.targets) {
      target.setSize(width, height);
      target.camera.aspect = target.element.clientWidth / Math.max(target.element.clientHeight, 1);
      target.camera.updateProjectionMatrix();
    }
  }
}
