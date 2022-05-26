import * as THREE from "https://cdn.skypack.dev/pin/three@v0.132.2-dLPTyDAYt6rc6aB18fLm/mode=imports/optimized/three.js";

import { OrbitControls } from "https://cdn.skypack.dev/pin/three@v0.132.2-dLPTyDAYt6rc6aB18fLm/mode=imports/unoptimized/examples/jsm/controls/OrbitControls.js";

import { Sky } from "https://cdn.skypack.dev/pin/three@v0.132.2-dLPTyDAYt6rc6aB18fLm/mode=imports/unoptimized/examples/jsm/objects/Sky.js";

import { Water } from  "https://cdn.skypack.dev/pin/three@v0.132.2-dLPTyDAYt6rc6aB18fLm/mode=imports/unoptimized/examples/jsm/objects/Water.js";

import waterVertexShader from './Shaders/vertex.js';
import waterFragmentShader from './Shaders/fragment.js';
import skyVertexShader from './Shaders/skyVertexShader.js';
import skyFragmentShader from './Shaders/skyFragmentShader.js';

window.addEventListener('resize', init);

let canvas = document.querySelector("#canvas");

let scene, camera, renderer, water, sun, sphere, headBase, headTop, pmremGenerator, controls;

let clock, delta;

/* WATER */
const waveSettings = {
  waveA: {
    direction: 1, 
    steepness: 0.15, 
    wavelength: 60   
  },
  waveB: { 
    direction: 15, 
    steepness: 0.15, 
    wavelength: 40 
  },
  waveC: { 
    direction: 30,
    steepness: 0.15,
    wavelength: 30 
  }  
};

const waterGeometry = new THREE.PlaneGeometry(30000, 30000, 1024, 1024);

/* SKY */

let skyUniforms = {
  turbidity: {
    type: '2f',
    value: 5.0  //10
  },
  rayleigh: {
    type: '2f',
    value: 1.345 // 1.35
  },
  mieCoefficient: {
    type: '2f',
    value: 0.035 // 0.005
  },
  mieDirectionalG: {
    type: '2f',
    value: 0.95 //0.8
  },
  sunPosition: {
    type: 'v3',
    value: new THREE.Vector3(0.5, 0.5, 0.5)
  },
  iResolution: {
    type: "2f",
    value: {
      x: window.innerWidth,
      y: window.innerHeight
    }
  },
  iGlobalTime: {
    type: "1f",
    value: 0.01
  },
  iPos: {
    type: "2f",
    value: {
      x: 200,
      y: 300
    }
  }
};

const sky = getSky();

 /* SUN*/

const sunSettings = {

  elevation: 20,
  azimuth: 180,
  exposure: 1

};  

function init(){ 
  
  scene = new THREE.Scene();

  renderer = getRenderer();
  
  pmremGenerator = new THREE.PMREMGenerator(renderer);

  camera = getCamera();

  water = getWater();

  scene.add(water);

  sun = getSun(); 

  scene.add(sky);
  
  updateSun();

  sphere = getWilson();

  scene.add(sphere);

  headBase = getBase(); 

  scene.add(headBase);

  headTop = getTop();

  scene.add(headTop); 

  controls = new OrbitControls(camera, renderer.domElement);

  setControls();
  
  addGui();

  clock = new THREE.Clock();

}

/*** FUNCTIONS  ***/

