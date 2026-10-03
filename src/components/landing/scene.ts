/**
 * Hero 3D: procedural "glass medical cross" with a glowing red core, a thin ring
 * echoing the logo, and floating plus-shaped particles. No GLB asset needed.
 */
import {
  ACESFilmicToneMapping,
  AmbientLight,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Raycaster,
  Scene,
  Shape,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

function crossShape(arm: number, len: number, r: number): Shape {
  const a = arm / 2;
  const l = len / 2;
  // outline of a plus sign with rounded outer corners (clockwise)
  const pts: [number, number, boolean][] = [
    [-a, l, true], [a, l, true], [a, a, false], [l, a, true], [l, -a, true], [a, -a, false],
    [a, -l, true], [-a, -l, true], [-a, -a, false], [-l, -a, true], [-l, a, true], [-a, a, false],
  ];
  const s = new Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x, y, round] = pts[i];
    const [px, py] = pts[(i - 1 + n) % n];
    const [nx, ny] = pts[(i + 1) % n];
    const rr = round ? r : r * 0.35;
    const inX = x + Math.sign(px - x) * Math.min(rr, Math.abs(px - x) / 2);
    const inY = y + Math.sign(py - y) * Math.min(rr, Math.abs(py - y) / 2);
    const outX = x + Math.sign(nx - x) * Math.min(rr, Math.abs(nx - x) / 2);
    const outY = y + Math.sign(ny - y) * Math.min(rr, Math.abs(ny - y) / 2);
    if (i === 0) s.moveTo(inX, inY);
    else s.lineTo(inX, inY);
    s.quadraticCurveTo(x, y, outX, outY);
  }
  s.closePath();
  return s;
}

