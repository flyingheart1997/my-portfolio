import * as THREE from 'three';

export const ATMOSPHERE_VERTEX_SHADER = `
varying vec3 vNormal;
varying vec3 vEyeVector;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
    vEyeVector = normalize(-worldPosition.xyz);
    gl_Position = projectionMatrix * worldPosition;
}
`;

export const ATMOSPHERE_FRAGMENT_SHADER = `
varying vec3 vNormal;
varying vec3 vEyeVector;
uniform vec3 atmosphereColor;
uniform float coefficient;
uniform float power;

void main() {
    float intensity = pow(coefficient - dot(vNormal, vEyeVector), power);
    gl_FragColor = vec4(atmosphereColor, intensity);
}
`;

export const SUN_VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SUN_FRAGMENT_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
uniform float time;
uniform sampler2D textureMap;

void main() {
    // Simple animated noise-like effect for the sun surface
    vec2 uv = vUv;
    uv.x += sin(uv.y * 10.0 + time) * 0.01;
    uv.y += cos(uv.x * 10.0 + time) * 0.01;
    
    vec4 color = texture2D(textureMap, uv);
    float brightness = 1.25 + pow(abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 0.6) * 0.55;
    
    gl_FragColor = vec4(color.rgb * brightness, 1.0);
}
`;
