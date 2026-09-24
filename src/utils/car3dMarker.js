/**
 * 3D car marker for Live Tracking.
 *
 * Renders the Quaternius "NormalCar2" model (src/assets/models) with three.js
 * into a small offscreen canvas and hands back a PNG data URL that Google
 * Maps uses as a normal marker icon. So the map itself doesn't change — no
 * vector map / mapId / WebGL overlay needed — but every driver shows as a
 * shaded 3D car that turns to face the direction it's driving.
 *
 *  - Body colour = driver status (green online, blue on trip, yellow
 *    selected, grey stale) — same colours the old truck icon used.
 *  - Heading is snapped to 10° steps and every (colour, heading) image is
 *    cached, so after the first few renders a map update costs nothing.
 *  - The model is imported as raw text (?raw) and parsed in memory, so there
 *    is no extra network request and nothing for Cloudflare to cache stale.
 *
 * This module is loaded with a dynamic import() from LiveTracking.jsx, so
 * three.js only downloads when someone opens the Live Tracking page.
 */
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import objText from '../assets/models/NormalCar2.obj?raw';
import mtlText from '../assets/models/NormalCar2.mtl?raw';

const RENDER_PX    = 128;   // canvas size (drawn at half size on the map → sharp on retina)
const HEADING_STEP = 10;    // degrees
const BODY_MATERIAL = 'LightBlue'; // the paint material in NormalCar2.mtl

let renderer = null;
let scene    = null;
let camera   = null;
let car      = null;
let bodyMats = [];
const cache  = new Map();

function buildScene() {
  const canvas = document.createElement('canvas');
  canvas.width = RENDER_PX;
  canvas.height = RENDER_PX;

  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true, // needed for toDataURL after render
  });
  renderer.setPixelRatio(1);
  renderer.setSize(RENDER_PX, RENDER_PX, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();

  // Soft, even light so the car reads clearly on both road and satellite maps.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(3, 8, -4);
  scene.add(sun);

  // Parse the model straight from the bundled text.
  const materials = new MTLLoader().parse(mtlText, '');
  materials.preload();
  const loader = new OBJLoader();
  loader.setMaterials(materials);
  const model = loader.parse(objText);

  // Collect the body paint material(s) so they can be recoloured per status.
  model.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (m && m.name === BODY_MATERIAL && !bodyMats.includes(m)) bodyMats.push(m);
    });
  });

  // Centre the model on the origin, wheels on the ground.
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -box.min.y, -center.z);

  car = new THREE.Group(); // rotate this wrapper, not the offset model
  car.add(model);
  scene.add(car);

  // Soft ground shadow so the car sits on the map instead of floating.
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 4.0),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  car.add(shadow);

  // Camera sits SOUTH of the car, tilted down ~55° (the Uber/Ola look).
  // Looking toward +Z means "up" on the image = north, and east = -X.
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 7.2, -5.0);
  camera.lookAt(0, 0.3, 0);
}

/**
 * Loads three.js + the model once. Resolves true when ready, false if the
 * browser has no WebGL (the page then keeps the old flat icon).
 */
export async function initCar3d() {
  if (renderer) return true;
  try {
    buildScene();
    return true;
  } catch (e) {
    console.warn('[car3dMarker] 3D marker unavailable, using flat icon:', e);
    renderer = null;
    return false;
  }
}

/**
 * PNG data URL of the car in `color`, facing `headingDeg`
 * (0 = north, 90 = east, clockwise — same convention as GPS heading).
 */
export function getCarIconUrl(color, headingDeg = 0) {
  if (!renderer) return null;
  const h = ((Math.round((Number(headingDeg) || 0) / HEADING_STEP) * HEADING_STEP) % 360 + 360) % 360;
  const key = `${color}|${h}`;
  const hit = cache.get(key);
  if (hit) return hit;

  bodyMats.forEach((m) => m.color.set(color));
  car.rotation.y = -THREE.MathUtils.degToRad(h); // clockwise from north
  renderer.render(scene, camera);

  const url = renderer.domElement.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** Bearing in degrees from point a to point b (0 = north, clockwise). */
export function bearingBetween(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(a.lat), φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
