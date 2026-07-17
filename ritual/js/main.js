// Monad Passport — single-screen interactive 3D viewer
//
// Plain ES modules + Three.js from CDN, no bundler. Must be served over
// HTTP (see index.html comment) because browsers block ES module imports
// on the file:// protocol.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Fraction of the visible viewport height the model should occupy once framed.
const FILL_RATIO = 0.6;
// Base yaw so the passport's front cover faces the camera on load.
// Adjust if the source export's default orientation ever changes.
const BASE_ROTATION_Y = -Math.PI / 2;
// Corrective pitch for the Blender (Z-up) export, which otherwise leaves the
// passport lying flat with its cover facing the sky. Starting guess: rotate
// -90° about X to stand it upright facing the camera.
// VERIFY IN BROWSER: if the back cover faces the camera or "PASSPORT" reads
// upside down, flip this to +Math.PI / 2 instead.
const CORRECTIVE_ROTATION_X = Math.PI;
// Corrective roll on the same wrapper: after standing the passport upright,
// it was left rotated 90° in-plane (text running vertically instead of
// horizontally). Starting guess: -90° about Z so the spine (binding edge)
// lands on the left, like a book seen face-on.
// VERIFY IN BROWSER: if text reads upside down or the spine ends up on the
// right, flip this to +Math.PI / 2. If neither sign looks right on Z, this
// roll may need to move to CORRECTIVE_ROTATION_X's Y equivalent instead —
// the X correction above changes which local axis this roll actually acts
// on in screen space.
const CORRECTIVE_ROTATION_Z = -Math.PI / 2;
// How quickly the shared action time eases toward the pose-button target
// each frame (0-1) — see animate().
const SCRUB_LERP_FACTOR = 0.1;
// Pose fractions for the control panel buttons, expressed as positions in
// the combined ~110-frame Blender timeline (cover opens ~1-30, pause, first
// page flips ~40-70, pause, everything closes ~80-110): frame 30 is the
// cover fully open, frame 70 is the first page fully flipped, and closed is
// just action time 0 (the model's starting pose on load).
const POSE_CLOSED = 0;
const POSE_COVER_OPEN = 30 / 110;
const POSE_PAGE_FLIPPED = 70 / 110;
// How long the controls-onboarding hint stays up before auto-fading.
const ONBOARDING_HINT_DURATION_MS = 4000;

// ---------- Module-level state ----------
let scene, camera, renderer;
let modelGroup;
let mixer;
let actions = []; // one clipAction per gltf.animations entry, all sharing one eased time
let maxDuration = 0; // longest clip duration
let easedActionTime = 0; // current eased value shared by every action.time
let poseTarget = POSE_CLOSED; // action-time target driven by the control panel buttons
let controls;
let onboardingTimeoutId = null; // pending auto-fade timer for the onboarding hint

const clock = new THREE.Clock();
const canvas = document.getElementById("scene-canvas");
const loadingIndicator = document.getElementById("loading-indicator");
const controlPanel = document.getElementById("control-panel");
const onboardingHint = document.getElementById("onboarding-hint");

// ---------- Scene setup ----------
function initScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x05050a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Environment map so PBR/metallic materials have something to reflect —
  // without this, metallic surfaces render flat black.
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04
  ).texture;
  pmremGenerator.dispose();
}

// ---------- Lighting ----------
function initLights() {
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1a1a2e, 0.6);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);
}

// ---------- Controls ----------
// OrbitControls, active from load and permanently enabled — this whole page
// is the interactive viewer, so there's no on/off state to manage.
function initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.panSpeed = 0.5;
  controls.enableZoom = true;

  // Placeholder distances until the model loads and loadPassportModel()
  // refines them against its actual bounding sphere.
  const distance = camera.position.length();
  controls.minDistance = distance * 0.5;
  controls.maxDistance = distance * 3;
}

// ---------- Model loading ----------
// World-space vertical extent visible in the camera frustum, at the fixed
// distance the camera and model sit at. Depends only on fov/distance (both
// constant — the camera never moves on its own; only OrbitControls move it).
function getVisibleHeight() {
  const distance = camera.position.z;
  const fovRadians = THREE.MathUtils.degToRad(camera.fov);
  return 2 * Math.tan(fovRadians / 2) * distance;
}

// Recenters `object` at the origin and returns a scale that makes its
// largest bounding-box dimension fill FILL_RATIO of the camera's visible
// height at its current distance — derived from the model, not guessed.
// Also returns the model's world-space bounding radius (post-scale) so
// OrbitControls' zoom limits can be derived from it too.
function frameModel(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  object.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = (getVisibleHeight() * FILL_RATIO) / maxDim;
  const boundingRadius = box.getBoundingSphere(new THREE.Sphere()).radius * scale;

  return { scale, boundingRadius };
}

function hideLoadingIndicator() {
  if (loadingIndicator) loadingIndicator.classList.add("is-hidden");
}

