import { Capacitor } from "@capacitor/core";
import {
  ArcRotateCamera, Color3, Color4, DefaultRenderingPipeline, DirectionalLight,
  DynamicTexture, Engine, GlowLayer, HemisphericLight, ImageProcessingConfiguration,
  MeshBuilder, Scene, ShadowGenerator, StandardMaterial, Vector3
} from "@babylonjs/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("Nie znaleziono elementu canvas.");
// Terra Industries jest projektowana wyłącznie na telefony. Ograniczamy koszt renderowania
// na urządzeniach mobilnych, zachowując możliwość regulacji jakości na słabszym sprzęcie.
const mobileDevice = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800;
const engine = new Engine(canvas, !mobileDevice, {
  preserveDrawingBuffer: false,
  stencil: true,
  adaptToDeviceRatio: true,
  powerPreference: "high-performance"
});
if (mobileDevice) engine.setHardwareScalingLevel(window.devicePixelRatio > 2 ? 1.25 : 1);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.035, 0.065, 0.07, 1);

const hemi = new HemisphericLight("ambient-light", new Vector3(0, 1, 0), scene);
hemi.intensity = 0.78;
hemi.groundColor = new Color3(0.19, 0.22, 0.19);
const sun = new DirectionalLight("sun", new Vector3(-0.45, -1, 0.35), scene);
sun.position = new Vector3(20, 35, -20);
sun.intensity = 1.35;
sun.shadowMinZ = 1;
sun.shadowMaxZ = 85;

// Miękkie cienie pod maszynami, drzewami i postacią mocniej osadzają obiekty w świecie.
const shadows = new ShadowGenerator(mobileDevice ? 1024 : 2048, sun);
shadows.usePercentageCloserFiltering = true;
shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
shadows.bias = 0.0005;
shadows.normalBias = 0.025;
scene.onNewMeshAddedObservable.add(mesh => {
  if (mesh.isVisible && mesh.name !== "terrain") {
    shadows.addShadowCaster(mesh, true);
    mesh.receiveShadows = true;
  }
});

// Delikatna mgła wygładza daleki horyzont i poprawia głębię sceny.
scene.fogMode = Scene.FOGMODE_EXP2;
scene.fogDensity = 0.0028;
scene.fogColor = new Color3(0.36, 0.43, 0.38);

const groundMat = new StandardMaterial("ground-material", scene);
groundMat.diffuseColor = Color3.White();
groundMat.specularColor = Color3.Black();
// Proceduralna tekstura ziemi: drobne naturalne przebarwienia zamiast płaskiej zielonej planszy.
const terrainTexture = new DynamicTexture("terrain-ground-texture", { width: 512, height: 512 }, scene, false);
const terrainContext = terrainTexture.getContext();
const terrainPixels = terrainContext.getImageData(0, 0, 512, 512);
let terrainSeed = 173;
for (let y = 0; y < 512; y++) {
  for (let x = 0; x < 512; x++) {
    terrainSeed = (terrainSeed * 1664525 + 1013904223) >>> 0;
    const grain = ((terrainSeed >>> 24) - 128) * 0.16;
    const broad = Math.sin(x * 0.035) * 3.2 + Math.cos(y * 0.027) * 2.6;
    const index = (y * 512 + x) * 4;
    terrainPixels.data[index] = Math.max(0, Math.min(255, 76 + grain + broad));
    terrainPixels.data[index + 1] = Math.max(0, Math.min(255, 91 + grain + broad));
    terrainPixels.data[index + 2] = Math.max(0, Math.min(255, 66 + grain + broad * 0.7));
    terrainPixels.data[index + 3] = 255;
  }
}
terrainContext.putImageData(terrainPixels, 0, 0);
terrainTexture.update(false);
groundMat.diffuseTexture = terrainTexture;
const ground = MeshBuilder.CreateGround("terrain", { width: 90, height: 90, subdivisions: 2 }, scene);
ground.material = groundMat;
ground.receiveShadows = true;

const gridMat = new StandardMaterial("grid-material", scene);
gridMat.diffuseColor = new Color3(0.38, 0.52, 0.43);
gridMat.alpha = 0.028;
for (let i = -40; i <= 40; i += 5) {
  const x = MeshBuilder.CreateBox("grid-x-" + i, { width: 0.025, height: 0.012, depth: 80 }, scene);
  x.position.set(i, 0.012, 0); x.material = gridMat;
  const z = MeshBuilder.CreateBox("grid-z-" + i, { width: 80, height: 0.012, depth: 0.025 }, scene);
  z.position.set(0, 0.012, i); z.material = gridMat;
}

// Dekoracje biomu: leśne obrzeża, kamienie i wydeptane drogi nadają mapie skalę.
const stoneMat = new StandardMaterial("stone-material", scene);
stoneMat.diffuseColor = new Color3(0.25, 0.31, 0.29);
const barkMat = new StandardMaterial("tree-bark-material", scene);
barkMat.diffuseColor = new Color3(0.25, 0.16, 0.105);
const pineMat = new StandardMaterial("pine-material", scene);
pineMat.diffuseColor = new Color3(0.12, 0.29, 0.22);
const pineLightMat = new StandardMaterial("pine-light-material", scene);
pineLightMat.diffuseColor = new Color3(0.19, 0.39, 0.28);
const earthMat = new StandardMaterial("earth-path-material", scene);
earthMat.diffuseColor = new Color3(0.31, 0.27, 0.19);
earthMat.specularColor = Color3.Black();
const grassMat = new StandardMaterial("grass-material", scene);
grassMat.diffuseColor = new Color3(0.29, 0.42, 0.27);
for (let i = 0; i < 30; i++) {
  const angle = i * 2.399;
  const radius = 14 + (i % 7) * 2.4;
  const stone = MeshBuilder.CreatePolyhedron("field-stone-" + i, { type: 1, size: 0.38 + (i % 4) * 0.14 }, scene);
  stone.position.set(Math.cos(angle) * radius, 0.22, Math.sin(angle) * radius);
  stone.scaling.set(1, 0.58, 0.82);
  stone.rotation.y = angle;
  stone.material = stoneMat;
}
// Leśny pas na obrzeżach planszy; środek pozostaje wolny dla rozbudowy fabryki.
for (let i = 0; i < 22; i++) {
  const angle = i * 2.399 + 0.4;
  const radius = 23 + (i % 4) * 3.1;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const trunk = MeshBuilder.CreateCylinder("pine-trunk-" + i, { height: 1.8, diameter: 0.42, tessellation: 7 }, scene);
  trunk.position.set(x, 0.9, z);
  trunk.material = barkMat;
  const lower = MeshBuilder.CreateCylinder("pine-lower-" + i, { height: 2.7, diameterTop: 0.08, diameterBottom: 2.25, tessellation: 7 }, scene);
  lower.position.set(x, 2.05, z);
  lower.material = pineMat;
  const upper = MeshBuilder.CreateCylinder("pine-upper-" + i, { height: 2.25, diameterTop: 0.03, diameterBottom: 1.65, tessellation: 7 }, scene);
  upper.position.set(x, 3.35, z);
  upper.material = i % 3 === 0 ? pineLightMat : pineMat;
}
// Delikatne plamy ziemi i ścieżka prowadząca od bazy w stronę złóż.
for (let i = 0; i < 7; i++) {
  const path = MeshBuilder.CreateGround("mine-trail-" + i, { width: 2.7, height: 2.2 }, scene);
  path.position.set(1.3 + i * 0.85, 0.018, 1.1 + i * 0.95);
  path.rotation.y = -0.58;
  path.material = earthMat;
}
for (let i = 0; i < 26; i++) {
  const angle = i * 2.17;
  const radius = 8 + (i % 5) * 2.1;
  const tuft = MeshBuilder.CreateBox("grass-tuft-" + i, { width: 0.07, height: 0.34 + (i % 3) * 0.08, depth: 0.07 }, scene);
  tuft.position.set(Math.cos(angle) * radius, 0.18, Math.sin(angle) * radius);
  tuft.rotation.z = (i % 2 ? 0.22 : -0.22);
  tuft.material = grassMat;
}
// Niskie, odległe wzgórza zamykają horyzont bez ciężkiej geometrii.
for (let i = 0; i < 8; i++) {
  const angle = i * Math.PI / 4;
  const hill = MeshBuilder.CreateSphere("distant-hill-" + i, { diameter: 1, segments: 7 }, scene);
  hill.position.set(Math.cos(angle) * 43, -1.2, Math.sin(angle) * 43);
  hill.scaling.set(10 + (i % 3) * 2, 4.5 + (i % 2), 8 + (i % 4));
  hill.material = i % 2 ? groundMat : grassMat;
}

