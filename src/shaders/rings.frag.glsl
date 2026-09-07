uniform vec3 uColor;
uniform vec3 uLight;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vWorldPosition;
float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float noise(float p) {
  float i = floor(p), f = fract(p);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}
void main() {
  float r = vUv.x;
  float fine = noise(r * 920.0) * 0.35 + noise(r * 230.0) * 0.3;
  float broad = sin(r * 28.0) * 0.12 + sin(r * 73.0) * 0.07;
  float bands = 0.36 + fine + broad;
  float gap = 1.0 - smoothstep(0.008, 0.022, abs(r - 0.58));
  float gap2 = 1.0 - smoothstep(0.001, 0.008, abs(r - 0.81));
  float edge = smoothstep(0.0, 0.025, r) * (1.0 - smoothstep(0.94, 1.0, r));
  float density = clamp(bands - gap * 0.9 - gap2 * 0.7, 0.0, 1.0) * edge;
  vec3 light = normalize(uLight);
  float b = dot(vWorldPosition, light);
  float c = dot(vWorldPosition, vWorldPosition) - 2.4025;
  float occlusion = b < 0.0 ? smoothstep(-0.08, 0.09, c - b * b) : 1.0;
  float illumination = mix(0.09, 0.95, occlusion);
  vec3 color = uColor * (0.47 + bands * 0.65) * illumination;
  gl_FragColor = vec4(color, density * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
