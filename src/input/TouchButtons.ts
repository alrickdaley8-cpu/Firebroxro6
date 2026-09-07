interface TouchPress { button: HTMLButtonElement; x: number; y: number; time: number; pointer: number }

/**
 * Activate a deliberate touch release directly. Some browsers suppress the next synthesized
 * click after a captured WebGL drag. Native keyboard/mouse clicks keep their usual behavior.
 */
export class TouchButtons {
  private events = new AbortController();
  private press: TouchPress | null = null;
  private lastButton: HTMLButtonElement | null = null;
  private lastPointer = -1;
  private suppressUntil = 0;

  constructor(scope: HTMLElement) {
    const signal = this.events.signal;
    scope.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      const button = (event.target as Element).closest<HTMLButtonElement>('button');
      this.press = button && !button.disabled ? { button, x: event.clientX, y: event.clientY, time: performance.now(), pointer: event.pointerId } : null;
    }, { signal, passive: true });
    scope.addEventListener('pointercancel', () => { this.press = null; }, { signal, passive: true });
    scope.addEventListener('pointerup', event => {
      const press = this.press;
      this.press = null;
      if (!press || event.pointerType !== 'touch' || press.pointer !== event.pointerId) return;
      if (performance.now() - press.time > 700 || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 9) return;
      const button = (event.target as Element).closest('button');
      if (button !== press.button || press.button.disabled) return;
      this.lastButton = press.button; this.lastPointer = event.pointerId; this.suppressUntil = performance.now() + 750;
      press.button.focus({ preventScroll: true });
      press.button.click();
    }, { signal, passive: true });
    scope.addEventListener('touchend', event => {
      if (event.cancelable && performance.now() < this.suppressUntil && (event.target as Element).closest('button') === this.lastButton) event.preventDefault();
    }, { signal, passive: false });
    scope.addEventListener('click', event => {
      if (!event.isTrusted || performance.now() >= this.suppressUntil || event.detail === 0) return;
      const pointer = (event as PointerEvent).pointerId;
      if (pointer === this.lastPointer || (!pointer && (event.target as Element).closest('button') === this.lastButton)) {
        event.preventDefault(); event.stopImmediatePropagation(); this.suppressUntil = 0;
      }
    }, { signal, capture: true });
  }
  dispose(): void { this.events.abort(); this.press = null; this.lastButton = null; }
}