const oreMat = new StandardMaterial("iron-ore-material", scene);
oreMat.diffuseColor = new Color3(0.48, 0.31, 0.22);
oreMat.specularColor = new Color3(0.12, 0.10, 0.08);
const oreGlowMat = new StandardMaterial("ore-marker-material", scene);
oreGlowMat.diffuseColor = new Color3(0.95, 0.62, 0.28);
oreGlowMat.emissiveColor = new Color3(0.22, 0.09, 0.025);
const machineBodyMat = new StandardMaterial("machine-body-material", scene);
machineBodyMat.diffuseColor = new Color3(0.22, 0.34, 0.36);
const machineAccentMat = new StandardMaterial("machine-accent-material", scene);
machineAccentMat.diffuseColor = new Color3(0.92, 0.58, 0.2);
machineAccentMat.emissiveColor = new Color3(0.12, 0.055, 0.012);
const darkMachineTrackMat = new StandardMaterial("machine-track-material", scene);
darkMachineTrackMat.diffuseColor = new Color3(0.075, 0.105, 0.11);
const furnaceMat = new StandardMaterial("furnace-body-material", scene);
furnaceMat.diffuseColor = new Color3(0.17, 0.23, 0.25);
const furnaceMetalMat = new StandardMaterial("furnace-metal-material", scene);
furnaceMetalMat.diffuseColor = new Color3(0.42, 0.48, 0.47);
const furnaceGlowMat = new StandardMaterial("furnace-glow-material", scene);
furnaceGlowMat.diffuseColor = new Color3(1, 0.31, 0.055);
furnaceGlowMat.emissiveColor = new Color3(0.9, 0.16, 0.015);
const smelterSiteMat = new StandardMaterial("smelter-site-material", scene);
smelterSiteMat.diffuseColor = new Color3(0.76, 0.55, 0.25);
smelterSiteMat.emissiveColor = new Color3(0.12, 0.065, 0.018);
const MACHINE_COST = 100;
const MACHINE_CYCLE_SECONDS = 4;
const SMELTER_COST = 250;
const SMELTER_IRON_PER_INGOT = 50;
const SMELTER_CYCLE_SECONDS = 8;
const SMELTER_UPGRADE_COSTS = [0, 100, 200];
const SMELTER_RANGE = 5.5;
const CONVEYOR_STEEL_COST = 150;
const CONVEYOR_CYCLE_SECONDS = 4;
type OreNode = {
  mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>;
  marker: ReturnType<typeof MeshBuilder.CreateCylinder>;
  beacon: ReturnType<typeof MeshBuilder.CreateTorus>;
  amount: number;
  machineBuilt: boolean;
  machineLevel: number;
  machineParts: ReturnType<typeof MeshBuilder.CreateBox>[];
  machineTimer: number;
};
const oreNodes: OreNode[] = [];
const orePositions = [new Vector3(2.2, 0, 2.2)];
orePositions.forEach((position, index) => {
  const ore = MeshBuilder.CreatePolyhedron("iron-ore-" + index, { type: 1, size: 2.15 }, scene);
  ore.position.set(position.x, 0.62, position.z);
  ore.scaling.set(1.55, 0.92, 1.42);
  ore.rotation.set(index * 0.17, index * 0.61, index * 0.11);
  ore.material = oreMat;
  const marker = MeshBuilder.CreateCylinder("ore-marker-" + index, { height: 0.1, diameter: 4.4, tessellation: 40 }, scene);
  marker.position.set(position.x, 0.06, position.z);
  marker.material = oreGlowMat;
  // Unoszący się pierścień jest czytelnym znacznikiem złoża także z większej odległości.
  const beacon = MeshBuilder.CreateTorus("ore-beacon-" + index, { diameter: 5.25, thickness: 0.11, tessellation: 32 }, scene);
  beacon.position.set(position.x, 2.8, position.z);
  beacon.rotation.x = Math.PI / 2;
  beacon.material = oreGlowMat;
  oreNodes.push({ mesh: ore, marker, beacon, amount: -1, machineBuilt: false, machineLevel: 1, machineParts: [], machineTimer: 0 });
});
const smelterSiteMarker = MeshBuilder.CreateTorus("smelter-build-site", { diameter: 4.5, thickness: 0.13, tessellation: 40 }, scene);
smelterSiteMarker.position.set(-3.8, 0.09, 1.2);
smelterSiteMarker.rotation.x = Math.PI / 2;
smelterSiteMarker.material = smelterSiteMat;

