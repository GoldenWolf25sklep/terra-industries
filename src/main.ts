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
gridMat.alpha = 0.13;
for (let i = -40; i <= 40; i += 5) {
  const x = MeshBuilder.CreateBox("grid-x-" + i, { width: 0.025, height: 0.012, depth: 80 }, scene);
  x.position.set(i, 0.012, 0); x.material = gridMat;
  const z = MeshBuilder.CreateBox("grid-z-" + i, { width: 80, height: 0.012, depth: 0.025 }, scene);
  z.position.set(0, 0.012, i); z.material = gridMat;
}

// Małe elementy terenu nadające skali i pomagające orientować się w przestrzeni.
const stoneMat = new StandardMaterial("stone-material", scene);
stoneMat.diffuseColor = new Color3(0.25, 0.31, 0.29);
for (let i = 0; i < 24; i++) {
  const angle = i * 2.399;
  const radius = 13 + (i % 5) * 2.2;
  const stone = MeshBuilder.CreatePolyhedron("field-stone-" + i, { type: 1, size: 0.45 + (i % 3) * 0.16 }, scene);
  stone.position.set(Math.cos(angle) * radius, 0.28, Math.sin(angle) * radius);
  stone.scaling.y = 0.65;
  stone.rotation.y = angle;
  stone.material = stoneMat;
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
const MACHINE_COST = 8;
const MACHINE_CYCLE_SECONDS = 4;
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

const playerMat = new StandardMaterial("player-material", scene);
playerMat.diffuseColor = new Color3(0.28, 0.78, 0.52);
playerMat.emissiveColor = new Color3(0.025, 0.12, 0.055);
const player = MeshBuilder.CreateCapsule("player", { height: 2.25, radius: 0.56 }, scene);
player.position.set(0, 1.12, 0);
player.material = playerMat;

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
let iron = 0;
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
};

function createMiningMachine(node: OreNode): void {
  if (node.machineBuilt) return;
  const x = node.mesh.position.x;
  const z = node.mesh.position.z;
  const base = MeshBuilder.CreateBox("miner-base", { width: 1.8, height: 0.28, depth: 1.8 }, scene);
  base.position.set(x, 0.2, z);
  base.material = machineBodyMat;
  const housing = MeshBuilder.CreateBox("miner-housing", { width: 0.95, height: 1.35, depth: 0.95 }, scene);
  housing.position.set(x, 1.0, z);
  housing.material = machineBodyMat;
  const drill = MeshBuilder.CreateCylinder("miner-drill", { height: 1.15, diameterTop: 0.12, diameterBottom: 0.34, tessellation: 8 }, scene);
  drill.position.set(x, 2.12, z);
  drill.material = machineAccentMat;
  const control = MeshBuilder.CreateBox("miner-control", { width: 0.22, height: 0.32, depth: 0.08 }, scene);
  control.position.set(x, 1.05, z - 0.51);
  control.material = machineAccentMat;
  node.machineParts = [base, housing, drill, control];
  node.machineBuilt = true;
  node.machineTimer = 0;
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
    machines: oreNodes.map(node => node.machineBuilt)
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
scene.onBeforeRenderObservable.add(() => {
  const forward = Number(pressed.has("forward")) - Number(pressed.has("back"));
  const sideways = Number(pressed.has("right")) - Number(pressed.has("left"));
  if (forward !== 0 || sideways !== 0) {
    const direction = new Vector3(
      -Math.sin(camera.alpha) * forward + Math.cos(camera.alpha) * sideways,
      0,
      -Math.cos(camera.alpha) * forward - Math.sin(camera.alpha) * sideways
    ).normalize();
    player.position.addInPlace(direction.scale(0.13));
    player.position.x = Math.max(-42, Math.min(42, player.position.x));
    player.position.z = Math.max(-42, Math.min(42, player.position.z));
    player.rotation.y = Math.atan2(direction.x, direction.z);
  }
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
  if (nearbyOre && statusText && !nearbyOre.machineBuilt) {
    statusText.textContent = "Złoże żelaza w zasięgu · " + nearbyOre.amount + " jednostek";
  }
  const deltaSeconds = engine.getDeltaTime() / 1000;
  for (const node of oreNodes) {
    if (!node.machineBuilt || node.amount <= 0) continue;
    node.machineTimer += deltaSeconds;
    if (node.machineTimer >= MACHINE_CYCLE_SECONDS) {
      node.machineTimer -= MACHINE_CYCLE_SECONDS;
      node.amount -= 1;
      iron += 1;
      if (ironCounter) ironCounter.textContent = String(iron);
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
