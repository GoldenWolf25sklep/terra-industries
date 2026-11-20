import {
  ArcRotateCamera, Color3, Color4, DirectionalLight, Engine, HemisphericLight,
  MeshBuilder, Scene, StandardMaterial, Vector3
} from "@babylonjs/core";
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
if (mobileDevice) engine.setHardwareScalingLevel(window.devicePixelRatio > 2 ? 1.5 : 1.25);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.035, 0.065, 0.07, 1);

const hemi = new HemisphericLight("ambient-light", new Vector3(0, 1, 0), scene);
hemi.intensity = 0.9;
const sun = new DirectionalLight("sun", new Vector3(-0.45, -1, 0.35), scene);
sun.position = new Vector3(20, 35, -20);
sun.intensity = 1.2;

const groundMat = new StandardMaterial("ground-material", scene);
groundMat.diffuseColor = new Color3(0.19, 0.27, 0.22);
groundMat.specularColor = Color3.Black();
const ground = MeshBuilder.CreateGround("terrain", { width: 90, height: 90, subdivisions: 2 }, scene);
ground.material = groundMat;

const gridMat = new StandardMaterial("grid-material", scene);
gridMat.diffuseColor = new Color3(0.38, 0.52, 0.43);
gridMat.alpha = 0.055;
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
const MACHINE_COST = 8;
const MACHINE_CYCLE_SECONDS = 4;
const SMELTER_COST = 12;
const SMELTER_IRON_PER_INGOT = 5;
const SMELTER_CYCLE_SECONDS = 8;
const SMELTER_RANGE = 5.5;
const CONVEYOR_STEEL_COST = 4;
const CONVEYOR_CYCLE_SECONDS = 4;
type OreNode = {
  mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>;
  marker: ReturnType<typeof MeshBuilder.CreateCylinder>;
  amount: number;
  machineBuilt: boolean;
  machineParts: ReturnType<typeof MeshBuilder.CreateBox>[];
  machineTimer: number;
};
const oreNodes: OreNode[] = [];
const orePositions = [
  new Vector3(5, 0, 4), new Vector3(7, 0, 5), new Vector3(4, 0, 7),
  new Vector3(8, 0, 8), new Vector3(2, 0, 6), new Vector3(6, 0, 10)
];
orePositions.forEach((position, index) => {
  const ore = MeshBuilder.CreatePolyhedron("iron-ore-" + index, { type: 1, size: 1.05 }, scene);
  ore.position.set(position.x, 0.62, position.z);
  ore.scaling.set(1.15, 0.8, 1);
  ore.rotation.set(index * 0.17, index * 0.61, index * 0.11);
  ore.material = oreMat;
  const marker = MeshBuilder.CreateCylinder("ore-marker-" + index, { height: 0.08, diameter: 1.9, tessellation: 32 }, scene);
  marker.position.set(position.x, 0.06, position.z);
  marker.material = oreGlowMat;
  oreNodes.push({ mesh: ore, marker, amount: 5, machineBuilt: false, machineParts: [], machineTimer: 0 });
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

const pressed = new Set<string>();
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

document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach(button => {
  const action = button.dataset.move;
  if (!action) return;
  const release = () => pressed.delete(action);
  button.addEventListener("pointerdown", event => {
    event.preventDefault(); pressed.add(action); button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

const ironCounter = document.querySelector<HTMLElement>("#iron-count");
const statusText = document.querySelector<HTMLElement>("#interaction-status");
const interactButton = document.querySelector<HTMLButtonElement>("#interact-button");
const buildMachineButton = document.querySelector<HTMLButtonElement>("#build-machine-button");
const buildSmelterButton = document.querySelector<HTMLButtonElement>("#build-smelter-button");
const steelCounter = document.querySelector<HTMLElement>("#steel-count");
const smelterState = document.querySelector<HTMLElement>("#smelter-state");
const oreBufferCounter = document.querySelector<HTMLElement>("#ore-buffer-count");
const buildConveyorButton = document.querySelector<HTMLButtonElement>("#build-conveyor-button");
let iron = 0;
let steel = 0;
let oreBuffer = 0;
let conveyorBuilt = false;
let conveyorTimer = 0;
let conveyorParts: ReturnType<typeof MeshBuilder.CreateBox>[] = [];
let conveyorCargo: ReturnType<typeof MeshBuilder.CreatePolyhedron>[] = [];
let smelterBuilt = false;
let smelterTimer = 0;
let smelterParts: ReturnType<typeof MeshBuilder.CreateBox>[] = [];
let smelterGlow: ReturnType<typeof MeshBuilder.CreateSphere> | null = null;
let smelterFan: ReturnType<typeof MeshBuilder.CreateCylinder> | null = null;
let nearbyOre: OreNode | null = null;
const INTERACTION_RANGE = 3.4;
const SAVE_KEY = "terra-industries-save-v1";
const saveStatus = document.querySelector<HTMLElement>("#save-status");

type SaveData = {
  version: 1;
  iron: number;
  player: { x: number; z: number };
  oreAmounts: number[];
  machines?: boolean[];
  steel?: number;
  smelterBuilt?: boolean;
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
  const start = new Vector3(5, 0, 4);
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
    steel,
    oreBuffer,
    conveyorBuilt,
    smelterBuilt
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
      oreBuffer = Math.max(0, Math.floor(data.oreBuffer));
    }
    if (data.smelterBuilt === true) createSmelter();
    if (data.conveyorBuilt === true && data.smelterBuilt === true) createConveyor();
    if (data.player && Number.isFinite(data.player.x) && Number.isFinite(data.player.z)) {
      player.position.x = Math.max(-42, Math.min(42, data.player.x));
      player.position.z = Math.max(-42, Math.min(42, data.player.z));
    }
    if (Array.isArray(data.oreAmounts)) {
      oreNodes.forEach((node, index) => {
        const amount = data.oreAmounts?.[index];
        if (typeof amount === "number" && Number.isFinite(amount)) {
          node.amount = Math.max(0, Math.min(5, Math.floor(amount)));
          if (node.amount === 0) {
            node.mesh.setEnabled(false);
            node.marker.setEnabled(false);
          } else {
            node.mesh.scaling.scaleInPlace(Math.pow(0.91, 5 - node.amount));
          }
        }
      });
    }
    if (Array.isArray(data.machines)) {
      oreNodes.forEach((node, index) => {
        if (data.machines?.[index] === true && node.amount > 0) createMiningMachine(node);
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
    if (node.amount <= 0) continue;
    const distance = Vector3.Distance(player.position, node.mesh.position);
    if (distance < nearestDistance) { nearest = node; nearestDistance = distance; }
  }
  return nearest;
}

function collectOre(): void {
  nearbyOre = findNearbyOre();
  if (!nearbyOre) {
    if (statusText) statusText.textContent = "Podejdź bliżej do złoża żelaza";
    return;
  }
  nearbyOre.amount -= 1;
  iron += 1;
  if (ironCounter) ironCounter.textContent = String(iron);
  nearbyOre.mesh.scaling.scaleInPlace(0.91);
  if (nearbyOre.amount <= 0) {
    nearbyOre.mesh.setEnabled(false);
    nearbyOre.marker.setEnabled(false);
    if (statusText) statusText.textContent = "Złoże wyczerpane · poszukaj kolejnego";
  } else if (statusText) {
    statusText.textContent = "Wydobyto 1 rudę · pozostało w złożu: " + nearbyOre.amount;
  }
  saveGame();
}

interactButton?.addEventListener("click", collectOre);

function buildMiningMachine(): void {
  nearbyOre = findNearbyOre();
  if (!nearbyOre) {
    if (statusText) statusText.textContent = "Podejdź do złoża, aby ustawić koparkę";
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
  if (statusText) statusText.textContent = "Huta uruchomiona · przetwarza 5 żelaza na 1 sztabkę";
  saveGame();
}
buildSmelterButton?.addEventListener("click", buildSmelter);

function buildConveyorBelt(): void {
  if (!smelterBuilt) {
    if (statusText) statusText.textContent = "Najpierw zbuduj hutę";
    return;
  }
  if (!oreNodes[0].machineBuilt || oreNodes[0].amount <= 0) {
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
  if (statusText) statusText.textContent = "Taśmociąg podłączony · ruda trafia prosto do zasobnika huty";
  saveGame();
}
buildConveyorButton?.addEventListener("click", buildConveyorBelt);

scene.onBeforeRenderObservable.add(() => {
  const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
  const forward = Number(pressed.has("forward")) - Number(pressed.has("back"));
  const sideways = Number(pressed.has("right")) - Number(pressed.has("left"));
  const isMoving = forward !== 0 || sideways !== 0;
  const walkPhase = performance.now() * 0.009;
  leftLeg.rotation.x = isMoving ? Math.sin(walkPhase) * 0.42 : 0;
  rightLeg.rotation.x = isMoving ? -Math.sin(walkPhase) * 0.42 : 0;
  leftArm.rotation.x = isMoving ? -Math.sin(walkPhase) * 0.28 : 0;
  rightArm.rotation.x = isMoving ? Math.sin(walkPhase) * 0.28 : 0;
  if (isMoving) {
    const direction = new Vector3(
      -Math.sin(camera.alpha) * forward + Math.cos(camera.alpha) * sideways,
      0,
      -Math.cos(camera.alpha) * forward - Math.sin(camera.alpha) * sideways
    ).normalize();
    player.position.addInPlace(direction.scale(deltaSeconds * 5.2));
    player.position.x = Math.max(-42, Math.min(42, player.position.x));
    player.position.z = Math.max(-42, Math.min(42, player.position.z));
    player.rotation.y = Math.atan2(direction.x, direction.z);
  }
  player.position.y = 1.05 + (isMoving ? Math.abs(Math.sin(walkPhase * 0.5)) * 0.045 : 0);
  camera.target.copyFrom(player.position);
  camera.target.y += 0.5;
  nearbyOre = findNearbyOre();
  if (interactButton) interactButton.textContent = nearbyOre ? "WYDOBĄDŹ RUDĘ · E" : "BRAK ZŁOŻA W ZASIĘGU";
  if (buildMachineButton) {
    buildMachineButton.disabled = !nearbyOre || !!nearbyOre.machineBuilt || iron < MACHINE_COST;
    buildMachineButton.textContent = nearbyOre?.machineBuilt
      ? "KOPARKA DZIAŁA"
      : "ZBUDUJ KOPARKĘ · " + MACHINE_COST + " ŻELAZA";
  }
  if (buildSmelterButton) {
    const atBase = Math.hypot(player.position.x + 3.8, player.position.z - 1.2) <= SMELTER_RANGE;
    buildSmelterButton.disabled = smelterBuilt || !atBase || iron < SMELTER_COST;
    buildSmelterButton.textContent = smelterBuilt
      ? "HUTA DZIAŁA"
      : "ZBUDUJ HUTĘ · " + SMELTER_COST + " ŻELAZA";
  }
  if (smelterState) {
    smelterState.textContent = !smelterBuilt ? "BRAK" : (conveyorBuilt ? oreBuffer : iron) >= SMELTER_IRON_PER_INGOT ? "PRACA" : "POSTÓJ";
  }
  if (buildConveyorButton) {
    const canBuild = smelterBuilt && oreNodes[0].machineBuilt && oreNodes[0].amount > 0;
    buildConveyorButton.disabled = conveyorBuilt || !canBuild || steel < CONVEYOR_STEEL_COST;
    buildConveyorButton.textContent = conveyorBuilt
      ? "TAŚMOCIĄG PODŁĄCZONY"
      : "ZBUDUJ TAŚMOCIĄG · " + CONVEYOR_STEEL_COST + " STALI";
  }
  if (oreBufferCounter) oreBufferCounter.textContent = String(oreBuffer);
  if (!smelterBuilt) smelterSiteMarker.rotation.y += deltaSeconds * 0.12;
  if (nearbyOre && statusText && !nearbyOre.machineBuilt) {
    statusText.textContent = "Złoże żelaza w zasięgu · " + nearbyOre.amount + " jednostek";
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
    if (active && smelterTimer >= SMELTER_CYCLE_SECONDS) {
      smelterTimer -= SMELTER_CYCLE_SECONDS;
      if (conveyorBuilt) oreBuffer -= SMELTER_IRON_PER_INGOT;
      else iron -= SMELTER_IRON_PER_INGOT;
      steel += 1;
      if (ironCounter) ironCounter.textContent = String(iron);
      if (steelCounter) steelCounter.textContent = String(steel);
      if (oreBufferCounter) oreBufferCounter.textContent = String(oreBuffer);
      if (statusText) statusText.textContent = "Huta wyprodukowała 1 stalową sztabkę";
      saveGame();
    }
  }
  if (conveyorBuilt) {
    const start = new Vector3(5, 0, 4);
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
    if (!node.machineBuilt || node.amount <= 0) continue;
    if (node.machineParts[3]) node.machineParts[3].rotation.y += deltaSeconds * 1.8;
    if (node.machineParts[6]) node.machineParts[6].rotation.y += deltaSeconds * 2.5;
    node.machineTimer += deltaSeconds;
    if (node.machineTimer >= MACHINE_CYCLE_SECONDS) {
      node.machineTimer -= MACHINE_CYCLE_SECONDS;
      node.amount -= 1;
      if (conveyorBuilt && node === oreNodes[0]) oreBuffer += 1;
      else iron += 1;
      if (ironCounter) ironCounter.textContent = String(iron);
      if (oreBufferCounter) oreBufferCounter.textContent = String(oreBuffer);
      node.mesh.scaling.scaleInPlace(0.91);
      if (node.amount <= 0) {
        node.mesh.setEnabled(false);
        node.marker.setEnabled(false);
        node.machineParts.forEach(part => part.setEnabled(false));
        node.machineBuilt = false;
      }
      if (statusText) statusText.textContent = "Koparka wydobyła 1 rudę żelaza";
      saveGame();
    }
  }
});

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => {
  engine.resize();
  const isPhone = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800;
  engine.setHardwareScalingLevel(isPhone ? (window.devicePixelRatio > 2 ? 1.5 : 1.25) : 1);
});