// Górnik w kombinezonie roboczym. Niewidoczny kapsułowy korzeń zachowuje stabilny punkt ruchu.
const player = MeshBuilder.CreateCapsule("player-root", { height: 2.1, radius: 0.48 }, scene);
player.position.set(0, 1.05, 0);
player.isVisible = false;
const suitMat = new StandardMaterial("worker-suit-material", scene);
suitMat.diffuseColor = new Color3(0.88, 0.48, 0.16);
const darkSuitMat = new StandardMaterial("worker-dark-material", scene);
darkSuitMat.diffuseColor = new Color3(0.12, 0.19, 0.21);
const helmetMat = new StandardMaterial("worker-helmet-material", scene);
helmetMat.diffuseColor = new Color3(0.96, 0.66, 0.2);
helmetMat.emissiveColor = new Color3(0.08, 0.035, 0.006);
const visorMat = new StandardMaterial("worker-visor-material", scene);
visorMat.diffuseColor = new Color3(0.12, 0.27, 0.31);
visorMat.emissiveColor = new Color3(0.025, 0.07, 0.08);
const skinMat = new StandardMaterial("worker-skin-material", scene);
skinMat.diffuseColor = new Color3(0.72, 0.49, 0.34);
const workerTorso = MeshBuilder.CreateCapsule("worker-torso", { height: 1.05, radius: 0.34 }, scene);
workerTorso.parent = player;
workerTorso.position.set(0, 0.08, 0);
workerTorso.material = suitMat;
const workerHead = MeshBuilder.CreateSphere("worker-head", { diameter: 0.56, segments: 10 }, scene);
workerHead.parent = player;
workerHead.position.set(0, 0.83, 0.02);
workerHead.material = skinMat;
const helmet = MeshBuilder.CreateSphere("worker-helmet", { diameter: 0.66, segments: 10 }, scene);
helmet.parent = player;
helmet.position.set(0, 1.05, 0.02);
helmet.scaling.y = 0.58;
helmet.material = helmetMat;
const visor = MeshBuilder.CreateBox("worker-visor", { width: 0.39, height: 0.16, depth: 0.12 }, scene);
visor.parent = player;
visor.position.set(0, 0.86, 0.27);
visor.material = visorMat;
const backpack = MeshBuilder.CreateBox("worker-backpack", { width: 0.48, height: 0.65, depth: 0.25 }, scene);
backpack.parent = player;
backpack.position.set(0, 0.13, -0.38);
backpack.material = darkSuitMat;
const leftArm = MeshBuilder.CreateCapsule("worker-left-arm", { height: 0.78, radius: 0.14 }, scene);
leftArm.parent = player;
leftArm.position.set(-0.43, 0.02, 0.02);
leftArm.rotation.z = -0.22;
leftArm.material = suitMat;
const rightArm = MeshBuilder.CreateCapsule("worker-right-arm", { height: 0.78, radius: 0.14 }, scene);
rightArm.parent = player;
rightArm.position.set(0.43, 0.02, 0.02);
rightArm.rotation.z = 0.22;
rightArm.material = suitMat;
const leftLeg = MeshBuilder.CreateBox("worker-left-leg", { width: 0.22, height: 0.62, depth: 0.25 }, scene);
leftLeg.parent = player;
leftLeg.position.set(-0.18, -0.58, 0);
leftLeg.material = darkSuitMat;
const rightLeg = MeshBuilder.CreateBox("worker-right-leg", { width: 0.22, height: 0.62, depth: 0.25 }, scene);
rightLeg.parent = player;
rightLeg.position.set(0.18, -0.58, 0);
rightLeg.material = darkSuitMat;
const leftBoot = MeshBuilder.CreateBox("worker-left-boot", { width: 0.25, height: 0.16, depth: 0.38 }, scene);
leftBoot.parent = player;
leftBoot.position.set(-0.18, -0.92, 0.07);
leftBoot.material = darkSuitMat;
const rightBoot = MeshBuilder.CreateBox("worker-right-boot", { width: 0.25, height: 0.16, depth: 0.38 }, scene);
rightBoot.parent = player;
rightBoot.position.set(0.18, -0.92, 0.07);
rightBoot.material = darkSuitMat;

const camera = new ArcRotateCamera("follow-camera", -Math.PI / 2, 1.12, 15, player.position, scene);
camera.lowerRadiusLimit = 9;
camera.upperRadiusLimit = 23;
camera.lowerBetaLimit = 0.45;
camera.upperBetaLimit = 1.42;
camera.panningSensibility = 0;
camera.wheelPrecision = 45;
camera.attachControl(canvas, true);
camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

// Lekka korekcja obrazu: lepszy kontrast, cieplejsze światło i subtelna poświata.
const renderingPipeline = new DefaultRenderingPipeline("terra-render-pipeline", !mobileDevice, scene, [camera]);
renderingPipeline.fxaaEnabled = true;
renderingPipeline.imageProcessingEnabled = true;
renderingPipeline.imageProcessing.contrast = 1.12;
renderingPipeline.imageProcessing.exposure = 1.08;
renderingPipeline.imageProcessing.toneMappingEnabled = true;
renderingPipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
renderingPipeline.bloomEnabled = !mobileDevice;
renderingPipeline.bloomThreshold = 0.88;
renderingPipeline.bloomWeight = 0.16;
renderingPipeline.bloomKernel = 48;
const glowLayer = new GlowLayer("terra-soft-glow", scene, { blurKernelSize: 24 });
glowLayer.intensity = mobileDevice ? 0.28 : 0.42;

const pressed = new Set<string>();
const moveJoystick = document.querySelector<HTMLDivElement>("#move-joystick");
const joystickKnob = document.querySelector<HTMLDivElement>("#joystick-knob");
let joystickX = 0;
let joystickY = 0;
let joystickPointerId: number | null = null;
function updateJoystick(event: PointerEvent): void {
  if (!moveJoystick || !joystickKnob) return;
  const rect = moveJoystick.getBoundingClientRect();
  const radius = Math.min(rect.width, rect.height) * 0.34;
  let dx = (event.clientX - (rect.left + rect.width / 2)) / radius;
  let dy = (event.clientY - (rect.top + rect.height / 2)) / radius;
  const length = Math.hypot(dx, dy);
  if (length > 1) { dx /= length; dy /= length; }
  joystickX = dx;
  joystickY = dy;
  joystickKnob.style.left = (50 + dx * 34) + "%";
  joystickKnob.style.top = (50 + dy * 34) + "%";
}
moveJoystick?.addEventListener("pointerdown", event => {
  event.preventDefault();
  joystickPointerId = event.pointerId;
  moveJoystick.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
moveJoystick?.addEventListener("pointermove", event => {
  if (event.pointerId === joystickPointerId) updateJoystick(event);
});
const releaseJoystick = (event: PointerEvent) => {
  if (event.pointerId !== joystickPointerId) return;
  joystickPointerId = null;
  joystickX = 0;
  joystickY = 0;
  if (joystickKnob) { joystickKnob.style.left = "50%"; joystickKnob.style.top = "50%"; }
};
moveJoystick?.addEventListener("pointerup", releaseJoystick);
moveJoystick?.addEventListener("pointercancel", releaseJoystick);
moveJoystick?.addEventListener("lostpointercapture", releaseJoystick);
const keyMap: Record<string, string> = {
  KeyW: "forward", ArrowUp: "forward", KeyS: "back", ArrowDown: "back",
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right"
};
// Klawiatura pozostaje pomocnicza w środowisku developerskim; docelowe sterowanie jest dotykowe.
window.addEventListener("keydown", event => {
  const action = keyMap[event.code];
  if (action) { pressed.add(action); event.preventDefault(); }
  if (event.code === "KeyE") collectOre();
});
window.addEventListener("keyup", event => {
  const action = keyMap[event.code];
  if (action) pressed.delete(action);
});
window.addEventListener("blur", () => pressed.clear());

// Ruch dotykowy obsługuje teraz analogowy joystick ekranowy.

const ironCounter = document.querySelector<HTMLElement>("#iron-count");
const statusText = document.querySelector<HTMLElement>("#interaction-status");
const interactButton = document.querySelector<HTMLButtonElement>("#interact-button");
const machinePanel = document.querySelector<HTMLElement>("#machine-panel");
const menuPanelTitle = document.querySelector<HTMLElement>("#menu-panel-title");
const menuPanelMessage = document.querySelector<HTMLElement>("#menu-panel-message");
const machineActions = document.querySelector<HTMLElement>("#machine-actions");
const menuButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".bottom-menu-button"));
let activeMenuTab = "home";
let menuPanelOpen = false;
const machinesMenuButton = menuButtons.find(button => button.dataset.tab === "machines");
menuButtons.forEach(button => button.addEventListener("click", () => {
  const tab = button.dataset.tab ?? "home";
  if (activeMenuTab === tab && menuPanelOpen) menuPanelOpen = false;
  else { activeMenuTab = tab; menuPanelOpen = true; }
  menuButtons.forEach(item => item.classList.toggle("active", menuPanelOpen && item.dataset.tab === activeMenuTab));
}));
const buildMachineButton = document.querySelector<HTMLButtonElement>("#build-machine-button");
const buildSmelterButton = document.querySelector<HTMLButtonElement>("#build-smelter-button");
const steelCounter = document.querySelector<HTMLElement>("#steel-count");
const smelterState = document.querySelector<HTMLElement>("#smelter-state");
const oreBufferCounter = document.querySelector<HTMLElement>("#ore-buffer-count");
const buildConveyorButton = document.querySelector<HTMLButtonElement>("#build-conveyor-button");
const upgradeSmelterButton = document.querySelector<HTMLButtonElement>("#upgrade-smelter-button");
let iron = 0;
let steel = 0;
let oreBuffer = 0;
let conveyorBuilt = false;
let conveyorTimer = 0;
let conveyorParts: ReturnType<typeof MeshBuilder.CreateBox>[] = [];
let conveyorCargo: ReturnType<typeof MeshBuilder.CreatePolyhedron>[] = [];
let smelterBuilt = false;
let smelterLevel = 1;
let smelterTimer = 0;
let smelterParts: ReturnType<typeof MeshBuilder.CreateBox>[] = [];
let smelterGlow: ReturnType<typeof MeshBuilder.CreateSphere> | null = null;
let smelterFan: ReturnType<typeof MeshBuilder.CreateCylinder> | null = null;
let nearbyOre: OreNode | null = null;
const INTERACTION_RANGE = 3.4;
// Zasobnik ma ograniczoną pojemność; pełny bufor zatrzymuje koparkę, nie marnując urobku.
const ORE_BUFFER_CAPACITY = 500;
const SAVE_KEY = "terra-industries-save-v1";
const saveStatus = document.querySelector<HTMLElement>("#save-status");

