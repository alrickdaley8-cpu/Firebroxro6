varying float vAlpha;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float core = exp(-d * d * 5.0) * (1.0 - smoothstep(0.6, 1.0, d));
  gl_FragColor = vec4(vColor, core * vAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
