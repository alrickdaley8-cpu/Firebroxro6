import type { KeyBindings } from '../config/controls';

export interface KeyboardActions {
  bindings: () => KeyBindings;
  select: (index: number) => void;
  next: (direction: number) => void;
  explore: () => void;
  scan: () => void;
  reset: () => void;
  sound: () => void;
  pause: () => void;
  escape: () => void;
  isDialogOpen: () => boolean;
}
export class Keyboard {
  constructor(private actions: KeyboardActions) { window.addEventListener('keydown', this.onKey); }
  private onKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (this.actions.isDialogOpen()) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') { this.actions.escape(); return; }
    if (key === ' ' && target.closest('button, a')) return;
    const bindings = this.actions.bindings();
    const mapped: Record<string, () => void> = {
      arrowleft: () => this.actions.next(-1), arrowright: () => this.actions.next(1),
      [bindings.explore]: this.actions.explore, [bindings.scan]: this.actions.scan,
      [bindings.reset]: this.actions.reset, [bindings.sound]: this.actions.sound, ' ': this.actions.pause,
      '1': () => this.actions.select(0), '2': () => this.actions.select(1), '3': () => this.actions.select(2), '4': () => this.actions.select(3),
    };
    if (mapped[key]) { event.preventDefault(); mapped[key](); }
  };
  dispose(): void { window.removeEventListener('keydown', this.onKey); }
}