type SaveData = {
  version: 1;
  iron: number;
  player: { x: number; z: number };
  oreAmounts: number[];
  machines?: boolean[];
  machineLevels?: number[];
  steel?: number;
  smelterBuilt?: boolean;
  smelterLevel?: number;
  oreBuffer?: number;
  conveyorBuilt?: boolean;
};

function createMiningMachine(node: OreNode): void {
  if (node.machineBuilt) return;
  const x = node.mesh.position.x;
  const z = node.mesh.position.z;
  const parts: ReturnType<typeof MeshBuilder.CreateBox>[] = [];
  const base = MeshBuilder.CreateBox("miner-base", { width: 2.15, height: 0.24, depth: 2.0 }, scene);
  base.position.set(x, 0.16, z);
  base.material = machineBodyMat;
  parts.push(base);
  const chassis = MeshBuilder.CreateBox("miner-chassis", { width: 1.55, height: 0.48, depth: 1.35 }, scene);
  chassis.position.set(x, 0.48, z);
  chassis.material = machineAccentMat;
  parts.push(chassis);
  const housing = MeshBuilder.CreateBox("miner-housing", { width: 0.98, height: 1.25, depth: 0.92 }, scene);
  housing.position.set(x, 1.28, z - 0.08);
  housing.material = machineBodyMat;
  parts.push(housing);
  const drill = MeshBuilder.CreateCylinder("miner-drill", { height: 1.25, diameterTop: 0.12, diameterBottom: 0.42, tessellation: 9 }, scene);
  drill.position.set(x, 2.38, z + 0.2);
  drill.material = machineAccentMat;
  parts.push(drill);
  const arm = MeshBuilder.CreateBox("miner-boom", { width: 0.28, height: 1.55, depth: 0.3 }, scene);
  arm.position.set(x, 1.86, z + 0.48);
  arm.rotation.x = -0.24;
  arm.material = machineBodyMat;
  parts.push(arm);
  const control = MeshBuilder.CreateBox("miner-control", { width: 0.28, height: 0.38, depth: 0.09 }, scene);
  control.position.set(x, 1.28, z - 0.57);
  control.material = machineAccentMat;
  parts.push(control);
  const beacon = MeshBuilder.CreateCylinder("miner-warning-beacon", { height: 0.18, diameter: 0.22, tessellation: 10 }, scene);
  beacon.position.set(x + 0.34, 1.98, z - 0.08);
  beacon.material = oreGlowMat;
  parts.push(beacon);
  for (let side = -1; side <= 1; side += 2) {
    const track = MeshBuilder.CreateBox("miner-track-" + side, { width: 0.28, height: 0.34, depth: 1.62 }, scene);
    track.position.set(x + side * 0.91, 0.28, z);
    track.material = darkMachineTrackMat;
    parts.push(track);
  }
  node.machineParts = parts;
  node.machineBuilt = true;
  node.machineTimer = 0;
}

function createSmelter(): void {
  if (smelterBuilt) return;
  const x = -3.8;
  const z = 1.2;
  const parts: ReturnType<typeof MeshBuilder.CreateBox>[] = [];
  const foundation = MeshBuilder.CreateBox("smelter-foundation", { width: 3.8, height: 0.28, depth: 3.2 }, scene);
  foundation.position.set(x, 0.16, z);
  foundation.material = darkMachineTrackMat;
  parts.push(foundation);
  const lower = MeshBuilder.CreateBox("smelter-lower-frame", { width: 3.2, height: 0.42, depth: 2.65 }, scene);
  lower.position.set(x, 0.5, z);
  lower.material = furnaceMetalMat;
  parts.push(lower);
  const body = MeshBuilder.CreateBox("smelter-furnace-body", { width: 2.25, height: 2.1, depth: 2.05 }, scene);
  body.position.set(x, 1.72, z);
  body.material = furnaceMat;
  parts.push(body);
  const roof = MeshBuilder.CreateBox("smelter-roof", { width: 2.55, height: 0.24, depth: 2.35 }, scene);
  roof.position.set(x, 2.88, z);
  roof.material = furnaceMetalMat;
  parts.push(roof);
  const chimney = MeshBuilder.CreateCylinder("smelter-chimney", { height: 2.3, diameter: 0.62, tessellation: 12 }, scene);
  chimney.position.set(x + 0.62, 3.95, z - 0.35);
  chimney.material = furnaceMetalMat;
  parts.push(chimney);
  const chimneyCap = MeshBuilder.CreateCylinder("smelter-chimney-cap", { height: 0.18, diameter: 0.88, tessellation: 12 }, scene);
  chimneyCap.position.set(x + 0.62, 5.12, z - 0.35);
  chimneyCap.material = furnaceMat;
  parts.push(chimneyCap);
  smelterFan = chimneyCap;
  const fanBladeA = MeshBuilder.CreateBox("smelter-fan-blade-a", { width: 1.05, height: 0.08, depth: 0.2 }, scene);
  fanBladeA.parent = chimneyCap;
  fanBladeA.position.y = 0.18;
  fanBladeA.material = darkMachineTrackMat;
  const fanBladeB = MeshBuilder.CreateBox("smelter-fan-blade-b", { width: 1.05, height: 0.08, depth: 0.2 }, scene);
  fanBladeB.parent = chimneyCap;
  fanBladeB.position.y = 0.18;
  fanBladeB.rotation.y = Math.PI / 2;
  fanBladeB.material = darkMachineTrackMat;
  const doorFrame = MeshBuilder.CreateBox("smelter-door-frame", { width: 1.25, height: 1.12, depth: 0.18 }, scene);
  doorFrame.position.set(x, 1.55, z + 1.12);
  doorFrame.material = furnaceMetalMat;
  parts.push(doorFrame);
  const glow = MeshBuilder.CreateSphere("smelter-furnace-glow", { diameter: 0.72, segments: 10 }, scene);
  glow.position.set(x, 1.56, z + 1.24);
  glow.scaling.y = 0.78;
  glow.material = furnaceGlowMat;
  smelterGlow = glow;
  const controlPanel = MeshBuilder.CreateBox("smelter-control-panel", { width: 0.62, height: 0.78, depth: 0.16 }, scene);
  controlPanel.position.set(x + 1.22, 1.35, z + 0.98);
  controlPanel.material = machineBodyMat;
  parts.push(controlPanel);
  const gauge = MeshBuilder.CreateCylinder("smelter-pressure-gauge", { height: 0.12, diameter: 0.28, tessellation: 16 }, scene);
  gauge.position.set(x + 1.22, 1.62, z + 1.1);
  gauge.rotation.x = Math.PI / 2;
  gauge.material = furnaceGlowMat;
  parts.push(gauge);
  const pipe = MeshBuilder.CreateCylinder("smelter-side-pipe", { height: 1.5, diameter: 0.18, tessellation: 10 }, scene);
  pipe.position.set(x - 1.32, 1.5, z - 0.25);
  pipe.rotation.z = Math.PI / 2;
  pipe.material = furnaceMetalMat;
  parts.push(pipe);
  const vent = MeshBuilder.CreateBox("smelter-side-vent", { width: 0.12, height: 0.8, depth: 0.8 }, scene);
  vent.position.set(x - 1.18, 2.1, z - 0.65);
  vent.material = darkMachineTrackMat;
  parts.push(vent);
  smelterParts = parts;
  smelterBuilt = true;
  smelterSiteMarker.setEnabled(false);
  smelterTimer = 0;
}

