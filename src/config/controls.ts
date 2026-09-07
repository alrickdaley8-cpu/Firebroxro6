export const DEFAULT_BINDINGS = { explore: 'e', scan: 's', reset: 'r', sound: 'm' } as const;
export type BindingAction = keyof typeof DEFAULT_BINDINGS;
export type KeyBindings = Record<BindingAction, string>;
export const BINDING_LABELS: Record<BindingAction, string> = {
  explore: 'exploration', scan: 'scanning', reset: 'camera reset', sound: 'sound',
};
export function validBindings(value: unknown): value is KeyBindings {
  if (!value || typeof value !== 'object') return false;
  const entries = Object.keys(DEFAULT_BINDINGS).map(key => (value as Record<string, unknown>)[key]);
  return entries.every(key => typeof key === 'string' && /^[a-z]$/.test(key)) && new Set(entries).size === entries.length;
}
