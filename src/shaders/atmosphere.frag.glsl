uniform vec3 uColor;
uniform vec3 uLight;
uniform float uStrength;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 view = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - abs(dot(normal, view)), 3.9);
  float daylight = pow(max(0.0, dot(normal, normalize(uLight)) * 0.5 + 0.5), 2.0);
  float alpha = fresnel * (0.09 + daylight * 0.9) * uStrength;
  gl_FragColor = vec4(uColor * (0.65 + daylight * 0.7), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