function createConveyor(): void {
  if (conveyorBuilt) return;
  const start = new Vector3(2.2, 0, 2.2);
  const end = new Vector3(-3.8, 0, 1.2);
  const delta = end.subtract(start);
  const length = delta.length();
  const midpoint = start.add(end).scale(0.5);
  const angle = Math.atan2(delta.x, delta.z);
  const belt = MeshBuilder.CreateBox("ore-conveyor-belt", { width: 1.05, height: 0.16, depth: length }, scene);
  belt.position.set(midpoint.x, 0.48, midpoint.z);
  belt.rotation.y = angle;
  belt.material = darkMachineTrackMat;
  const sideA = MeshBuilder.CreateBox("ore-conveyor-side-a", { width: 0.12, height: 0.32, depth: length }, scene);
  sideA.position.set(midpoint.x + Math.cos(angle) * 0.52, 0.55, midpoint.z - Math.sin(angle) * 0.52);
  sideA.rotation.y = angle;
  sideA.material = machineBodyMat;
  const sideB = MeshBuilder.CreateBox("ore-conveyor-side-b", { width: 0.12, height: 0.32, depth: length }, scene);
  sideB.position.set(midpoint.x - Math.cos(angle) * 0.52, 0.55, midpoint.z + Math.sin(angle) * 0.52);
  sideB.rotation.y = angle;
  sideB.material = machineBodyMat;
  conveyorParts.push(belt, sideA, sideB);
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const point = Vector3.Lerp(start, end, t);
    const support = MeshBuilder.CreateBox("conveyor-support-" + i, { width: 1.28, height: 0.5, depth: 0.16 }, scene);
    support.position.set(point.x, 0.25, point.z);
    support.rotation.y = angle;
    support.material = furnaceMetalMat;
    conveyorParts.push(support);
    const roller = MeshBuilder.CreateCylinder("conveyor-roller-" + i, { height: 1.12, diameter: 0.13, tessellation: 10 }, scene);
    roller.position.set(point.x, 0.57, point.z);
    roller.rotation.z = Math.PI / 2;
    roller.rotation.y = angle;
    roller.material = furnaceMetalMat;
    conveyorParts.push(roller);
  }
  for (let i = 0; i < 3; i++) {
    const cargo = MeshBuilder.CreatePolyhedron("conveyor-ore-" + i, { type: 1, size: 0.23 }, scene);
    cargo.material = oreMat;
    conveyorCargo.push(cargo);
  }
  conveyorBuilt = true;
  conveyorTimer = 0;
}

function updateSaveStatus(message: string): void {
  if (saveStatus) saveStatus.textContent = message;
}

function saveGame(): void {
  const data: SaveData = {
    version: 1,
    iron,
    player: { x: player.position.x, z: player.position.z },
    oreAmounts: oreNodes.map(node => node.amount),
    machines: oreNodes.map(node => node.machineBuilt),
    machineLevels: oreNodes.map(node => node.machineLevel),
    steel,
    oreBuffer,
    conveyorBuilt,
    smelterBuilt,
    smelterLevel
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    updateSaveStatus("Zapisano automatycznie");
  } catch (error) {
    console.warn("Nie udało się zapisać postępu:", error);
    updateSaveStatus("Zapis niedostępny");
  }
}

function loadGame(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      updateSaveStatus("Nowa gra · zapis lokalny");
      return;
    }
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.version !== 1) throw new Error("Nieobsługiwana wersja zapisu");
    if (typeof data.iron === "number" && Number.isFinite(data.iron)) {
      iron = Math.max(0, Math.floor(data.iron));
    }
    if (typeof data.steel === "number" && Number.isFinite(data.steel)) {
      steel = Math.max(0, Math.floor(data.steel));
    }
    if (typeof data.oreBuffer === "number" && Number.isFinite(data.oreBuffer)) {
      oreBuffer = Math.max(0, Math.min(ORE_BUFFER_CAPACITY, Math.floor(data.oreBuffer)));
    }
    if (data.smelterBuilt === true) {
      createSmelter();
      if (typeof data.smelterLevel === "number" && Number.isFinite(data.smelterLevel)) {
        smelterLevel = Math.max(1, Math.min(3, Math.floor(data.smelterLevel)));
      }
    }
    if (data.conveyorBuilt === true && data.smelterBuilt === true) createConveyor();
    if (data.player && Number.isFinite(data.player.x) && Number.isFinite(data.player.z)) {
      player.position.x = Math.max(-42, Math.min(42, data.player.x));
      player.position.z = Math.max(-42, Math.min(42, data.player.z));
    }
    if (Array.isArray(data.oreAmounts)) {
      oreNodes.forEach((node, index) => {
        // Wszystkie złoża są teraz bezterminowe — także w starszych zapisach.
      });
    }
    if (Array.isArray(data.machines)) {
      oreNodes.forEach((node, index) => {
        if (data.machines?.[index] === true && node.amount !== 0) {
          createMiningMachine(node);
          const savedLevel = data.machineLevels?.[index];
          if (typeof savedLevel === "number" && Number.isFinite(savedLevel)) node.machineLevel = Math.max(1, Math.min(3, Math.floor(savedLevel)));
        }
      });
    }
    if (ironCounter) ironCounter.textContent = String(iron);
    if (steelCounter) steelCounter.textContent = String(steel);
    if (oreBufferCounter) oreBufferCounter.textContent = String(oreBuffer);
    updateSaveStatus("Wczytano zapis lokalny");
  } catch (error) {
    console.warn("Zapis gry jest uszkodzony lub nieaktualny:", error);
    updateSaveStatus("Nie udało się wczytać zapisu");
  }
}

