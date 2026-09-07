const paths: Record<string, string> = {
  arrow: '<path d="M4 12h15M13 5l7 7-7 7"/>',
  northeast: '<path d="M6 18 18 6M6 6h12v12"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="M20 12H5m6-7-7 7 7 7"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 6 6m0-6-6 6"/>',
  settings: '<path d="m9 3-.6 2.1-2 .9-2-.5-2 3.5 1.5 1.6v2.3L2.5 15l2 3.5 2-.5 2 .9L9 21h6l.6-2.1 2-.9 2 .5 2-3.5-1.4-2.1v-2.3L21.5 9l-2-3.5-2 .5-2-.9L15 3Z"/><circle cx="12" cy="12" r="3.2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v6"/>',
  scan: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M2 12h20"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  star: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
  book: '<path d="M12 5c-3-3-7-2-10-1v15c4-2 7-2 10 0m0-14c3-3 7-2 10-1v15c-4-2-7-2-10 0V5Z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  waves: '<path d="M3 8c3-4 6 4 9 0s6 4 9 0M3 13c3-4 6 4 9 0s6 4 9 0M3 18c3-4 6 4 9 0s6 4 9 0"/>',
};
export function icon(name: string, className = ''): string {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.star}</svg>`;
}
export function logo(): string {
  return '<svg class="brand-symbol" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M11 36 22.6 10h2.8L37 36h-5L24 17.8 16 36Z" fill="currentColor"/><ellipse cx="24" cy="27" rx="22" ry="6.8" transform="rotate(-26 24 27)" stroke="currentColor" stroke-width="1.2"/></svg>';
}
