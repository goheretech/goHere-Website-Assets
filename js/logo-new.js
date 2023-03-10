import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.148.0/build/three.module.js";
import * as dat from "https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js";
import { OrbitControls } from "OrbitControls";
import { GLTFLoader } from "GLTFLoader";
import { RGBELoader } from "RGBELoader";

let envMap,
  logo,
  logoMesh,
  scene = new THREE.Scene(),
  renderer,
  floor,
  camera,
  controls,
  canvas,
  screenHeight;

const clock = new THREE.Clock();

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
    position: new THREE.Vector3(0, 0, 40),
    rotation: new THREE.Vector3(0, 0, 0),
  },
  ambient: { intensity: 1.0 },
};

let P = [
  {
    id: "s1",
    topPixel: "",
    bottomPixel: "",
    start: {
      camera: {
        position: new THREE.Vector3(0, 0, 40),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(0, -10, -10),
        rotation: new THREE.Vector3(0, 0, -90),
      },
    },
    mid: {
      camera: {
        position: new THREE.Vector3(0, 0, 40),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(0, 12, 5),
        rotation: new THREE.Vector3(0, 0, 0),
      },
    },
    end: {
      camera: {
        position: new THREE.Vector3(0, 0, 40),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(0, 35, 20),
        rotation: new THREE.Vector3(0, 0, 90),
      },
    },
    startFullyVisible: true,
    endFullyGone: true,
  },
  {
    id: "s2",
    topPixel: "",
    bottomPixel: "",
    start: {
      camera: {
        position: new THREE.Vector3(0, 0, 30),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(0, 20, 0),
        rotation: new THREE.Vector3(0, 0, -90),
      },
    },
    mid: {
      camera: {
        position: new THREE.Vector3(0, 0, 30),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Vector3(0, 0, 0),
      },
    },
    end: {
      camera: {
        position: new THREE.Vector3(0, 0, 30),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(0, -20, 0),
        rotation: new THREE.Vector3(0, 0, 90),
      },
    },
    startFullyVisible: false,
    endFullyGone: true,
  },
  {
    id: "s3",
    topPixel: "",
    bottomPixel: "",
    start: {
      camera: {
        position: new THREE.Vector3(0, 0, 30),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(10, 20, -10),
        rotation: new THREE.Vector3(-45, 0, -90),
      },
    },
    mid: {
      camera: {
        position: new THREE.Vector3(0, 0, 30),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(5, 5, 10),
        rotation: new THREE.Vector3(-45, 0, 0),
      },
    },
    end: {
      camera: {
        position: new THREE.Vector3(0, 0, 30),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(0, -10, 30),
        rotation: new THREE.Vector3(-45, 0, 90),
      },
    },
    startFullyVisible: false,
    endFullyGone: true,
  },
  {
    id: "s4",
    topPixel: "",
    bottomPixel: "",
    start: {
      camera: {
        position: new THREE.Vector3(0, 0, 110),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(0, 80, -80),
        rotation: new THREE.Vector3(0, -260, -90),
      },
    },
    mid: {
      camera: {
        position: new THREE.Vector3(0, 0, 110),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(0, 0, -10),
        rotation: new THREE.Vector3(0, -20, 0),
      },
    },
    end: {
      camera: {
        position: new THREE.Vector3(0, 0, 110),
        rotation: new THREE.Vector3(0, 0, 0),
      },
      logo: {
        position: new THREE.Vector3(0, 0, 120),
        rotation: new THREE.Vector3(0, 0, 120),
      },
    },
    startFullyVisible: false,
    endFullyGone: true,
  },
];

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
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
  });
  SetScreenRatio();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xeb4034, 0);
  scene.environment = envMap;
  //before j
}

function SetupCamera(master) {
  camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    3000
  );
  camera.position.copy(P[0].start.camera.position);
  camera.position.z = camera.position.z * screenRatio;
  camera.rotation.copy(Euler(P[0].start.camera.rotation));

  scene.add(camera);
  // controls = new OrbitControls(camera, renderer.domElement);
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
    logoMesh = gltf.scene.children[0];

    for (let p = 0; p < logoMesh.children.length; p++) {
      let pod = logoMesh.children[p];
      pod.material = logoMaterials[p];
      pod.material.envMapIntensity = 1.5;
    }
    logo = new THREE.Mesh();
    logo.add(logoMesh);
    scene.add(logo);
    logo.position.copy(P[0].start.logo.position);
    logo.position.y = logo.position.z * screenRatio;
    logo.rotation.copy(Euler(P[0].start.logo.rotation));
    FinalRender();
  });
}

function SetScreenRatio() {
  screenRatio = window.innerHeight / window.innerWidth;
  //Screen Ratio > 1 = Mobile
  screenRatio = screenRatio < 1 ? 1 : 2.5;
  // screenRatio = mapRange(screenRatio, 1.7, 0.4, 1.3, 1);
}

function FinalRender() {
  renderer.render(scene, camera);
  getPixels();
  onScroll();

  requestAnimationFrame(Render);
}

function Render() {
  renderer.render(scene, camera);
  const deltaTime = clock.getDelta();
  logoMesh.rotation.y += 0.1 * deltaTime;

  // controls.update();
  requestAnimationFrame(Render);
}

