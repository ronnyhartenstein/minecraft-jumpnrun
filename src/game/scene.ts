import * as THREE from 'three';

const SKY_TOP = '#5fa8ff';
const SKY_HORIZON = '#cfe7ff';

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
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
  scene.background = skyGradient();
  scene.fog = new THREE.Fog(SKY_HORIZON, 30, 85);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight('#dcefff', '#7a6440', 1.4));

  const sun = new THREE.DirectionalLight('#fff3dc', 2.4);
  sun.castShadow = true;
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
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer,
    scene,
    camera,
    followSun(target) {
      sun.target.position.copy(target);
      sun.position.copy(target).add(sunOffset);
    },
  };
}

function skyGradient(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, SKY_TOP);
  gradient.addColorStop(0.75, SKY_HORIZON);
  gradient.addColorStop(1, '#eef6ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