function getRenderer(){          
     
    const newRenderer = new THREE.WebGLRenderer({
  
      canvas: canvas,
      antialias: true
     
    });      
  
    newRenderer.setPixelRatio(devicePixelRatio); 
  
    newRenderer.setSize(window.innerWidth, window.innerHeight);
       
    newRenderer.toneMapping = THREE.ACESFilmicToneMapping;  
     
    return newRenderer;
  
  }
    
  function getCamera(){
    
    const newCamera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    
    newCamera.position.set( 30, 30, 100 );
    
    return newCamera;
    
  }

  function getSun(){
  
    const newSun = new THREE.Vector3();
  
    return newSun;
  
  }

  /*** WATER ***/
  
  function getWater(){

   const newWater = new Water(
      waterGeometry,
      {
        textureWidth: 1024,
        textureHeight: 1024,
    
      waterNormals:  new THREE.TextureLoader().load('water2.png',  
        function(texture){
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),            
   
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffff00,
        waterColor: 0x000033,
        distortionScale: 3.7

      }
 
    );
  
    newWater.rotation.x = -Math.PI / 2; // Level 180deg   

    newWater.material.onBeforeCompile = function (shader) {
     
      shader.uniforms.waveA = {
        value: [
          Math.sin( ( waveSettings.waveA.direction * Math.PI ) / 180 ),
          Math.cos( ( waveSettings.waveA.direction  * Math.PI ) / 180 ),
          waveSettings.waveA.steepness,
          waveSettings.waveA.wavelength,
        ],
      };

      shader.uniforms.waveB = {
        value: [
          Math.sin( ( waveSettings.waveB.direction * Math.PI ) / 180 ),
          Math.cos( ( waveSettings.waveB.direction * Math.PI ) / 180 ),
          waveSettings.waveB.steepness,
          waveSettings.waveB.wavelength,
        ],
      };

      shader.uniforms.waveC = {
        value: [
          Math.sin( ( waveSettings.waveC.direction * Math.PI ) / 180 ),
          Math.cos( ( waveSettings.waveC.direction * Math.PI ) / 180 ),
          waveSettings.waveC.steepness,
          waveSettings.waveC.wavelength,
        ],
      };
   
      shader.vertexShader = waterVertexShader;
      shader.fragmentShader = waterFragmentShader;

    };

    return newWater;
  }

 
 /* SKY */

  function getSky(){

    const newSky = new Sky();

    newSky.scale.setScalar(45000);   

    newSky.material.onBeforeCompile = function(shader) {

      shader.uniforms.turbidity = skyUniforms.turbidity;
      shader.uniforms.rayleigh = skyUniforms.rayleigh;
      shader.uniforms.mieCoefficient = skyUniforms.mieCoefficient;
      shader.uniforms.mieDirectionalG = skyUniforms.mieDirectionalG;

      shader.uniforms.sunPosition = skyUniforms.sunPosition;

      shader.uniforms.iResolution = skyUniforms.iResolution;
      shader.uniforms.iGlobalTime = skyUniforms.iGlobalTime;
      shader.uniforms.iPos = skyUniforms.iPos;
            
      shader.vertexShader = skyVertexShader;
      shader.fragmentShader = skyFragmentShader;
                
    }
    
    newSky.material.transparent = true;
  
    return newSky;
  
  }

  /* WILSON */

  function getWilson(){

    const sphereGeometry = new THREE.SphereGeometry(5, 10, 25);
    
    const texture = new THREE.TextureLoader().load('wilson.png',  
      function(texture){
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      });

    const material = new THREE.MeshBasicMaterial( { map: texture } );

    const wilson = new THREE.Mesh(sphereGeometry, material);
   
    return wilson;

  }

  function getBase(){

    const texture = new THREE.TextureLoader().load('base.png')

    const baseMaterial = new THREE.MeshBasicMaterial( {map: texture } );
	  const cylGeom = new THREE.CylinderGeometry(2.5, 2.5, 2, 64 );
	  
    const base = new THREE.Mesh(cylGeom, baseMaterial);
    
    return base;

  }
  

  function getTop(){

    const texture = new THREE.TextureLoader().load('top.png')

    const branchMaterial = new THREE.MeshBasicMaterial( {map: texture } );
	
	  const branches = new THREE.Object3D();

    for(let i = 0; i < 600; i++){

        let cylGeom = new THREE.CylinderGeometry(0.15, 0.25, Math.random() * 5, 64 );

        let cylinder = new THREE.Mesh(cylGeom, branchMaterial);

        cylinder.scale.x = 0.25;
       
        let branch = new THREE.Object3D();
        branch.add(cylinder);
       
        branch.position.x = Math.random() * (4-0.25) - 1.75;
        branch.position.z = Math.random() * (4-0.15) - 1.75;

        branches.add(branch);

    }

    return branches;
       
  }

  /* WAVES */

  function getWaveData(x, y, time) {
    const pos = new THREE.Vector3();
    const tangent = new THREE.Vector3(1,0,0);
    const binormal = new THREE.Vector3(0,0,1);
    Object.keys(waveSettings).forEach((wave) => {
      const w = waveSettings[wave]; 
      const k = (Math.PI * 2) / w.wavelength;
      const c = Math.sqrt(9.8 / k);
      const d = new THREE.Vector2(Math.sin((w.direction * Math.PI) / 180), -Math.sin((w.direction * Math.PI) / 180));

      const f = k * (d.dot(new THREE.Vector2(x,y)) - c * time);
      const a = w.steepness / k;

      pos.x += -d.y * (a * Math.cos(f));
      pos.y += a * Math.sin(f);
      pos.z += d.x * (a * Math.cos(f));

      tangent.x += -d.x * d.x * (w.steepness * Math.sin(f));
      tangent.y += d.x * (w.steepness * Math.cos(f));
      tangent.z += -d.x * d.y * (w.steepness * Math.sin(f));
      
      binormal.x += -d.x * d.y * (w.steepness * Math.sin(f));
      binormal.y += d.y * (w.steepness * Math.cos(f));
      binormal.z += -d.y * d.y * (w.steepness * Math.sin(f));

    });

    const normal = binormal.cross(tangent).normalize();

    return {position: pos, normal: normal}

  }

  function updateWilson(delta) {
   
    const t = water.material.uniforms[ 'time' ].value;

    const waveDataWilson = getWaveData(sphere.position.x, sphere.position.z, t);

    const waveDataBase = getWaveData(headBase.position.x, headBase.position.z, t);

    const waveDataTop = getWaveData(headTop.position.x, headTop.position.z, t);

    const quatWilson = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(waveDataWilson.normal.x, waveDataWilson.normal.y, waveDataWilson.normal.z)
    );
      
    const quatBase = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(waveDataBase.normal.x, waveDataBase.normal.y, waveDataBase.normal.z)
    );
 
    const quatTop = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(waveDataTop.normal.x, waveDataTop.normal.y, waveDataTop.normal.z)
    );
 
    sphere.position.y = waveDataWilson.position.y + 3.5; 
    headBase.position.y = waveDataWilson.position.y + 9; 
    headTop.position.y = waveDataWilson.position.y + 12; 
    
    sphere.quaternion.rotateTowards(quatWilson, delta * 0.5);

    headBase.quaternion.rotateTowards(quatBase, delta * 0.6);

    headBase.position.x = sphere.rotation.x * 4;

    headTop.quaternion.rotateTowards(quatTop, delta * 0.6);

    headTop.position.x = sphere.rotation.x * 6;

  }

  function setUniforms(){
  
    /* REFERENCE */

    skyUniforms.turbidity.value = 0.3;
    skyUniforms.rayleigh.value = 0;
    skyUniforms.mieCoefficient.value = 0.1;
    skyUniforms.mieDirectionalG.value = 1;
    skyUniforms.sunPosition.x = sun.x;
    skyUniforms.sunPosition.y = sun.y;
    skyUniforms.sunPosition.z = sun.z;


  }
  
  function setControls(){
  
    controls = new OrbitControls( camera, renderer.domElement );
    controls.maxPolarAngle = Math.PI * 0.45;
    controls.target.set( 0, 0, 0 );
    controls.minDistance = 150.0;
    controls.maxDistance = 800.0;
    controls.update();
  
  }

  function updateSun(){
       
    /* UNIFORMS */
  
    const phi = THREE.MathUtils.degToRad(90 - sunSettings.elevation);  //THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(sunSettings.azimuth); //THREE.MathUtils.degToRad(parameters.azimuth);
  
    sun.setFromSphericalCoords(1, phi, theta);
    
    sky.material.uniforms[ 'sunPosition' ].value.copy( sun ).normalize();
           
    water.material.uniforms[ 'sunDirection' ].value.copy(sun).normalize();

    skyUniforms = skyUniforms;

    setUniforms();
    
    /*** EXPOSURE  ***/

    renderer.toneMappingExposure = sunSettings.exposure;    

    scene.environment = pmremGenerator.fromScene(sky).texture;
    
  }

  function addGui(){
 
    /*** GUI ***/
   
    var gui = new dat.GUI({autoPlace: false});

    const folder = gui.addFolder("Sky Settings");
   /* folder.add(skyUniforms.turbidity, 'value').min(0).max(20).name("Turbidity");
    folder.add(skyUniforms.rayleigh, 'value').min(0).max(4).name("Rayleigh");
    folder.add(skyUniforms.mieCoefficient, 'value').min(0).max(0.1).name("MieCo");*/
  
    folder.add(sunSettings, 'elevation', 0, 90, 0.1).onChange(updateSun);  
    folder.add(sunSettings, 'azimuth', -180, 180, 0.1).onChange(updateSun);
    folder.add(sunSettings, 'exposure', 0, 1, 0.0001).onChange(updateSun); 
    
    folder.close();

    const folder2 = gui.addFolder("Wave Settings");
    folder2.add(waveSettings.waveA, 'direction', 0, 60, 1).name("Wave A Direction").onChange( (v) => {      
      const x = (v * Math.PI ) / 180;
      water.material.uniforms.waveA.value[ 0 ] = Math.sin( x );
      water.material.uniforms.waveA.value[ 1 ] = Math.cos( x );    

    });
    
    folder2.add(waveSettings.waveA, 'steepness', 0.0, 1.0, 0.1).name("Wave A Height").onChange( ( v ) => {
      water.material.uniforms.waveA.value[ 2 ] = v;            
		  } 
    );
    
    folder2.add(waveSettings.waveA, 'wavelength',1, 100, 1).name("Wave A Wave Length").onChange( ( v ) => {
   	  	water.material.uniforms.waveA.value[ 3 ] = v;
      }
    ); 

    folder2.add(waveSettings.waveB, 'direction', 0, 60, 1).name("Wave B Direction").onChange( (v) => {      
      const x = (v * Math.PI ) / 180;
      water.material.uniforms.waveA.value[ 0 ] = Math.sin( x );
      water.material.uniforms.waveA.value[ 1 ] = Math.cos( x );    

    });
    
    folder2.add(waveSettings.waveB, 'steepness', 0.0, 1.0, 0.1).name("Wave B Height").onChange( ( v ) => {
      water.material.uniforms.waveA.value[ 2 ] = v;            
		  } 
    );
    
    folder2.add(waveSettings.waveB, 'wavelength',1, 100, 1).name("Wave B Wave Length").onChange( ( v ) => {
   	  	water.material.uniforms.waveA.value[ 3 ] = v;
      }
    );     

    folder2.add(waveSettings.waveC, 'direction', 0, 60, 1).name("Wave C Direction").onChange( (v) => {      
      const x = (v * Math.PI ) / 180;
      water.material.uniforms.waveA.value[ 0 ] = Math.sin( x );
      water.material.uniforms.waveA.value[ 1 ] = Math.cos( x );    

    });
    
    folder2.add(waveSettings.waveC, 'steepness', 0.0, 1.0, 0.1).name("Wave C Height").onChange( ( v ) => {
      water.material.uniforms.waveA.value[ 2 ] = v;            
		  } 
    );
    
    folder2.add(waveSettings.waveC, 'wavelength',1, 100, 1).name("Wave C Wave Length").onChange( ( v ) => {
   	  	water.material.uniforms.waveA.value[ 3 ] = v;
      }
    );     

    folder2.close;
   
    gui.__ul.childNodes[0].classList.add("gui-list");
   
    gui.close();

    document.querySelector(".controls").append(gui.domElement);
    
  }

  function render(){

    renderer.render(scene, camera);
  
  }
  
  export function animate(){
 
    requestAnimationFrame(animate);
    
    delta = clock.getDelta();
    
    water.material.uniforms[ 'time' ].value += delta;
    
    sky.material.uniforms['iGlobalTime'].value += 0.002;
    
    updateWilson(delta);
    
    render();
  
  }

  init();

  animate();