loadGame();
window.setInterval(saveGame, 5000);
window.addEventListener("pagehide", saveGame);

function findNearbyOre(): OreNode | null {
  let nearest: OreNode | null = null;
  let nearestDistance = INTERACTION_RANGE;
  for (const node of oreNodes) {
    if (node.amount === 0) continue;
    const distance = Vector3.Distance(player.position, node.mesh.position);
    if (distance < nearestDistance) { nearest = node; nearestDistance = distance; }
  }
  return nearest;
}

function collectOre(): void {
  nearbyOre = findNearbyOre();
  if (!nearbyOre) {
    if (statusText) statusText.textContent = "Podejdź do głównego złoża żelaza";
    return;
  }
  iron += 10;
  if (ironCounter) ironCounter.textContent = String(iron);
  if (statusText) statusText.textContent = "Wydobyto 10 jednostek żelaza · główne złoże bez limitu";
  saveGame();
}

interactButton?.addEventListener("click", collectOre);

function buildMiningMachine(): void {
  nearbyOre = findNearbyOre();
  if (!nearbyOre) {
    if (statusText) statusText.textContent = "Podejdź do głównego złoża, aby ustawić koparkę";
    return;
  }
  if (nearbyOre.machineBuilt) {
    if (statusText) statusText.textContent = "Na tym złożu pracuje już koparka";
    return;
  }
  if (iron < MACHINE_COST) {
    if (statusText) statusText.textContent = "Potrzeba " + MACHINE_COST + " żelaza na koparkę";
    return;
  }
  iron -= MACHINE_COST;
  if (ironCounter) ironCounter.textContent = String(iron);
  createMiningMachine(nearbyOre);
  if (statusText) statusText.textContent = "Koparka uruchomiona · wydobycie automatyczne";
  saveGame();
}

buildMachineButton?.addEventListener("click", buildMiningMachine);

const upgradeMachineButton = document.querySelector<HTMLButtonElement>("#upgrade-machine-button");
const MACHINE_UPGRADE_COSTS = [0, 150, 250];
function upgradeMiningMachine(): void {
  nearbyOre = findNearbyOre();
  if (!nearbyOre?.machineBuilt) {
    if (statusText) statusText.textContent = "Podejdź do działającej koparki, aby ją ulepszyć";
    return;
  }
  if (nearbyOre.machineLevel >= 3) {
    if (statusText) statusText.textContent = "Koparka ma już maksymalny poziom";
    return;
  }
  const cost = MACHINE_UPGRADE_COSTS[nearbyOre.machineLevel];
  if (iron < cost) {
    if (statusText) statusText.textContent = "Potrzeba " + cost + " żelaza na ulepszenie koparki";
    return;
  }
  iron -= cost;
  nearbyOre.machineLevel += 1;
  if (ironCounter) ironCounter.textContent = String(iron);
  if (statusText) statusText.textContent = "Koparka ulepszona do poziomu " + nearbyOre.machineLevel + " · szybsze wydobycie";
  saveGame();
}
upgradeMachineButton?.addEventListener("click", upgradeMiningMachine);

function buildSmelter(): void {
  const distance = Math.hypot(player.position.x + 3.8, player.position.z - 1.2);
  if (distance > SMELTER_RANGE) {
    if (statusText) statusText.textContent = "Podejdź do oznaczonego miejsca przy bazie, aby zbudować hutę";
    return;
  }
  if (smelterBuilt) {
    if (statusText) statusText.textContent = "Huta jest już zbudowana i gotowa do pracy";
    return;
  }
  if (iron < SMELTER_COST) {
    if (statusText) statusText.textContent = "Potrzeba " + SMELTER_COST + " żelaza na hutę";
    return;
  }
  iron -= SMELTER_COST;
  if (ironCounter) ironCounter.textContent = String(iron);
  createSmelter();
  if (statusText) statusText.textContent = "Huta uruchomiona · przetwarza 50 żelaza na 10 stali";
  saveGame();
}
buildSmelterButton?.addEventListener("click", buildSmelter);

function buildConveyorBelt(): void {
  if (!smelterBuilt) {
    if (statusText) statusText.textContent = "Najpierw zbuduj hutę";
    return;
  }
  if (!oreNodes[0].machineBuilt || oreNodes[0].amount === 0) {
    if (statusText) statusText.textContent = "Najpierw uruchom koparkę przy oznaczonym złożu";
    return;
  }
  if (conveyorBuilt) {
    if (statusText) statusText.textContent = "Taśmociąg jest już podłączony";
    return;
  }
  if (steel < CONVEYOR_STEEL_COST) {
    if (statusText) statusText.textContent = "Potrzeba " + CONVEYOR_STEEL_COST + " stali na taśmociąg";
    return;
  }
  steel -= CONVEYOR_STEEL_COST;
  if (steelCounter) steelCounter.textContent = String(steel);
  createConveyor();
  if (statusText) statusText.textContent = "Taśmociąg podłączony · surowiec trafia prosto do zasobnika huty";
  saveGame();
}
buildConveyorButton?.addEventListener("click", buildConveyorBelt);

function upgradeSmelter(): void {
  const distance = Math.hypot(player.position.x + 3.8, player.position.z - 1.2);
  if (!smelterBuilt || distance > SMELTER_RANGE) {
    if (statusText) statusText.textContent = "Podejdź do huty, aby ją ulepszyć";
    return;
  }
  if (smelterLevel >= 3) {
    if (statusText) statusText.textContent = "Huta ma już maksymalny poziom";
    return;
  }
  const cost = SMELTER_UPGRADE_COSTS[smelterLevel];
  if (steel < cost) {
    if (statusText) statusText.textContent = "Potrzeba " + cost + " stali na ulepszenie huty";
    return;
  }
  steel -= cost;
  smelterLevel += 1;
  if (steelCounter) steelCounter.textContent = String(steel);
  if (statusText) statusText.textContent = "Huta ulepszona do poziomu " + smelterLevel + " · szybsza produkcja stali";
  saveGame();
}
upgradeSmelterButton?.addEventListener("click", upgradeSmelter);