function loadPassportModel() {
  const loader = new GLTFLoader();

  loader.load(
    "assets/passportanimation.glb",
    (gltf) => {
      const model = gltf.scene;

      // Corrective wrapper for the Blender Z-up export, kept separate from
      // gltf.scene so the embedded cover-opening animation (which targets a
      // child node's own rotation) is unaffected by this parent-level fix.
      const correctionGroup = new THREE.Group();
      correctionGroup.add(model);
      correctionGroup.rotation.x = CORRECTIVE_ROTATION_X;
      correctionGroup.rotation.z = CORRECTIVE_ROTATION_Z;

      // Frame AFTER both corrective rotations so the bounding box reflects
      // the final upright, portrait pose, not an intermediate one. maxDim
      // inside frameModel is just the largest of the box's three extents,
      // so it (and therefore the resulting scale) is unaffected by which
      // world axis that extent now lands on — no separate camera-distance
      // change is needed for the portrait reorientation.
      const { scale, boundingRadius } = frameModel(correctionGroup);

      modelGroup = new THREE.Group();
      modelGroup.add(correctionGroup);
      modelGroup.scale.setScalar(scale);
      modelGroup.rotation.y = BASE_ROTATION_Y;
      scene.add(modelGroup);

      // Orbit around the model, and keep zoom from going inside the
      // passport or drifting off to an unreadable distance.
      controls.target.copy(modelGroup.position);
      controls.minDistance = boundingRadius * 1.4;
      controls.maxDistance = boundingRadius * 6;

      // Drive every clip (cover-open, page-flip, close-all, ...) from the
      // same AnimationMixer and the same shared eased time value, so the
      // combined timeline advances as one sequence, driven only by the
      // control panel buttons.
      if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        actions = gltf.animations.map((animClip) => {
          console.log(
            "Clip:", animClip.name,
            "duration:", animClip.duration.toFixed(2)
          );
          const clipAction = mixer.clipAction(animClip);
          clipAction.play();
          clipAction.paused = true; // pose buttons drive time — clips must not play on their own
          return clipAction;
        });
        maxDuration = Math.max(...gltf.animations.map((animClip) => animClip.duration));
      }

      hideLoadingIndicator();
    },
    undefined,
    (error) => {
      console.error("Failed to load passport model:", error);
      hideLoadingIndicator(); // don't leave the page stuck behind the overlay
    }
  );
}

// ---------- Control panel ----------
// Shown on load, auto-fades after ONBOARDING_HINT_DURATION_MS, or earlier
// the moment the user actually drags or scrolls the canvas — either path
// runs through hideOnboardingHint, which clears the timer and removes both
// listeners together.
function showOnboardingHint() {
  if (!onboardingHint) return;
  onboardingHint.classList.add("is-visible");
  onboardingTimeoutId = setTimeout(hideOnboardingHint, ONBOARDING_HINT_DURATION_MS);
  canvas.addEventListener("pointerdown", hideOnboardingHint);
  canvas.addEventListener("wheel", hideOnboardingHint);
}

function hideOnboardingHint() {
  if (!onboardingHint) return;
  onboardingHint.classList.remove("is-visible");
  clearTimeout(onboardingTimeoutId);
  onboardingTimeoutId = null;
  canvas.removeEventListener("pointerdown", hideOnboardingHint);
  canvas.removeEventListener("wheel", hideOnboardingHint);
}

function setActivePose(key) {
  document.querySelectorAll("[data-pose]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.pose === key);
  });
}

function initControlPanel() {
  if (!controlPanel) return;

  const posesByKey = {
    cover: POSE_COVER_OPEN,
    page1: POSE_PAGE_FLIPPED,
    closed: POSE_CLOSED,
  };

  document.querySelectorAll("[data-pose]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.pose;
      poseTarget = posesByKey[key] * maxDuration;
      setActivePose(key);
    });
  });

  setActivePose("closed"); // matches the model's starting pose
}

// ---------- Render loop ----------
function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  if (modelGroup) {
    // Subtle idle motion so the passport doesn't feel static while at rest.
    modelGroup.rotation.y =
      BASE_ROTATION_Y + Math.sin(elapsed * 0.4) * THREE.MathUtils.degToRad(3);
    modelGroup.position.y = Math.sin(elapsed * 0.6) * 0.03;
  }

  if (actions.length > 0) {
    // One eased time value shared by every clip, driven only by the pose
    // buttons. Each clip's own time is clamped to its own duration in case
    // clips don't all run exactly maxDuration long.
    easedActionTime = THREE.MathUtils.lerp(
      easedActionTime,
      poseTarget,
      SCRUB_LERP_FACTOR
    );
    for (const clipAction of actions) {
      clipAction.time = THREE.MathUtils.clamp(
        easedActionTime,
        0,
        clipAction.getClip().duration
      );
    }
    mixer.update(0);
  }

  controls.update();

  renderer.render(scene, camera);
}

// ---------- Resize handling ----------
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// ---------- Init ----------
function init() {
  initScene();
  initLights();
  initControls();
  initControlPanel();
  loadPassportModel();
  showOnboardingHint();
  window.addEventListener("resize", onResize);
  animate();
}

init();
