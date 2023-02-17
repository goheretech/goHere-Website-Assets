import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.148.0/build/three.module.js";
import * as dat from "https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js";
import { Reflector } from "Reflector";
import { OrbitControls } from "OrbitControls";
import { GLTFLoader } from "GLTFLoader";
import { RGBELoader } from "RGBELoader";

const {
  DepthFormat,
  DepthTexture,
  LinearFilter,
  Matrix4,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  UnsignedShortType,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} = THREE;

class MeshReflectorMaterial extends MeshStandardMaterial {
  constructor(
    renderer,
    camera,
    scene,
    object,
    {
      mixBlur = 0,
      mixStrength = 1,
      resolution = 256,
      blur = [0, 0],
      minDepthThreshold = 0.9,
      maxDepthThreshold = 1,
      depthScale = 0,
      depthToBlurRatioBias = 0.25,
      mirror = 0,
      distortion = 1,
      mixContrast = 1,
      distortionMap,
      reflectorOffset = 0,
      bufferSamples = 8,
      planeNormal = new Vector3(0, 0, 1),
    } = {}
  ) {
    super();

    this.gl = renderer;
    this.camera = camera;
    this.scene = scene;
    this.parent = object;

    this.hasBlur = blur[0] + blur[1] > 0;
    this.reflectorPlane = new Plane();
    this.normal = new Vector3();
    this.reflectorWorldPosition = new Vector3();
    this.cameraWorldPosition = new Vector3();
    this.rotationMatrix = new Matrix4();
    this.lookAtPosition = new Vector3(0, -1, 0);
    this.clipPlane = new Vector4();
    this.view = new Vector3();
    this.target = new Vector3();
    this.q = new Vector4();
    this.textureMatrix = new Matrix4();
    this.virtualCamera = new PerspectiveCamera();
    this.reflectorOffset = reflectorOffset;
    this.planeNormal = planeNormal;

    this.setupBuffers(resolution, blur, bufferSamples);

    this.reflectorProps = {
      mirror,
      textureMatrix: this.textureMatrix,
      mixBlur,
      tDiffuse: this.fbo1.texture,
      tDepth: this.fbo1.depthTexture,
      tDiffuseBlur: this.fbo2.texture,
      hasBlur: this.hasBlur,
      mixStrength,
      minDepthThreshold,
      maxDepthThreshold,
      depthScale,
      depthToBlurRatioBias,
      distortion,
      distortionMap,
      mixContrast,
      "defines-USE_BLUR": this.hasBlur ? "" : undefined,
      "defines-USE_DEPTH": depthScale > 0 ? "" : undefined,
      "defines-USE_DISTORTION": distortionMap ? "" : undefined,
    };
  }

  setupBuffers(resolution, blur, bufferSamples) {
    const parameters = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      encoding: this.gl.outputEncoding,
    };

    const fbo1 = new WebGLRenderTarget(resolution, resolution, parameters);
    fbo1.depthBuffer = true;
    fbo1.depthTexture = new DepthTexture(resolution, resolution);
    fbo1.depthTexture.format = DepthFormat;
    fbo1.depthTexture.type = UnsignedShortType;

    const fbo2 = new WebGLRenderTarget(resolution, resolution, parameters);

    if (this.gl.capabilities.isWebGL2) {
      fbo1.samples = bufferSamples;
    }

    this.fbo1 = fbo1;
    this.fbo2 = fbo2;

