import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const EYE_HEIGHT = -0.8; // altezza “umana” in metri
const MOVE_SPEED = 1; // m/s
const SPRINT_SPEED = 3.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202225);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 5000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// luci (per evitare “nero”)
scene.add(new THREE.AmbientLight(0xffffff, 1.0));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 2);
scene.add(dir);

// pointer lock
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

const ui = document.getElementById("ui");
if (ui) {
  ui.addEventListener("click", () => controls.lock());
  controls.addEventListener("lock", () => (ui.style.display = "none"));
  controls.addEventListener("unlock", () => (ui.style.display = ""));
}

// input
const key = { w:false, a:false, s:false, d:false, shift:false };
addEventListener("keydown", (e) => {
  if (e.code === "KeyW") key.w = true;
  if (e.code === "KeyA") key.a = true;
  if (e.code === "KeyS") key.s = true;
  if (e.code === "KeyD") key.d = true;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") key.shift = true;
});
addEventListener("keyup", (e) => {
  if (e.code === "KeyW") key.w = false;
  if (e.code === "KeyA") key.a = false;
  if (e.code === "KeyS") key.s = false;
  if (e.code === "KeyD") key.d = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") key.shift = false;
});

// posizione player (useremo controls.getObject().position)
const playerPos = controls.getObject().position;
playerPos.set(0, EYE_HEIGHT, 5);

// carica glb
const loader = new GLTFLoader();
console.log("inizio load hotel.glb");
loader.load(
  "./hotel.glb",
  (gltf) => {
    console.log("GLB caricato ✅");
    const model = gltf.scene;
    scene.add(model);

    // centra modello (così non ti ritrovi lontanissimo)
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // sistema near/far in base alla scala
    const size = box.getSize(new THREE.Vector3()).length();
    camera.near = Math.max(0.01, size / 1000);
    camera.far = Math.max(5000, size * 10);
    camera.updateProjectionMatrix();

    // spawn “davanti”
    playerPos.set(0, EYE_HEIGHT, Math.max(3, size * 0.1));
  },
  undefined,
  (err) => console.error("ERRORE caricamento GLB ❌", err)
);

// movimento: WASD sul piano XZ, Y sempre EYE_HEIGHT
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  if (controls.isLocked) {
    const speed = (key.shift ? SPRINT_SPEED : MOVE_SPEED) * dt;

    // forward/side basati sulla direzione camera (ma senza componente Y)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    if (key.w) playerPos.addScaledVector(forward, speed);
    if (key.s) playerPos.addScaledVector(forward, -speed);
    if (key.d) playerPos.addScaledVector(right, speed);
    if (key.a) playerPos.addScaledVector(right, -speed);

    // blocca altezza
    playerPos.y = EYE_HEIGHT;
  }

  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
