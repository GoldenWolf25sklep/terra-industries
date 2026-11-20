import {
  ArcRotateCamera, Color3, Color4, DirectionalLight, Engine, HemisphericLight,
  MeshBuilder, Scene, StandardMaterial, Vector3
} from "@babylonjs/core";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("Nie znaleziono elementu canvas.");
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
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
type OreNode = { mesh: ReturnType<typeof MeshBuilder.CreatePolyhedron>; amount: number };
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
  oreNodes.push({ mesh: ore, amount: 5 });
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
let iron = 0;
let nearbyOre: OreNode | null = null;
const INTERACTION_RANGE = 3.4;

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
    if (statusText) statusText.textContent = "Złoże wyczerpane · poszukaj kolejnego";
  } else if (statusText) {
    statusText.textContent = "Wydobyto 1 rudę · pozostało w złożu: " + nearbyOre.amount;
  }
}

interactButton?.addEventListener("click", collectOre);
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
  if (statusText && nearbyOre) statusText.textContent = "Złoże żelaza w zasięgu · " + nearbyOre.amount + " jednostek";
});

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