scene.onBeforeRenderObservable.add(() => {
  const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
  // Wejście: góra joysticka = przód, lewo joysticka = lewo względem kamery.
  const forwardInput = Number(pressed.has("forward")) - Number(pressed.has("back")) - joystickY;
  const sidewaysInput = Number(pressed.has("right")) - Number(pressed.has("left")) + joystickX;
  const inputLength = Math.hypot(forwardInput, sidewaysInput);
  const isMoving = inputLength > 0.08;
  const walkPhase = performance.now() * 0.009;
  leftLeg.rotation.x = isMoving ? Math.sin(walkPhase) * 0.42 : 0;
  rightLeg.rotation.x = isMoving ? -Math.sin(walkPhase) * 0.42 : 0;
  leftArm.rotation.x = isMoving ? -Math.sin(walkPhase) * 0.28 : 0;
  rightArm.rotation.x = isMoving ? Math.sin(walkPhase) * 0.28 : 0;
  if (isMoving) {
    // Kierunek kamery w płaszczyźnie XZ. Poprzednia wersja miała zamienione
    // osie sin/cos, przez co ruch do przodu szedł bokiem, a lewo/prawo myliło się.
    const forwardX = -Math.cos(camera.alpha);
    const forwardZ = -Math.sin(camera.alpha);
    const rightX = -Math.sin(camera.alpha);
    const rightZ = Math.cos(camera.alpha);
    const direction = new Vector3(
      forwardX * forwardInput + rightX * sidewaysInput,
      0,
      forwardZ * forwardInput + rightZ * sidewaysInput
    );
    const speedFactor = Math.min(1, inputLength);
    direction.normalize();
    player.position.addInPlace(direction.scale(deltaSeconds * 5.2 * speedFactor));
    player.position.x = Math.max(-42, Math.min(42, player.position.x));
    player.position.z = Math.max(-42, Math.min(42, player.position.z));
    player.rotation.y = Math.atan2(direction.x, direction.z);
  }
  player.position.y = 1.05 + (isMoving ? Math.abs(Math.sin(walkPhase * 0.5)) * 0.045 : 0);
  camera.target.copyFrom(player.position);
  camera.target.y += 0.5;
  nearbyOre = findNearbyOre();
  const atSmelterSite = Math.hypot(player.position.x + 3.8, player.position.z - 1.2) <= SMELTER_RANGE;
  const nearAnyMachine = !!nearbyOre || atSmelterSite;
  machinesMenuButton?.classList.toggle("nearby", nearAnyMachine);
  machinesMenuButton?.setAttribute("aria-label", nearAnyMachine ? "Maszyny — obiekt w zasięgu" : "Maszyny");
  if (machinePanel) machinePanel.hidden = !menuPanelOpen;
  if (menuPanelTitle && menuPanelMessage && machineActions) {
    const tabTitle = activeMenuTab === "machines" ? "MASZYNY I ROZBUDOWA" : activeMenuTab === "storage" ? "MAGAZYN SUROWCÓW" : "CENTRUM OPERACYJNE";
    menuPanelTitle.textContent = tabTitle;
    machineActions.hidden = activeMenuTab !== "machines" || !nearAnyMachine;
    if (activeMenuTab === "storage") {
      const miner = oreNodes.find(node => node.machineBuilt);
      const ironRate = miner ? Math.round(60 * 10 / (MACHINE_CYCLE_SECONDS / miner.machineLevel)) : 0;
      const steelRate = smelterBuilt ? Math.round(60 * 10 / (SMELTER_CYCLE_SECONDS / smelterLevel)) : 0;
      menuPanelMessage.textContent = "Żelazo: " + iron + " · Stal: " + steel + " · Wsad: " + oreBuffer + "/" + ORE_BUFFER_CAPACITY + (oreBuffer >= ORE_BUFFER_CAPACITY ? " · ZASOBNIK PEŁNY" : "") + ". Maks. tempo: koparka " + ironRate + " żelaza/min · huta " + steelRate + " stali/min. Taśmociąg: " + (conveyorBuilt ? "zamontowany" : "brak") + ". Zasoby zapisują się automatycznie.";
    } else if (activeMenuTab === "machines" && !nearAnyMachine) {
      menuPanelMessage.textContent = "Podejdź do koparki przy złożu albo do oznaczonego miejsca huty. Dopiero wtedy pojawią się zakupy i ulepszenia.";
    } else if (activeMenuTab === "machines" && nearbyOre?.machineBuilt) {
      menuPanelMessage.textContent = "Koparka poziom " + nearbyOre.machineLevel + "/3 · wydobywa 10 żelaza co " + (MACHINE_CYCLE_SECONDS / nearbyOre.machineLevel).toFixed(1) + " s.";
    } else if (activeMenuTab === "machines" && nearbyOre) {
      menuPanelMessage.textContent = "Główne złoże żelaza · nieograniczona ilość. Możesz wydobywać ręcznie lub kupić koparkę.";
    } else if (activeMenuTab === "machines" && atSmelterSite) {
      menuPanelMessage.textContent = smelterBuilt
        ? "Huta poziom " + smelterLevel + "/3 · 10 stali co " + (SMELTER_CYCLE_SECONDS / smelterLevel).toFixed(1) + " s. Możesz ulepszyć produkcję lub transport."
        : "Miejsce pod budowę huty. Podejdź bliżej, aby ją kupić.";
    } else {
      menuPanelMessage.textContent = "Witaj w Terra Industries. Podejdź do maszyny i wybierz zakładkę MASZYNY, aby zobaczyć dostępne działania.";
    }
  }
  if (interactButton) {
    interactButton.hidden = !nearbyOre;
    interactButton.textContent = "WYDOBĄDŹ RUDĘ · E";
  }
  if (buildMachineButton) {
    buildMachineButton.hidden = !nearbyOre || !!nearbyOre.machineBuilt;
    buildMachineButton.disabled = !nearbyOre || !!nearbyOre.machineBuilt || iron < MACHINE_COST;
    buildMachineButton.textContent = "KUP KOPARKĘ · " + MACHINE_COST + " ŻELAZA";
  }
  if (upgradeMachineButton) {
    const canUpgrade = !!nearbyOre?.machineBuilt && nearbyOre.machineLevel < 3;
    const upgradeCost = nearbyOre ? MACHINE_UPGRADE_COSTS[nearbyOre.machineLevel] : 0;
    upgradeMachineButton.hidden = !nearbyOre?.machineBuilt;
    upgradeMachineButton.disabled = !canUpgrade || iron < upgradeCost;
    upgradeMachineButton.textContent = nearbyOre?.machineLevel === 3
      ? "KOPARKA · MAKS. POZIOM 3"
      : "ULEPSZ KOPARKĘ · " + upgradeCost + " ŻELAZA · POZ. " + (nearbyOre?.machineLevel ?? 1) + "/3";
  }
  if (buildSmelterButton) {
    const atSmelterSite = Math.hypot(player.position.x + 3.8, player.position.z - 1.2) <= SMELTER_RANGE;
    buildSmelterButton.hidden = !atSmelterSite || smelterBuilt;
    buildSmelterButton.disabled = smelterBuilt || !atSmelterSite || iron < SMELTER_COST;
    buildSmelterButton.textContent = "KUP HUTĘ · " + SMELTER_COST + " ŻELAZA";
  }
  if (smelterState) {
    smelterState.textContent = !smelterBuilt ? "BRAK" : "P" + smelterLevel + " · " + ((conveyorBuilt ? oreBuffer : iron) >= SMELTER_IRON_PER_INGOT ? "PRACA" : "POSTÓJ");
  }
  if (upgradeSmelterButton) {
    const atSmelterSite = Math.hypot(player.position.x + 3.8, player.position.z - 1.2) <= SMELTER_RANGE;
    const canUpgrade = smelterBuilt && smelterLevel < 3;
    const cost = SMELTER_UPGRADE_COSTS[smelterLevel] ?? 0;
    upgradeSmelterButton.hidden = !atSmelterSite || !smelterBuilt;
    upgradeSmelterButton.disabled = !canUpgrade || steel < cost;
    upgradeSmelterButton.textContent = smelterLevel >= 3
      ? "HUTA · MAKS. POZIOM 3"
      : "ULEPSZ HUTĘ · " + cost + " STALI · POZ. " + smelterLevel + "/3";
  }
  if (buildConveyorButton) {
    const atSmelterSite = Math.hypot(player.position.x + 3.8, player.position.z - 1.2) <= SMELTER_RANGE;
    const canBuild = smelterBuilt && oreNodes[0].machineBuilt && oreNodes[0].amount !== 0;
    buildConveyorButton.hidden = !atSmelterSite || !smelterBuilt || conveyorBuilt;
    buildConveyorButton.disabled = conveyorBuilt || !canBuild || steel < CONVEYOR_STEEL_COST;
    buildConveyorButton.textContent = conveyorBuilt
      ? "TAŚMOCIĄG PODŁĄCZONY"
      : "ZBUDUJ TAŚMOCIĄG · " + CONVEYOR_STEEL_COST + " STALI";
  }
  if (oreBufferCounter) oreBufferCounter.textContent = String(oreBuffer);
  if (!smelterBuilt) smelterSiteMarker.rotation.y += deltaSeconds * 0.12;
  if (nearbyOre && statusText) {
    statusText.textContent = nearbyOre.machineBuilt
      ? "Koparka poziom " + nearbyOre.machineLevel + "/3 w zasięgu · otwórz MASZYNY, aby ją ulepszyć"
      : "Główne złoże żelaza w zasięgu · bez limitu · otwórz MASZYNY";
  } else if (atSmelterSite && statusText) {
    statusText.textContent = smelterBuilt
      ? "Huta w zasięgu · otwórz MASZYNY, aby ulepszyć produkcję lub transport"
      : "Miejsce budowy huty w zasięgu · otwórz MASZYNY";
  }
  if (smelterBuilt && smelterGlow) {
    const smelterInput = conveyorBuilt ? oreBuffer : iron;
    const active = smelterInput >= SMELTER_IRON_PER_INGOT;
    if (active) smelterTimer += deltaSeconds;
    if (smelterFan) smelterFan.rotation.y += deltaSeconds * (active ? 1.7 : 0.25);
    const pulse = 0.72 + Math.sin(performance.now() * 0.008) * 0.12;
    smelterGlow.scaling.set(1, 0.78 * pulse, 1);
    furnaceGlowMat.emissiveColor = active
      ? new Color3(0.9 * pulse, 0.16 * pulse, 0.015)
      : new Color3(0.08, 0.025, 0.005);
    const smelterCycle = SMELTER_CYCLE_SECONDS / smelterLevel;
    if (active && smelterTimer >= smelterCycle) {
      smelterTimer -= smelterCycle;
      if (conveyorBuilt) oreBuffer -= SMELTER_IRON_PER_INGOT;
      else iron -= SMELTER_IRON_PER_INGOT;
      steel += 10;
      if (ironCounter) ironCounter.textContent = String(iron);
      if (steelCounter) steelCounter.textContent = String(steel);
      if (oreBufferCounter) oreBufferCounter.textContent = String(oreBuffer);
      if (statusText) statusText.textContent = "Huta wyprodukowała 10 jednostek stali";
      saveGame();
    }
  }
  if (conveyorBuilt) {
    const start = new Vector3(2.2, 0, 2.2);
    const end = new Vector3(-3.8, 0, 1.2);
    const travel = (performance.now() * 0.00016) % 1;
    conveyorCargo.forEach((cargo, index) => {
      const t = (travel + index / conveyorCargo.length) % 1;
      const point = Vector3.Lerp(start, end, t);
      cargo.position.set(point.x, 0.72 + Math.sin(t * Math.PI * 8) * 0.035, point.z);
      cargo.rotation.y += deltaSeconds * 1.8;
    });
  }
  for (const node of oreNodes) {
    node.beacon.rotation.y += deltaSeconds * 0.42;
    node.beacon.position.y = 2.8 + Math.sin(performance.now() * 0.0018 + node.mesh.position.x) * 0.12;
    if (!node.machineBuilt || node.amount === 0) continue;
    if (conveyorBuilt && node === oreNodes[0] && oreBuffer >= ORE_BUFFER_CAPACITY) {
      node.machineTimer = 0;
      continue;
    }
    if (node.machineParts[3]) node.machineParts[3].rotation.y += deltaSeconds * 1.8;
    if (node.machineParts[6]) node.machineParts[6].rotation.y += deltaSeconds * 2.5;
    node.machineTimer += deltaSeconds;
    if (node.machineTimer >= MACHINE_CYCLE_SECONDS / node.machineLevel) {
      node.machineTimer -= MACHINE_CYCLE_SECONDS / node.machineLevel;
      if (conveyorBuilt && node === oreNodes[0]) oreBuffer = Math.min(ORE_BUFFER_CAPACITY, oreBuffer + 10);
      else iron += 10;
      if (ironCounter) ironCounter.textContent = String(iron);
      if (oreBufferCounter) oreBufferCounter.textContent = String(oreBuffer);
      if (statusText) statusText.textContent = "Koparka wydobyła 10 jednostek żelaza";
      saveGame();
    }
  }
});