function onWindowResize() {
  SetScreenRatio();

  camera.aspect = window.innerWidth / window.outerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.outerHeight);
  camera.position.z = start.camera.position.z * screenRatio;
}
function onScroll() {
  // //Get percent scrolled
  // var h = document.documentElement,
  //   b = document.body,
  //   st = "scrollTop",
  //   sh = "scrollHeight";
  // var y = ((h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight)) * 100;
  // //0 to 100

  const scrollPos = window.pageYOffset;
  let scrollPerc = GetPercentage(scrollPos);

  if (scrollPerc == undefined) {
    // logo.position.copy(new THREE.Vector3(-100, -100, 0));
    return;
  }

  let _new = CurrentTransform(scrollPerc);
  // logo.rotation.copy(Euler(_new._logo.rot));

  logo.position.copy(_new._logo.pos);
  logo.rotation.copy(Euler(_new._logo.rot));

  camera.position.copy(_new._camera.pos);
  camera.rotation.copy(Euler(_new._camera.rot));
}

function CurrentTransform(p) {
  if (p == undefined) {
    return;
  }
  let _p = p.percent / 100;
  let master = P[p.index];

  let _camera = {
    pos: new THREE.Vector3(
      lerp(
        _p,
        master.start.camera.position.x,
        master.mid.camera.position.x,
        master.end.camera.position.x,
        linear
      ),
      lerp(
        _p,
        master.start.camera.position.y,
        master.mid.camera.position.y,
        master.end.camera.position.y,
        linear
      ),
      lerp(
        _p,
        master.start.camera.position.z,
        master.mid.camera.position.z,
        master.end.camera.position.z,
        linear
      ) * screenRatio
    ),
    rot: new THREE.Vector3(
      lerp(
        _p,
        master.start.camera.rotation.x,
        master.mid.camera.rotation.x,
        master.end.camera.rotation.x,
        linear
      ),
      lerp(
        _p,
        master.start.camera.rotation.y,
        master.mid.camera.rotation.y,
        master.end.camera.rotation.y,
        linear
      ),
      lerp(
        _p,
        master.start.camera.rotation.z,
        master.mid.camera.rotation.z,
        master.end.camera.rotation.z,
        linear
      )
    ),
  };

  let _logo = {
    pos: new THREE.Vector3(
      lerp(
        _p,
        master.start.logo.position.x,
        master.mid.logo.position.x,
        master.end.logo.position.x,
        linear
      ),
      lerp(
        _p,
        master.start.logo.position.y,
        master.mid.logo.position.y,
        master.end.logo.position.y,
        linear
      ) * screenRatio,
      lerp(
        _p,
        master.start.logo.position.z,
        master.mid.logo.position.z,
        master.end.logo.position.z,
        linear
      )
    ),
    rot: new THREE.Vector3(
      lerp(
        _p,
        master.start.logo.rotation.x,
        master.mid.logo.rotation.x,
        master.end.logo.rotation.x,
        linear
      ),
      lerp(
        _p,
        master.start.logo.rotation.y,
        master.mid.logo.rotation.y,
        master.end.logo.rotation.y,
        linear
      ),
      lerp(
        _p,
        master.start.logo.rotation.z,
        master.mid.logo.rotation.z,
        master.end.logo.rotation.z * screenRatio,
        linear
      )
    ),
  };

  return { _camera, _logo };
}

function lerp(t, a, b, c, easingFunc) {
  t = easingFunc(t);
  let v;
  if (t <= 0) {
    return a;
  }
  if (t >= 1) {
    return c;
  }
  if (t < 0.5) {
    const t1 = t * 2;
    v = a * (1 - t1) + b * t1;
  } else {
    const t2 = (t - 0.5) * 2;
    v = b * (1 - t2) + c * t2;
  }
  return v;
}

function easeIn(t) {
  return t * t;
}

function linear(t) {
  return t;
}

function easeOutSine(t) {
  return Math.sin((t * Math.PI) / 2);
}

function GetPercentage(scrollPos) {
  for (let i = 0; i < P.length; i++) {
    const section = P[i];
    if (scrollPos > section.bottomPixel) continue;
    let per = 0;
    if (scrollPos > section.topPixel && scrollPos < section.bottomPixel) {
      per = mapRange(scrollPos, section.topPixel, section.bottomPixel, 0, 100);
      return { percent: per, index: i };
    }
  }
}

function getPixels() {
  for (let i = 0; i < P.length; i++) {
    const section = P[i];
    const range = divRange(section.id);
    section.topPixel = range.top;
    section.bottomPixel = range.bottom;

    if (!section.startFullyVisible) {
      section.topPixel = range.top - screenHeight;
    }
    if (!section.endFullyGone) {
      section.bottomPixel = range.bottom - screenHeight;
    }
  }
}

function divRange(id) {
  var div = document.getElementById(id);
  // var rect = div.getBoundingClientRect();
  var top = div.offsetTop;
  var bottom = div.offsetTop + div.offsetHeight;
  screenHeight = screen.height;

  return { top: top, bottom: bottom, height: div.offsetHeight };
}

function mapRange(num, inputMin, inputMax, outputMin, outputMax) {
  return (
    ((num - inputMin) * (outputMax - outputMin)) / (inputMax - inputMin) +
    outputMin
  );
}

function Euler(rotationVector) {
  // Convert the rotation angles from degrees to radians
  const x = THREE.MathUtils.degToRad(rotationVector.x);
  const y = THREE.MathUtils.degToRad(rotationVector.y);
  const z = THREE.MathUtils.degToRad(rotationVector.z);

  // Create an Euler instance with the converted angles
  const euler = new THREE.Euler(x, y, z);

  // Set the rotation of the Mesh object to the Euler instance
  return euler;
}
