import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.148.0/build/three.module.js";
import * as dat from "https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js";
import { OrbitControls } from "OrbitControls";
import { GLTFLoader } from "GLTFLoader";
import { RGBELoader } from "RGBELoader";

let envMap,
  blocks,
  scene = new THREE.Scene(),
  renderer,
  camera,
  controls,
  canvas;

let screenRatio;

const hdrEquirect = new RGBELoader()
  .setPath(
    "https://firebasestorage.googleapis.com/v0/b/gohere-24b3c.appspot.com/o/gohere%2Fnewv%2Fcubemap%2F"
  )
  .load("royal_esplanade_1k.hdr?alt=media", function () {
    hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    // envMap = hdrEquirect;
  });

let start = {
  camera: {
    position: new THREE.Vector3(0, 0, 5),
    rotation: new THREE.Vector3(0, 0, 0),
  },

  ambient: { intensity: 1.0 },
};

Start();

function Start() {
  SetupRenderer();
  SetupCamera();
  SetupCity();
  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", onWindowResize, false);
  // FinalRender();
}

function SetupRenderer() {
  canvas = document.getElementById("city");
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
  const controls = new OrbitControls(camera, renderer.domElement);
}

function SetupCity() {
  const loader = new GLTFLoader().setPath("./models/");
  loader.load("city-geo.glb", function (gltf) {
    blocks = gltf.scene.children;
    blocks.forEach((block) => {
      scene.add(block);
      block.material = new THREE.MeshNormalMaterial();
    });
    FinalRender();
  });
}

function FinalRender() {
  renderer.render(scene, camera);
  getPixels();
  requestAnimationFrame(Render);
}

function Render() {
  renderer.render(scene, camera);
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
  getPixels();
}
function onScroll() {
  //Get percent scrolled
  var h = document.documentElement,
    b = document.body,
    st = "scrollTop",
    sh = "scrollHeight";
  var y = ((h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight)) * 100;
  //0 to 100
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
  //   for (let i = 0; i < sections.length; i++) {
  //     const master = sections[i];
  //     const range = divRange(master.parent);
  //     master.topPixel = range.top;
  //     master.bottomPixel = range.bottom;
  //   }
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