engine.runRenderLoop(() => scene.render());

// GitHub Releases jest darmowym źródłem aktualizacji gry (bez serwera i abonamentu).
// Aktualizacje WWW pobieramy tylko w natywnej aplikacji Android/iOS.
const GITHUB_RELEASES_URL = "https://api.github.com/repos/GoldenWolf25sklep/terra-industries/releases/latest";
let updateCheckRunning = false;

async function checkForGitHubUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform() || updateCheckRunning) return;
  updateCheckRunning = true;
  try {
    const response = await fetch(GITHUB_RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store"
    });
    if (!response.ok) return;
    const release = await response.json() as {
      tag_name?: string;
      assets?: Array<{ name?: string; browser_download_url?: string }>;
    };
    const version = release.tag_name;
    const asset = release.assets?.find(item => item.name === "terra-live-update.zip");
    if (!version || !asset?.browser_download_url) return;

    const current = await CapacitorUpdater.current();
    if (current.bundle?.version === version) return;
    if (localStorage.getItem("terra-industries-pending-update") === version) return;

    const bundle = await CapacitorUpdater.download({
      url: asset.browser_download_url,
      version
    });
    await CapacitorUpdater.next({ id: bundle.id });
    localStorage.setItem("terra-industries-pending-update", version);
    console.info("Pobrano aktualizację Terra Industries:", version);
  } catch (error) {
    console.warn("Nie udało się sprawdzić aktualizacji GitHub:", error);
  } finally {
    updateCheckRunning = false;
  }
}

// Najpierw potwierdź uruchomienie bieżącej wersji; potem sprawdź darmowe wydanie GitHub.
void CapacitorUpdater.notifyAppReady().then(() => {
  void checkForGitHubUpdate();
}).catch(error => {
  console.warn("Nie udało się potwierdzić uruchomienia gry:", error);
});
window.setInterval(() => void checkForGitHubUpdate(), 30 * 60 * 1000);

window.addEventListener("resize", () => {
  engine.resize();
  const isPhone = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800;
  engine.setHardwareScalingLevel(isPhone ? (window.devicePixelRatio > 2 ? 1.25 : 1) : 1);
});