    // this.kawaseBlurPass = new POSTPROCESSING.KawaseBlurPass();
    // this.kawaseBlurPass.setSize(blur[0], blur[1]);
  }

  beforeRender() {
    if (!this.parent) return;

    this.reflectorWorldPosition.setFromMatrixPosition(this.parent.matrixWorld);
    this.cameraWorldPosition.setFromMatrixPosition(this.camera.matrixWorld);
    this.rotationMatrix.extractRotation(this.parent.matrixWorld);

    // was changed from this.normal.set(0, 0, 1)
    this.normal.copy(this.planeNormal);
    this.normal.applyMatrix4(this.rotationMatrix);
    this.reflectorWorldPosition.addScaledVector(
      this.normal,
      this.reflectorOffset
    );
    this.view.subVectors(this.reflectorWorldPosition, this.cameraWorldPosition);
    // Avoid rendering when reflector is facing away
    if (this.view.dot(this.normal) > 0) return;
    this.view.reflect(this.normal).negate();
    this.view.add(this.reflectorWorldPosition);
    this.rotationMatrix.extractRotation(this.camera.matrixWorld);
    this.lookAtPosition.set(0, 0, -1);
    this.lookAtPosition.applyMatrix4(this.rotationMatrix);
    this.lookAtPosition.add(this.cameraWorldPosition);
    this.target.subVectors(this.reflectorWorldPosition, this.lookAtPosition);
    this.target.reflect(this.normal).negate();
    this.target.add(this.reflectorWorldPosition);
    this.virtualCamera.position.copy(this.view);
    this.virtualCamera.up.set(0, 1, 0);
    this.virtualCamera.up.applyMatrix4(this.rotationMatrix);
    this.virtualCamera.up.reflect(this.normal);
    this.virtualCamera.lookAt(this.target);
    this.virtualCamera.far = this.camera.far; // Used in WebGLBackground
    this.virtualCamera.updateMatrixWorld();
    this.virtualCamera.projectionMatrix.copy(this.camera.projectionMatrix);

    // Update the texture matrix
    this.textureMatrix.set(
      0.5,
      0.0,
      0.0,
      0.5,
      0.0,
      0.5,
      0.0,
      0.5,
      0.0,
      0.0,
      0.5,
      0.5,
      0.0,
      0.0,
      0.0,
      1.0
    );
    this.textureMatrix.multiply(this.virtualCamera.projectionMatrix);
    this.textureMatrix.multiply(this.virtualCamera.matrixWorldInverse);
    this.textureMatrix.multiply(this.parent.matrixWorld);

    // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
    // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    this.reflectorPlane.setFromNormalAndCoplanarPoint(
      this.normal,
      this.reflectorWorldPosition
    );
    this.reflectorPlane.applyMatrix4(this.virtualCamera.matrixWorldInverse);
    this.clipPlane.set(
      this.reflectorPlane.normal.x,
      this.reflectorPlane.normal.y,
      this.reflectorPlane.normal.z,
      this.reflectorPlane.constant
    );
    const projectionMatrix = this.virtualCamera.projectionMatrix;
    this.q.x =
      (Math.sign(this.clipPlane.x) + projectionMatrix.elements[8]) /
      projectionMatrix.elements[0];
    this.q.y =
      (Math.sign(this.clipPlane.y) + projectionMatrix.elements[9]) /
      projectionMatrix.elements[5];
    this.q.z = -1.0;
    this.q.w =
      (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];
    // Calculate the scaled plane vector
    this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(this.q));

    // Replacing the third row of the projection matrix
    projectionMatrix.elements[2] = this.clipPlane.x;
    projectionMatrix.elements[6] = this.clipPlane.y;
    projectionMatrix.elements[10] = this.clipPlane.z + 1.0;
    projectionMatrix.elements[14] = this.clipPlane.w;
  }

  update() {
    if (!this.parent) return;
    if (this.parent.material !== this) return;

    this.parent.visible = false;
    const currentXrEnabled = this.gl.xr.enabled;
    const currentShadowAutoUpdate = this.gl.shadowMap.autoUpdate;

    this.beforeRender();
    this.gl.xr.enabled = false;
    this.gl.shadowMap.autoUpdate = false;
    this.gl.setRenderTarget(this.fbo1);
    this.gl.state.buffers.depth.setMask(true);
    if (!this.gl.autoClear) this.gl.clear();

    this.gl.render(this.scene, this.virtualCamera);

    if (this.hasBlur) {
      this.kawaseBlurPass.render(this.gl, this.fbo1, this.fbo2);
    }

    this.gl.xr.enabled = currentXrEnabled;
    this.gl.shadowMap.autoUpdate = currentShadowAutoUpdate;
    this.parent.visible = true;
    this.gl.setRenderTarget(null);
  }

  onBeforeCompile(shader, ...args) {
    super.onBeforeCompile(shader, ...args);

    if (this.defines === undefined) this.defines = {};

    if (!this.defines.USE_UV) {
      this.defines.USE_UV = "";
    }

    if (this.reflectorProps["defines-USE_BLUR"] !== undefined)
      this.defines.USE_BLUR = "";
    if (this.reflectorProps["defines-USE_DEPTH"] !== undefined)
      this.defines.USE_DEPTH = "";
    if (this.reflectorProps["defines-USE_DISTORTION"] !== undefined)
      this.defines.USE_DISTORTION = "";

    let props = this.reflectorProps;

    for (let prop in props) {
      shader.uniforms[prop] = {
        get value() {
          return props[prop];
        },
      };
    }

    shader.vertexShader = `
              uniform mat4 textureMatrix;
              varying vec4 my_vUv;     
            ${shader.vertexShader}`;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      /* glsl */ `
            #include <project_vertex>
            my_vUv = textureMatrix * vec4( position, 1.0 );
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            `
    );

    shader.fragmentShader = /* glsl */ `
              uniform sampler2D tDiffuse;
              uniform sampler2D tDiffuseBlur;
              uniform sampler2D tDepth;
              uniform sampler2D distortionMap;
              uniform float distortion;
              uniform float cameraNear;
              uniform float cameraFar;
              uniform bool hasBlur;
              uniform float mixBlur;
              uniform float mirror;
              uniform float mixStrength;
              uniform float minDepthThreshold;
              uniform float maxDepthThreshold;
              uniform float mixContrast;
              uniform float depthScale;
              uniform float depthToBlurRatioBias;
              varying vec4 my_vUv;        
              ${shader.fragmentShader}`;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      /* glsl */ `
            #include <emissivemap_fragment>
          
            float distortionFactor = 0.0;
            #ifdef USE_DISTORTION
              distortionFactor = texture2D(distortionMap, vUv).r * distortion;
            #endif
      
            vec4 new_vUv = my_vUv;
            new_vUv.x += distortionFactor;
            new_vUv.y += distortionFactor;
      
            vec4 base = texture2DProj(tDiffuse, new_vUv);
            vec4 blur = texture2DProj(tDiffuseBlur, new_vUv);
            
            vec4 merge = base;
            
            #ifdef USE_NORMALMAP
              vec2 normal_uv = vec2(0.0);
              vec4 normalColor = texture2D(normalMap, vUv);
              vec3 my_normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );
              vec3 coord = new_vUv.xyz / new_vUv.w;
              normal_uv = coord.xy + coord.z * my_normal.xz * 0.05 * normalScale;
              vec4 base_normal = texture2D(tDiffuse, normal_uv);
              vec4 blur_normal = texture2D(tDiffuseBlur, normal_uv);
              merge = base_normal;
              blur = blur_normal;
            #endif
      
            float depthFactor = 0.0001;
            float blurFactor = 0.0;
      
            #ifdef USE_DEPTH
              vec4 depth = texture2DProj(tDepth, new_vUv);
              depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
              depthFactor *= depthScale;
              depthFactor = max(0.0001, min(1.0, depthFactor));
      
              #ifdef USE_BLUR
                blur = blur * min(1.0, depthFactor + depthToBlurRatioBias);
                merge = merge * min(1.0, depthFactor + 0.5);
              #else
                merge = merge * depthFactor;
              #endif
        
            #endif
      
            float reflectorRoughnessFactor = roughness;
            #ifdef USE_ROUGHNESSMAP
              vec4 reflectorTexelRoughness = texture2D( roughnessMap, vUv );
              
              reflectorRoughnessFactor *= reflectorTexelRoughness.g;
            #endif
            
            #ifdef USE_BLUR
              blurFactor = min(1.0, mixBlur * reflectorRoughnessFactor);
              merge = mix(merge, blur, blurFactor);
            #endif
      
            vec4 newMerge = vec4(0.0, 0.0, 0.0, 1.0);
            newMerge.r = (merge.r - 0.5) * mixContrast + 0.5;
            newMerge.g = (merge.g - 0.5) * mixContrast + 0.5;
            newMerge.b = (merge.b - 0.5) * mixContrast + 0.5;
            
            diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);
            `
    );
  }
}

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