export function mount(canvas: HTMLCanvasElement, host: HTMLElement): () => void {
  const fine = matchMedia('(pointer: fine)').matches;
  const renderer = new WebGLRenderer({ canvas, antialias: fine, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  scene.add(new AmbientLight(0xffffff, 0.55));
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 5);
  scene.add(key);
  const glow = new PointLight(0xe62129, 2.5, 6, 2);
  glow.position.set(0, 0, 1.4);
  scene.add(glow);

  // soft pink backdrop so the transmissive glass has something to refract (mirrors the poster's radial glow)
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = bgCanvas.height = 256;
  const ctx2d = bgCanvas.getContext('2d')!;
  const grad = ctx2d.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(250,205,212,1)');
  grad.addColorStop(0.55, 'rgba(253,232,235,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0, 0, 256, 256);
  const bgTex = new CanvasTexture(bgCanvas);
  bgTex.colorSpace = SRGBColorSpace;
  const backdrop = new Mesh(new CircleGeometry(3.6, 64), new MeshBasicMaterial({ map: bgTex, transparent: true, depthWrite: false, toneMapped: false }));
  backdrop.position.z = -2.2;
  scene.add(backdrop);

  const root = new Group();
  scene.add(root);

  // outer glass cross
  const glassGeo = new ExtrudeGeometry(crossShape(1.05, 3, 0.28), { depth: 0.62, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 6, curveSegments: 10 });
  glassGeo.center();
  const glassMat = fine
    ? new MeshPhysicalMaterial({ color: '#fff4f5', transmission: 0.92, thickness: 1.1, roughness: 0.18, ior: 1.45, clearcoat: 1, clearcoatRoughness: 0.06, attenuationColor: new Color('#f3aab4'), attenuationDistance: 1.4, envMapIntensity: 1.5, specularIntensity: 1 })
    : new MeshPhysicalMaterial({ color: '#fbd5da', transparent: true, opacity: 0.55, roughness: 0.12, clearcoat: 1, envMapIntensity: 1.4 });
  const glass = new Mesh(glassGeo, glassMat);
  root.add(glass);

  // glowing red core
  const coreGeo = new ExtrudeGeometry(crossShape(0.5, 1.9, 0.14), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4, curveSegments: 8 });
  coreGeo.center();
  const coreMat = new MeshStandardMaterial({ color: '#d01b28', emissive: '#b3121e', emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.1 });
  const core = new Mesh(coreGeo, coreMat);
  root.add(core);

  // ring echoing the logo's circular stroke
  const ring = new Mesh(new TorusGeometry(2.25, 0.045, 16, 120), new MeshStandardMaterial({ color: '#7a3a46', roughness: 0.35, metalness: 0.4, envMapIntensity: 1.1 }));
  ring.rotation.x = MathUtils.degToRad(72);
  ring.rotation.y = MathUtils.degToRad(-18);
  root.add(ring);

  // floating plus particles
  const COUNT = fine ? 140 : 80;
  const pGeo = new ExtrudeGeometry(crossShape(0.035, 0.12, 0.01), { depth: 0.01, bevelEnabled: false });
  pGeo.center();
  const particles = new InstancedMesh(pGeo, new MeshBasicMaterial({ color: '#e62129', transparent: true, opacity: 0.22, depthWrite: false }), COUNT);
  const seeds = Array.from({ length: COUNT }, () => ({
    x: MathUtils.randFloatSpread(9),
    y: MathUtils.randFloatSpread(7),
    z: MathUtils.randFloat(-5, -0.5),
    s: MathUtils.randFloat(0.35, 1.05),
    sp: MathUtils.randFloat(0.15, 0.5),
    ph: Math.random() * Math.PI * 2,
  }));
  const dummy = new Object3D();
  scene.add(particles);

  // interaction state
  const pointer = { x: 0, y: 0 };
  const target = { rx: 0, ry: 0 };
  const drag = { active: false, lastX: 0, lastY: 0, vx: 0, vy: 0, yaw: 0, pitch: 0 };
  const ndc = new Vector2(2, 2);
  const raycaster = new Raycaster();
  let hover = false;
  const LIMIT = MathUtils.degToRad(15);

  const onMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (drag.active) {
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.vx = dx * 0.01;
      drag.vy = dy * 0.006;
      drag.yaw += drag.vx;
      drag.pitch = MathUtils.clamp(drag.pitch + drag.vy, -0.6, 0.6);
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
    }
  };
  const onDown = (e: PointerEvent) => {
    drag.active = true;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  };
  const onUp = (e: PointerEvent) => {
    drag.active = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = 'grab';
  };
  const onLeave = () => ndc.set(2, 2);
  window.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) loop();
  });
  io.observe(host);
  const onVis = () => {
    if (!document.hidden) loop();
  };
  document.addEventListener('visibilitychange', onVis);

  let raf = 0;
  let running = false;
  let last = performance.now();
  let t = 0;
  let first = true;

  function frame(now: number) {
    if (!visible || document.hidden) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    // scroll progress through the hero
    const rect = host.getBoundingClientRect();
    const progress = MathUtils.clamp(-rect.top / Math.max(rect.height, 1), 0, 1);

    // inertia after drag
    if (!drag.active) {
      drag.yaw += drag.vx;
      drag.vx *= 0.94;
      drag.pitch *= 0.97;
    }
    target.ry = MathUtils.clamp(pointer.x * LIMIT, -LIMIT, LIMIT);
    target.rx = MathUtils.clamp(pointer.y * LIMIT, -LIMIT, LIMIT);

    root.rotation.y = MathUtils.lerp(root.rotation.y, target.ry + drag.yaw + t * 0.18 + progress * Math.PI, 0.06);
    root.rotation.x = MathUtils.lerp(root.rotation.x, target.rx + drag.pitch, 0.06);
    root.position.y = Math.sin(t * 1.1) * 0.08 + progress * 0.6;
    const s = 1 - progress * 0.35;
    root.scale.setScalar(MathUtils.lerp(root.scale.x, s, 0.1));
    ring.rotation.z += dt * 0.25;

    raycaster.setFromCamera(ndc, camera);
    hover = raycaster.intersectObjects([glass, core], false).length > 0;
    coreMat.emissiveIntensity = MathUtils.lerp(coreMat.emissiveIntensity, hover ? 0.9 : 0.25, 0.08);
    glow.intensity = MathUtils.lerp(glow.intensity, hover ? 6 : 2.5, 0.08);

    for (let i = 0; i < COUNT; i++) {
      const p = seeds[i];
      dummy.position.set(p.x + Math.sin(t * p.sp + p.ph) * 0.15, ((p.y + t * p.sp * 0.25 + 3.5) % 7) - 3.5, p.z);
      dummy.rotation.set(0, 0, t * p.sp + p.ph);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      particles.setMatrixAt(i, dummy.matrix);
    }
    particles.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
    if (first) {
      first = false;
      host.dataset.ready = 'true';
    }
  }

  function loop() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  loop();

  return function dispose() {
    cancelAnimationFrame(raf);
    running = false;
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('pointerleave', onLeave);
    scene.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
      const mat = m.material as { dispose?: () => void } | { dispose?: () => void }[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose?.());
      else mat?.dispose?.();
    });
    bgTex.dispose();
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
}
