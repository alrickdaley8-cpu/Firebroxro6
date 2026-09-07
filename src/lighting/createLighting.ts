import { DirectionalLight, HemisphereLight, PMREMGenerator } from 'three';
import type { Scene, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { QUALITY_PROFILES, type QualityLevel } from '../config/quality';

export function createLighting(scene: Scene, renderer: WebGLRenderer, quality: QualityLevel) {
  const key = new DirectionalLight('#fff0df', 3.0);
  key.position.set(-5.5, 4.2, 4);
  key.castShadow = true;
  key.shadow.camera.left = -5; key.shadow.camera.right = 5;
  key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
  key.shadow.camera.near = .5; key.shadow.camera.far = 24;
  key.shadow.bias = -.00025;
  key.shadow.normalBias = .035;
  key.shadow.radius = 2;
  const rim = new DirectionalLight('#779ec5', .68);
  rim.position.set(5, 1, -6);
  const ambient = new HemisphereLight('#9dadbd', '#211611', .10);
  scene.add(key, rim, ambient);
  const environment = renderer.extensions.has('EXT_color_buffer_float') ? (() => {
    const generator = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, .04, .1, 100, { size: quality === 'low' ? 32 : 128 });
    room.dispose(); generator.dispose();
    return target;
  })() : null;
  scene.environment = environment?.texture ?? null;
  scene.environmentIntensity = .065;
  return {
    key,
    setQuality(level: QualityLevel) {
      const profile = QUALITY_PROFILES[level];
      key.castShadow = profile.shadows;
      key.shadow.mapSize.setScalar(profile.shadowSize);
      key.shadow.map?.dispose(); key.shadow.map = null;
    },
    dispose() { key.shadow.dispose(); environment?.dispose(); scene.remove(key, rim, ambient); },
  };
}
