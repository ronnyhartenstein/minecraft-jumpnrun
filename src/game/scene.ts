import * as THREE from 'three';
import type { Biome } from '../levels/biomes';

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Stellt Himmel, Nebel und Licht auf ein Biom ein. */
  applyBiome(biome: Biome): void;
  /** Setzt Sonne und Schattenbereich auf die Stelle, an der gerade gespielt wird. */
  followSun(target: THREE.Vector3): void;
}

export function createStage(container: HTMLElement): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const fog = new THREE.Fog('#ffffff', 30, 85);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

  const ambient = new THREE.HemisphereLight();
  scene.add(ambient);

  const sun = new THREE.DirectionalLight();
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 18, bottom: -18, near: 1, far: 80 });
  scene.add(sun, sun.target);
  const sunOffset = new THREE.Vector3(-10, 25, 18);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(container);
  resize();

  return {
    renderer,
    scene,
    camera,
    applyBiome(biome) {
      (scene.background as THREE.Texture | null)?.dispose();
      scene.background = skyGradient(biome.sky);
      fog.color.set(biome.fog.color);
      fog.near = biome.fog.near;
      fog.far = biome.fog.far;
      ambient.color.set(biome.ambient.sky);
      ambient.groundColor.set(biome.ambient.ground);
      ambient.intensity = biome.ambient.intensity;
      sun.visible = sun.castShadow = biome.sun !== null;
      if (biome.sun) {
        sun.color.set(biome.sun.color);
        sun.intensity = biome.sun.intensity;
      }
    },
    followSun(target) {
      sun.target.position.copy(target);
      sun.position.copy(target).add(sunOffset);
    },
  };
}

function skyGradient([top, horizon, bottom]: [string, string, string]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.75, horizon);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
