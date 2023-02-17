import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.148.0/build/three.module.js";
import * as dat from "https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js";
import { OrbitControls } from "OrbitControls";
import { GLTFLoader } from "GLTFLoader";
import { RGBELoader } from "RGBELoader";

let envMap,
  logo,
  scene = new THREE.Scene(),
  renderer,
  floor,
  camera,
  controls,
  canvas;

let screenRatio;

const Color = {
  Red: { Hex: 0xe7180c, Material: "" },
  Orange: { Hex: 0xff8008, Material: "" },
  Yellow: { Hex: 0xeec200, Material: "" },
  Green: { Hex: 0x027b00, Material: "" },
  Cyan: { Hex: 0x0ba4ff, Material: "" },
  Blue: { Hex: 0x002abc, Material: "" },
  Purple: { Hex: 0x7200bc, Material: "" },
};

const hdrEquirect = new RGBELoader()
  .setPath(
    "https://firebasestorage.googleapis.com/v0/b/gohere-24b3c.appspot.com/o/gohere%2Fnewv%2Fcubemap%2F"
  )
  .load("royal_esplanade_1k.hdr?alt=media", function () {
    hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    // envMap = hdrEquirect;
  });

let logoMaterials = [
  LogoMaterial(Color.Orange),
  LogoMaterial(Color.Yellow),
  LogoMaterial(Color.Green),
  LogoMaterial(Color.Cyan),
  LogoMaterial(Color.Blue),
  LogoMaterial(Color.Purple),
  LogoMaterial(Color.Red),
];

function LogoMaterial(clr) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: clr.Hex,
    transmission: 0,
    opacity: 1,
    metalness: 1,
    roughness: 0.1,
    specularIntensity: 1,
    specularColor: 0xffffff,
    envMapIntensity: 1,
    envMap: hdrEquirect,
  });
  clr.Material = mat;
  return mat;
}

let start = {
  camera: {
    position: new THREE.Vector3(0, 0, 30),
    rotation: new THREE.Vector3(0, 0, 0),
  },

  ambient: { intensity: 1.0 },
};

Start();

function Start() {
  SetupRenderer();
  SetupCamera();
  SetupScene();
  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", onWindowResize, false);
  // FinalRender();
}

function SetupRenderer() {
  canvas = document.getElementById("canvas");
  // console.log(canvas);
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
  });
  screenRatio = window.innerHeight / window.innerWidth;
  screenRatio = mapRange(screenRatio, 1.7, 0.4, 1.3, 1);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xeb4034, 0);
  scene.environment = envMap;
}

function SetupCamera(master) {
  camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    3000
  );
  camera.position.set(
    start.camera.position.x,
    start.camera.position.y,
    start.camera.position.z * screenRatio
  );
  camera.rotation.set(
    start.camera.rotation.x,
    start.camera.rotation.y,
    start.camera.rotation.z
  );
  scene.add(camera);
  controls = new OrbitControls(camera, renderer.domElement);
  console.log(controls);
}

function SetupScene() {
  SetupLogo();
  // SetupFloor();
}

function SetupLogo() {
  const loader = new GLTFLoader().setPath(
    "https://firebasestorage.googleapis.com/v0/b/gohere-24b3c.appspot.com/o/gohere%2Fnewv%2F"
  );
  loader.load("betterLogo.glb?alt=media", function (gltf) {
    logo = gltf.scene.children[0];

    for (let p = 0; p < logo.children.length; p++) {
      let pod = logo.children[p];
      pod.material = logoMaterials[p];
      pod.material.envMapIntensity = 1.5;
    }
    scene.add(logo);
    logo.position.y = -10;
    FinalRender();
  });
}

function SetupFloor() {
  // Create cube render target
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });

  // Create cube camera
  const cubeCamera = new THREE.CubeCamera(1, 100000, cubeRenderTarget);
  cubeCamera.position.y = -15;
  scene.add(cubeCamera);

  const geo = new THREE.PlaneGeometry(100, 100);
  // const mat = new MeshReflectorMaterial(renderer, camera, scene, logo);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    transmission: 0,
    opacity: 1,
    metalness: 1,
    roughness: 0.0,
    specularIntensity: 1,
    specularColor: 0xffffff,
    envMapIntensity: 1,
    envMap: cubeRenderTarget.texture,
  });
  floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -15;
  console.log(floor.material);
  scene.add(floor);

  cubeCamera.update(renderer, scene);
}

function FinalRender() {
  renderer.render(scene, camera);
  //   getPixels();
  requestAnimationFrame(Render);
}

function Render() {
  renderer.render(scene, camera);
  logo.rotation.y += 0.001;
  controls.update();
  requestAnimationFrame(Render);
}

function onWindowResize() {
  screenRatio = window.innerHeight / window.innerWidth;
  screenRatio = mapRange(screenRatio, 1.7, 0.4, 1.3, 1);
  // console.log(screenRatio);
  camera.aspect = window.innerWidth / window.outerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.outerHeight);
  camera.position.z = start.camera.position.z * screenRatio;
  //   getPixels();
}
function onScroll() {
  //Get percent scrolled
  var h = document.documentElement,
    b = document.body,
    st = "scrollTop",
    sh = "scrollHeight";
  var y = ((h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight)) * 100;
  //0 to 100

  const scrollPos = window.pageYOffset;
}

function CurrentTransform(p) {
  if (p == undefined) {
    return;
  }
  let _p = p.percent / 100;
  let master = sections[p.index];
  let pos = new THREE.Vector3(
    lerp(
      _p,
      master.transforms.start.position.x,
      master.transforms.end.position.x
    ),
    lerp(
      _p,
      master.transforms.start.position.y,
      master.transforms.end.position.y
    ),
    lerp(
      _p,
      master.transforms.start.position.z,
      master.transforms.end.position.z
    )
  );
  let rot = new THREE.Vector3(
    lerp(
      _p,
      master.transforms.start.rotation.x,
      master.transforms.end.rotation.x
    ),
    lerp(
      _p,
      master.transforms.start.rotation.y,
      master.transforms.end.rotation.y
    ),
    lerp(
      _p,
      master.transforms.start.rotation.z,
      master.transforms.end.rotation.z
    )
  );

  return { p: pos, r: rot };
}

function lerp(t, start, end) {
  let l = (1 - t) * start + t * end;
  return l;
}

function GetPercentage(scrollPos) {
  for (let i = 0; i < sections.length; i++) {
    const master = sections[i];
    let per = 0;
    if (scrollPos > master.topPixel && scrollPos < master.bottomPixel + 1500) {
      per = mapRange(scrollPos, master.topPixel, master.bottomPixel, 0, 100);
      return { percent: per, index: i };
    }
  }
}

function getPixels() {
  for (let i = 0; i < sections.length; i++) {
    const master = sections[i];
    const range = divRange(master.parent);
    master.topPixel = range.top;
    master.bottomPixel = range.bottom;
  }
}

function divRange(id) {
  var div = document.getElementById(id);
  var rect = div.getBoundingClientRect();
  var top = div.offsetTop - div.offsetHeight;
  var bottom = div.offsetTop + div.offsetHeight;

  return { top: top, bottom: bottom };
}

function mapRange(num, inputMin, inputMax, outputMin, outputMax) {
  return (
    ((num - inputMin) * (outputMax - outputMin)) / (inputMax - inputMin) +
    outputMin
  );
}
