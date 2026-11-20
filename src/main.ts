import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("Nie znaleziono elementu canvas.");

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.085, 0.10, 1);

const hemi = new HemisphericLight("ambient-light", new Vector3(0, 1, 0), scene);
hemi.intensity = 0.82;
const sun = new DirectionalLight("sun", new Vector3(-0.45, -1, 0.35), scene);
sun.position = new Vector3(20, 35, -20);
sun.intensity = 1.15;

const groundMat = new StandardMaterial("ground-material", scene);
groundMat.diffuseColor = new Color3(0.20, 0.27, 0.23);
groundMat.specularColor = Color3.Black();
const ground = MeshBuilder.CreateGround("terrain", { width: 90, height: 90, subdivisions: 2 }, scene);
ground.material = groundMat;

const gridMat = new StandardMaterial("grid-material", scene);
gridMat.diffuseColor = new Color3(0.27, 0.36, 0.31);
gridMat.alpha = 0.22;
for (let i = -40; i <= 40; i += 5) {
  const lineX = MeshBuilder.CreateBox("grid-x", { width: 0.025, height: 0.012, depth: 80 }, scene);
  lineX.position.set(i, 0.012, 0);
  lineX.material = gridMat;
  const lineZ = MeshBuilder.CreateBox("grid-z", { width: 80, height: 0.012, depth: 0.025 }, scene);
  lineZ.position.set(0, 0.012, i);
  lineZ.material = gridMat;
}

const rockMat = new StandardMaterial("iron-ore-material", scene);
rockMat.diffuseColor = new Color3(0.40, 0.29, 0.23);
rockMat.specularColor = new Color3(0.08, 0.08, 0.08);
const orePositions = [
  new Vector3(8, 0, 5), new Vector3(10, 0, 6), new Vector3(7, 0, 8),
  new Vector3(12, 0, 3), new Vector3(9, 0, 10), new Vector3(5, 0, 7)
];
for (const [index, position] of orePositions.entries()) {
  const ore = MeshBuilder.CreatePolyhedron("iron-ore-" + index, { type: 1, size: 1.15 }, scene);
  ore.position.copyFrom(position);
  ore.position.y = 0.75;
  ore.scaling.set(1.15, 0.85, 1.0);
  ore.rotation.set(index * 0.17, index * 0.61, index * 0.11);
  ore.material = rockMat;
}

const playerMat = new StandardMaterial("player-material", scene);
playerMat.diffuseColor = new Color3(0.28, 0.72, 0.48);
const player = MeshBuilder.CreateCapsule("player", { height: 2, radius: 0.48 }, scene);
player.position.set(0, 1, 0);
player.material = playerMat;

const camera = new ArcRotateCamera("follow-camera", -Math.PI / 2, 1.08, 18, player.position, scene);
camera.lowerRadiusLimit = 8;
camera.upperRadiusLimit = 26;
camera.lowerBetaLimit = 0.35;
camera.upperBetaLimit = 1.42;
camera.panningSensibility = 0;
camera.wheelPrecision = 45;
camera.attachControl(canvas, true);
camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

const pressed = new Set<string>();
const keyMap: Record<string, string> = {
  KeyW: "forward", ArrowUp: "forward",
  KeyS: "back", ArrowDown: "back",
  KeyA: "left", ArrowLeft: "left",
  KeyD: "right", ArrowRight: "right"
};
window.addEventListener("keydown", (event) => {
  const action = keyMap[event.code];
  if (action) { pressed.add(action); event.preventDefault(); }
});
window.addEventListener("keyup", (event) => {
  const action = keyMap[event.code];
  if (action) pressed.delete(action);
});
window.addEventListener("blur", () => pressed.clear());

document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((button) => {
  const action = button.dataset.move;
  if (!action) return;
  const release = () => pressed.delete(action);
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pressed.add(action);
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

const ironCounter = document.querySelector<HTMLElement>("#iron-count");
let iron = 0;
scene.onBeforeRenderObservable.add(() => {
  const forward = Number(pressed.has("forward")) - Number(pressed.has("back"));
  const sideways = Number(pressed.has("right")) - Number(pressed.has("left"));
  if (forward !== 0 || sideways !== 0) {
    const direction = new Vector3(
      -Math.sin(camera.alpha) * forward + Math.cos(camera.alpha) * sideways,
      0,
      -Math.cos(camera.alpha) * forward - Math.sin(camera.alpha) * sideways
    ).normalize();
    player.position.addInPlace(direction.scale(0.12));
    player.rotation.y = Math.atan2(direction.x, direction.z);
  }
  camera.target.copyFrom(player.position);
  camera.target.y += 0.45;
});

const collectOre = () => {
  if (Vector3.Distance(player.position, new Vector3(8, 0, 7)) < 5) {
    iron += 1;
    if (ironCounter) ironCounter.textContent = String(iron);
  }
};
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyE") collectOre();
});
document.querySelector<HTMLButtonElement>("#interact-button")?.addEventListener("click", collectOre);

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());