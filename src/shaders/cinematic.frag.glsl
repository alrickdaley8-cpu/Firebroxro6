uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uGrain;
varying vec2 vUv;
float random(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  float vignette = 1.0 - smoothstep(0.25, 0.85, distance(vUv, vec2(0.56, 0.48))) * 0.28;
  color *= vignette;
  float grain = (random(vUv + fract(uTime)) - 0.5) * uGrain;
  color += grain * min(vec3(0.1), sqrt(max(color, vec3(0.0))));
  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
