uniform float uProgress;
varying vec2 vUv;
void main() {
  float line = exp(-abs(vUv.y - uProgress) * 220.0);
  float trail = smoothstep(uProgress - 0.14, uProgress, vUv.y) * step(vUv.y, uProgress);
  float grid = pow(max(0.0, cos(vUv.x * 150.8)), 35.0) + pow(max(0.0, cos(vUv.y * 100.5)), 35.0);
  gl_FragColor = vec4(0.4, 0.88, 0.87, line * 0.85 + trail * grid * 0.10);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
