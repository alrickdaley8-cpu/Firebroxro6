export const WORLD_IDS = ['aurelia', 'pelagos', 'vesper', 'nix'] as const;
export type WorldId = (typeof WORLD_IDS)[number];

export interface World {
  id: WorldId;
  index: string;
  name: string;
  subtitle: string;
  classification: string;
  sector: string;
  distance: string;
  coordinates: string;
  description: string;
  discovery: string;
  radius: string;
  gravity: string;
  temperature: string;
  orbitalPeriod: string;
  atmosphere: string;
  color: string;
  glow: string;
  ring: boolean;
  texture: string;
}

export const WORLDS: readonly World[] = [
  {
    id: 'aurelia', index: '01', name: 'Aurelia', subtitle: 'The ringed wonder',
    classification: 'Ringed super-Earth', sector: 'Lyra · Sector 07', distance: '1,402',
    coordinates: '19h 41m 22s  /  +44° 58′ 18″',
    description: 'An ancient world wearing the remnants of a shattered moon. Copper dunes drift beneath a sky threaded with a billion fragments of ice.',
    discovery: 'The rings are not one continuous band, but thousands of delicate lanes. A shepherd moon holds their edges in an almost impossible balance.',
    radius: '2.1 R⊕', gravity: '1.4 g', temperature: '−42 °C', orbitalPeriod: '286 days',
    atmosphere: 'Nitrogen · argon', color: '#d1c8b9', glow: '#c5b7a6', ring: true,
    texture: 'textures/aurelia-surface.jpg',
  },
  {
    id: 'pelagos', index: '02', name: 'Pelagos', subtitle: 'An ocean without end',
    classification: 'Ocean world', sector: 'Cygnus · Sector 19', distance: '186',
    coordinates: '20h 18m 04s  /  +38° 12′ 09″',
    description: 'A blue marble beneath slow-moving veils of cloud. Here, the ocean has no horizon, and the smallest islands hold entire worlds of their own.',
    discovery: 'Spectral readings suggest a deep global ocean. Pale archipelagos trace the tops of a submerged mountain range that circles the equator.',
    radius: '1.3 R⊕', gravity: '0.9 g', temperature: '18 °C', orbitalPeriod: '412 days',
    atmosphere: 'Nitrogen · oxygen', color: '#b2d0d4', glow: '#65bed4', ring: false,
    texture: 'textures/pelagos-surface.webp',
  },
  {
    id: 'vesper', index: '03', name: 'Vesper', subtitle: 'The endless twilight',
    classification: 'Gas giant', sector: 'Carina · Sector 04', distance: '642',
    coordinates: '10h 43m 51s  /  −59° 32′ 16″',
    description: 'A giant painted in the colors of a sun that never quite sets. Storms larger than Earth quietly turn through its violet and amber cloud belts.',
    discovery: 'A single storm has traveled through the southern belt for centuries. High-altitude ice crystals scatter the starlight into a soft violet haze.',
    radius: '8.6 R⊕', gravity: '2.2 g', temperature: '−138 °C', orbitalPeriod: '9.4 years',
    atmosphere: 'Hydrogen · helium', color: '#e3c2bb', glow: '#b3a0d2', ring: false,
    texture: 'textures/vesper-surface.webp',
  },
  {
    id: 'nix', index: '04', name: 'Nix', subtitle: 'A beautiful stillness',
    classification: 'Frozen moon', sector: 'Perseus · Sector 12', distance: '38',
    coordinates: '03h 26m 17s  /  +49° 06′ 42″',
    description: 'Far from the warmth of its star, a small moon keeps its secrets in ice. Silver fractures cross the surface like a map to something underneath.',
    discovery: 'Thermal anomalies run along the deepest fractures. Beneath kilometers of ancient ice, a hidden ocean may still be holding on to its warmth.',
    radius: '0.4 R⊕', gravity: '0.2 g', temperature: '−201 °C', orbitalPeriod: '16 days',
    atmosphere: 'Trace water vapor', color: '#cbd6e0', glow: '#83bbcf', ring: false,
    texture: 'textures/nix-surface.webp',
  },
];

export function getWorld(id: WorldId): World {
  return WORLDS.find(world => world.id === id) ?? WORLDS[0];
}

export function isWorldId(value: unknown): value is WorldId {
  return typeof value === 'string' && WORLD_IDS.includes(value as WorldId);
}
