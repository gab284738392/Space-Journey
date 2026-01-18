// main.js - FINAL VERSION

var Colors = {
    red: 0xf25346,
    white: 0xd8d0d1,
    brown: 0x59332e,
    pink: 0xF5986E,
    brownDark: 0x23190f,
    blue: 0x68c3c0,
    green: 0x458248,
    yellow: 0xFFD700,
};

var currentPlaneType = 0; 

var gameState = {
    started: false,
    paused: false,
    gameWon: false,
    score: 0,
    distance: 0,
    lives: 3,
    gameOver: false,
    fuel: 100,
    maxFuel: 100,
    fuelDepletionRate: 0.05, 
    lowFuelThreshold: 30,
    sideScrolling: false,
    launchComplete: false,
    baseSpeed: 5,        
    maxSpeed: 25,        
    scrollSpeed: 5,      
    planeControlReduction: 1.0, 
    propellerSpeed: 0.3 
};

var keyStates = {};
var scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH, renderer, container;
const GROUND_LEVEL = -200;
var sunAngle = 0; 

var MusicManager = {
    dayTrack: new Audio('Day.mp3'),
    nightTrack: new Audio('night.mp3'),
    initialized: false,
    init: function() {
        this.dayTrack.loop = true;
        this.nightTrack.loop = true;
        this.dayTrack.volume = 0;
        this.nightTrack.volume = 0;
    },
    play: function() {
        if(!this.initialized) {
            var playPromise = this.dayTrack.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    this.nightTrack.play();
                    this.initialized = true;
                }).catch(error => {});
            }
        }
    },
    update: function(isNight) {
        if(!this.initialized) return;
        var fadeSpeed = 0.01; 
        if(isNight) {
            if(this.dayTrack.volume > 0.05) this.dayTrack.volume -= fadeSpeed;
            if(this.nightTrack.volume < 0.6) this.nightTrack.volume += fadeSpeed;
        } else {
            if(this.dayTrack.volume < 0.4) this.dayTrack.volume += fadeSpeed;
            if(this.nightTrack.volume > 0.05) this.nightTrack.volume -= fadeSpeed;
        }
    }
};

function createScene() {
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xd6eae6, 100, 3000); 
    aspectRatio = WIDTH / HEIGHT;
    fieldOfView = 60;
    nearPlane = 1;
    farPlane = 10000;
    camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane);
    camera.position.set(0, 150, 100);    
    renderer = new THREE.WebGLRenderer ({ alpha: true, antialias: true });
    renderer.setSize (WIDTH, HEIGHT);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    container = document.getElementById('world');
    container.appendChild (renderer.domElement);
    window.addEventListener('resize', handleWindowResize, false);
}

function handleWindowResize() {
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
}

var hemisphereLight, shadowLight;

function createLights(){
    hemisphereLight = new THREE.HemisphereLight(0xffffff,0xffffff, .9)
    shadowLight = new THREE.DirectionalLight(0xffffff, .9);
    shadowLight.position.set(0,350,350);
    shadowLight.castShadow = true;
    shadowLight.shadow.camera.left = -650;
    shadowLight.shadow.camera.right = 650;
    shadowLight.shadow.camera.top = 650;
    shadowLight.shadow.camera.bottom = -650;
    shadowLight.shadow.camera.near = 1;
    shadowLight.shadow.camera.far = 1000;
    shadowLight.shadow.mapSize.width = 4096;
    shadowLight.shadow.mapSize.height = 4096;
    shadowLight.shadow.bias = -0.0001; 
    scene.add(hemisphereLight);  
    scene.add(shadowLight);
}   

Land = function(){
    var geom = new THREE.CylinderGeometry(600,600,1700,40,10);
    geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
    var mat = new THREE.MeshPhongMaterial({color: 0x91C24D, shading:THREE.FlatShading});
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.receiveShadow = true;
}

Orbit = function(){
    var geom =new THREE.Object3D();
    this.mesh = geom;
}

Sun = function(){
    this.mesh = new THREE.Object3D();
    var sunGeom = new THREE.SphereGeometry( 400, 20, 10 );
    var sunMat = new THREE.MeshPhongMaterial({color: Colors.yellow, shading:THREE.FlatShading});
    var sun = new THREE.Mesh(sunGeom, sunMat);
    sun.castShadow = false;
    this.mesh.add(sun);
    
    var moonGeom = new THREE.SphereGeometry( 150, 20, 10 );
    var moonMat = new THREE.MeshPhongMaterial({color: 0xffffff, shading:THREE.FlatShading, emissive:0x222222});
    var moon = new THREE.Mesh(moonGeom, moonMat);
    moon.position.y = -1000; 
    moon.castShadow = false;
    this.mesh.add(moon);
}

Cloud = function(){
    this.mesh = new THREE.Object3D();
    var geom = new THREE.SphereGeometry(20, 7, 7);
    var mat = new THREE.MeshPhongMaterial({color: 0xFFFFFF, flatShading: true});
    var nBlocs = 3 + Math.floor(Math.random() * 3);
    for (var i = 0; i < nBlocs; i++ ){
        var m = new THREE.Mesh(geom, mat);
        m.position.x = i * 15;
        m.position.y = Math.random() * 10;
        m.position.z = Math.random() * 10;
        m.rotation.z = Math.random() * Math.PI * 2;
        m.rotation.y = Math.random() * Math.PI * 2;
        var s = 0.5 + Math.random() * 1.5;
        m.scale.set(s, s, s);
        m.castShadow = true; m.receiveShadow = true;
        this.mesh.add(m);
    }
}

Sky = function(){
    this.mesh = new THREE.Object3D();
    this.nClouds = 25;
    var stepAngle = Math.PI*2 / this.nClouds;
    for(var i=0; i<this.nClouds; i++){
        var c = new Cloud();
        var a = stepAngle*i;
        var h = 800 + Math.random()*200;
        c.mesh.position.y = Math.sin(a)*h;
        c.mesh.position.x = Math.cos(a)*h;      
        c.mesh.rotation.z = a + Math.PI/2;
        c.mesh.position.z = -400-Math.random()*400;
        var s = 1+Math.random()*2;
        c.mesh.scale.set(s,s,s);
        this.mesh.add(c.mesh);
    }
}

House = function() {
    this.mesh = new THREE.Object3D();
    var geomRunway = new THREE.BoxGeometry(120, 4, 800); 
    var matRunway = new THREE.MeshPhongMaterial({color: 0x333333, shading:THREE.FlatShading}); 
    var runway = new THREE.Mesh(geomRunway, matRunway);
    runway.position.set(-180, 0, 0); 
    runway.receiveShadow = true;
    this.mesh.add(runway);
    var geomLight = new THREE.BoxGeometry(5, 5, 5);
    var matRedLight = new THREE.MeshPhongMaterial({color:0xFF0000, emissive:0xFF0000, emissiveIntensity: 1});
    var matGreenLight = new THREE.MeshPhongMaterial({color:0x00FF00, emissive:0x00FF00, emissiveIntensity: 1});
    for(var i=0; i<8; i++) {
        var l1 = new THREE.Mesh(geomLight, matRedLight); l1.position.set(-230, 2, -350 + (i*100)); this.mesh.add(l1);
        var l2 = new THREE.Mesh(geomLight, matRedLight); l2.position.set(-130, 2, -350 + (i*100)); this.mesh.add(l2);
        var l3 = new THREE.Mesh(geomLight, matGreenLight); l3.position.set(-180, 2, -350 + (i*100)); l3.scale.set(0.5, 0.5, 2); this.mesh.add(l3);
    }
    var geomMain = new THREE.BoxGeometry(150, 100, 100);
    var matWhite = new THREE.MeshPhongMaterial({color: 0xEFEFEF, shading:THREE.FlatShading}); 
    var mainHall = new THREE.Mesh(geomMain, matWhite);
    mainHall.position.set(50, 50, 0); 
    mainHall.castShadow = true; mainHall.receiveShadow = true;
    this.mesh.add(mainHall);
    var geomWing = new THREE.BoxGeometry(80, 70, 80);
    var wingL = new THREE.Mesh(geomWing, matWhite); wingL.position.set(-40, 35, 0); wingL.castShadow = true; this.mesh.add(wingL);
    var wingR = new THREE.Mesh(geomWing, matWhite); wingR.position.set(140, 35, 0); wingR.castShadow = true; this.mesh.add(wingR);
    var geomRoof = new THREE.ConeGeometry(140, 60, 4);
    var matRoof = new THREE.MeshPhongMaterial({color: 0x2C3E50, shading:THREE.FlatShading}); 
    var roof = new THREE.Mesh(geomRoof, matRoof);
    roof.position.set(50, 130, 0);
    roof.rotation.y = Math.PI/4;
    roof.castShadow = true;
    this.mesh.add(roof);
    var geomPillar = new THREE.BoxGeometry(10, 80, 10);
    var pillar1 = new THREE.Mesh(geomPillar, matWhite); pillar1.position.set(20, 40, 55); this.mesh.add(pillar1);
    var pillar2 = new THREE.Mesh(geomPillar, matWhite); pillar2.position.set(80, 40, 55); this.mesh.add(pillar2);
    var geomDoor = new THREE.BoxGeometry(30, 60, 5);
    var matDoor = new THREE.MeshPhongMaterial({color: 0x5D4037}); 
    var door = new THREE.Mesh(geomDoor, matDoor);
    door.position.set(50, 30, 52);
    this.mesh.add(door);
    var matGlow = new THREE.MeshPhongMaterial({color: 0xFFFF00, emissive: 0xFFFF00, emissiveIntensity: 0.8});
    var geomWin = new THREE.BoxGeometry(20, 30, 5);
    var w1 = new THREE.Mesh(geomWin, matGlow); w1.position.set(10, 60, 52); this.mesh.add(w1);
    var w2 = new THREE.Mesh(geomWin, matGlow); w2.position.set(90, 60, 52); this.mesh.add(w2);
    var w3 = new THREE.Mesh(geomWin, matGlow); w3.position.set(-40, 40, 42); this.mesh.add(w3);
    var w4 = new THREE.Mesh(geomWin, matGlow); w4.position.set(140, 40, 42); this.mesh.add(w4);
    var houseLight = new THREE.PointLight(0xFFD700, 1.5, 500);
    houseLight.position.set(50, 100, 100);
    this.mesh.add(houseLight);
};

Tree = function () {
    this.mesh = new THREE.Object3D();
    var matTreeLeaves = new THREE.MeshPhongMaterial({ color: 0x4CAF50, shading:THREE.FlatShading });
    var matTreeTrunk = new THREE.MeshPhongMaterial({ color: 0x8B4513, shading:THREE.FlatShading }); 
    var trunkHeight = 120; var trunkWidth = 10;
    var geomTrunk = new THREE.BoxGeometry(trunkWidth, trunkHeight, trunkWidth);
    geomTrunk.applyMatrix(new THREE.Matrix4().makeTranslation(0, trunkHeight/2, 0));
    var trunk = new THREE.Mesh(geomTrunk, matTreeTrunk);
    trunk.castShadow = true; trunk.receiveShadow = true;
    this.mesh.add(trunk);
    var leavesHeight = 100;
    var geomLeaves = new THREE.ConeGeometry(30, leavesHeight, 6); 
    var leaves = new THREE.Mesh(geomLeaves, matTreeLeaves);
    leaves.position.y = trunkHeight; 
    leaves.castShadow = true; leaves.receiveShadow = true;
    this.mesh.add(leaves);
}

Grass = function() {
    var geom = new THREE.ConeGeometry(3, 8, 4);
    var mat = new THREE.MeshPhongMaterial({color: 0x6ba942, shading: THREE.FlatShading});
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.receiveShadow = true;
}

Forest = function(){
    this.mesh = new THREE.Object3D();
    this.nTrees = 200; 
    var stepAngle = Math.PI*2 / this.nTrees;
    for(var i=0; i<this.nTrees; i++){
        var t = new Tree();
        var a = stepAngle*i;
        var h = 605;
        t.mesh.position.y = Math.sin(a)*h;
        t.mesh.position.x = Math.cos(a)*h;      
        t.mesh.rotation.z = a + (Math.PI/2)*3;
        t.mesh.position.z = 0-Math.random()*600;
        var s = .2+Math.random()*.4;
        t.mesh.scale.set(s,s,s);
        this.mesh.add(t.mesh);
    }
}

var AirPlane = function() {
    this.mesh = new THREE.Object3D();
    this.propeller = new THREE.Object3D(); 
    if (currentPlaneType == 0) {
        var geomCockpit = new THREE.BoxGeometry(80,50,50,1,1,1);
        var matCockpit = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
        geomCockpit.vertices[4].y-=10; geomCockpit.vertices[4].z+=20;
        geomCockpit.vertices[5].y-=10; geomCockpit.vertices[5].z-=20;
        geomCockpit.vertices[6].y+=30; geomCockpit.vertices[6].z+=20;
        geomCockpit.vertices[7].y+=30; geomCockpit.vertices[7].z-=20;
        var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
        cockpit.castShadow = true; cockpit.receiveShadow = true;
        this.mesh.add(cockpit);
        var geomEngine = new THREE.BoxGeometry(20,50,50,1,1,1);
        var matEngine = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
        var engine = new THREE.Mesh(geomEngine, matEngine);
        engine.position.x = 40; engine.castShadow = true; engine.receiveShadow = true;
        this.mesh.add(engine);
        var geomTailPlane = new THREE.BoxGeometry(15,20,5,1,1,1);
        var matTailPlane = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
        var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
        tailPlane.position.set(-35,25,0); tailPlane.castShadow = true; tailPlane.receiveShadow = true;
        this.mesh.add(tailPlane);
        var geomWing = new THREE.BoxGeometry(40,8,150,1,1,1);
        var matWing = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
        var wing = new THREE.Mesh(geomWing, matWing);
        wing.castShadow = true; wing.receiveShadow = true;
        this.mesh.add(wing);
        var geomPropeller = new THREE.BoxGeometry(20,10,10,1,1,1);
        var matPropeller = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
        this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
        this.propeller.castShadow = true; this.propeller.receiveShadow = true;
        var geomBlade = new THREE.BoxGeometry(1,100,20,1,1,1);
        var matBlade = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
        var blade = new THREE.Mesh(geomBlade, matBlade);
        blade.position.set(8,0,0); blade.castShadow = true; blade.receiveShadow = true;
        this.propeller.add(blade);
        this.propeller.position.set(50,0,0);
        this.mesh.add(this.propeller);
    } else if (currentPlaneType == 1) {
        var geomBody = new THREE.BoxGeometry(100,40,40);
        var matBody = new THREE.MeshPhongMaterial({color:Colors.blue, shading:THREE.FlatShading});
        var body = new THREE.Mesh(geomBody, matBody);
        body.castShadow = true; body.receiveShadow = true;
        this.mesh.add(body);
        var geomNose = new THREE.ConeGeometry(25, 40, 4);
        var matNose = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
        var nose = new THREE.Mesh(geomNose, matNose);
        nose.rotation.z = -Math.PI/2;
        nose.position.set(70,0,0);
        this.mesh.add(nose);
        var geomWing = new THREE.BoxGeometry(40,5,160);
        var matWing = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
        var wing = new THREE.Mesh(geomWing, matWing);
        wing.rotation.y = -0.2; 
        this.mesh.add(wing);
        var geomTail = new THREE.BoxGeometry(30,30,5);
        var tail = new THREE.Mesh(geomTail, matBody);
        tail.position.set(-40, 20, 0);
        tail.rotation.z = 0.5;
        this.mesh.add(tail);
        var geomTurbine = new THREE.CylinderGeometry(5, 15, 20, 8);
        var matTurbine = new THREE.MeshPhongMaterial({color:Colors.white});
        this.propeller = new THREE.Mesh(geomTurbine, matTurbine);
        this.propeller.rotation.z = Math.PI/2;
        this.propeller.position.set(-50, 0, 0); 
        this.mesh.add(this.propeller);
    } else if (currentPlaneType == 2) {
        var geomBody = new THREE.BoxGeometry(70,30,30);
        var matBody = new THREE.MeshPhongMaterial({color:Colors.yellow, shading:THREE.FlatShading});
        var body = new THREE.Mesh(geomBody, matBody);
        this.mesh.add(body);
        var geomWing = new THREE.BoxGeometry(20,5,100);
        var matDark = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
        var w1 = new THREE.Mesh(geomWing, matDark);
        w1.position.set(0, 0, 0); w1.rotation.z = 0.3; w1.rotation.y = 0.3;
        this.mesh.add(w1);
        var w2 = new THREE.Mesh(geomWing, matDark);
        w2.position.set(0, 0, 0); w2.rotation.z = -0.3; w2.rotation.y = -0.3;
        this.mesh.add(w2);
        var geomProp = new THREE.BoxGeometry(10,10,10);
        this.propeller = new THREE.Mesh(geomProp, matDark);
        var blade = new THREE.Mesh(new THREE.BoxGeometry(1,80,10), matBody);
        this.propeller.add(blade);
        var blade2 = new THREE.Mesh(new THREE.BoxGeometry(1,10,80), matBody);
        this.propeller.add(blade2);
        this.propeller.position.set(40,0,0);
        this.mesh.add(this.propeller);
    } else if (currentPlaneType == 3) {
        var geomBody = new THREE.CylinderGeometry(25, 25, 100, 8);
        var matBody = new THREE.MeshPhongMaterial({color:Colors.green, shading:THREE.FlatShading});
        var body = new THREE.Mesh(geomBody, matBody);
        body.rotation.z = Math.PI/2;
        this.mesh.add(body);
        var geomWing = new THREE.BoxGeometry(40, 8, 220);
        var wing = new THREE.Mesh(geomWing, matBody);
        wing.position.set(10,0,0);
        this.mesh.add(wing);
        var geomCockpit = new THREE.BoxGeometry(30,20,30);
        var matGlass = new THREE.MeshPhongMaterial({color:Colors.blue});
        var cockpit = new THREE.Mesh(geomCockpit, matGlass);
        cockpit.position.set(20, 20, 0);
        this.mesh.add(cockpit);
        this.propeller = new THREE.Object3D();
        var geomBlade = new THREE.BoxGeometry(2, 60, 8);
        var matBlade = new THREE.MeshPhongMaterial({color:Colors.brownDark});
        var p1 = new THREE.Mesh(geomBlade, matBlade); p1.position.z = 50;
        var p2 = new THREE.Mesh(geomBlade, matBlade); p2.position.z = -50;
        this.propeller.add(p1);
        this.propeller.add(p2);
        this.propeller.position.set(40, 0, 0);
        this.mesh.add(this.propeller);
    }
};

var sky, forest, land, orbit, airplane, sun;
var collectibles = [], fuelPickups = [], obstacles = [];
var gameBackground = null;
var mousePos={x:0, y:0};
var offSet = -600;

function createSky(){
  sky = new Sky();
  sky.mesh.position.y = offSet;
  scene.add(sky.mesh);
}

function createLand(){
  land = new Land();
  land.mesh.position.y = offSet;
  scene.add(land.mesh);
}

function createOrbit(){
  orbit = new Orbit();
  orbit.mesh.position.y = offSet;
  orbit.mesh.rotation.z = -Math.PI/6; 
  scene.add(orbit.mesh);
}

function createForest(){
  forest = new Forest();
  forest.mesh.position.y = offSet;
  scene.add(forest.mesh);
}

function createSun(){ 
    sun = new Sun();
    sun.mesh.scale.set(1,1,.3);
    sun.mesh.position.set(0,-30,-850);
    scene.add(sun.mesh);
}

function createPlane(){ 
    airplane = new AirPlane();
    airplane.mesh.scale.set(.35,.35,.35);
    airplane.mesh.position.set(-40,110,-250);
    scene.add(airplane.mesh);
}

function createGameBackground() {
    if(gameBackground) scene.remove(gameBackground);
    gameBackground = new THREE.Object3D();
    var fieldGeom = new THREE.PlaneGeometry(30000, 10000); 
    var fieldMat = new THREE.MeshPhongMaterial({ color: 0x91C24D, shading: THREE.FlatShading, side: THREE.DoubleSide });
    var field = new THREE.Mesh(fieldGeom, fieldMat);
    field.rotation.x = -Math.PI / 2;
    field.position.y = GROUND_LEVEL;
    field.position.z = -500;
    field.receiveShadow = true;
    gameBackground.add(field);
    for(var i=0; i<400; i++) {
        var grass = new Grass();
        grass.mesh.position.x = -3000 + Math.random() * 6000;
        grass.mesh.position.z = -1000 - Math.random() * 3000;
        grass.mesh.position.y = GROUND_LEVEL;
        gameBackground.add(grass.mesh);
    }
    for(var i = 0; i < 50; i++) {
        var mountainGroup = new THREE.Object3D();
        var mHeight = 150 + Math.random() * 500; 
        var mRadius = mHeight * 0.7; 
        var mGeom = new THREE.ConeGeometry(mRadius, mHeight, 6);
        var mMat = new THREE.MeshPhongMaterial({ color: 0x6B8E23, shading: THREE.FlatShading });
        var mountain = new THREE.Mesh(mGeom, mMat);
        mGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0, mHeight/2, 0));
        mountain.castShadow = true; mountain.receiveShadow = true;
        mountainGroup.add(mountain);
        if (mHeight > 350) {
            var capHeight = mHeight * 0.25;
            var capGeom = new THREE.ConeGeometry(mRadius * 0.25, capHeight, 6);
            var capMat = new THREE.MeshPhongMaterial({color: 0xFFFFFF, shading: THREE.FlatShading});
            var cap = new THREE.Mesh(capGeom, capMat);
            cap.position.y = mHeight - (capHeight/2); 
            mountainGroup.add(cap);
        }
        var numTrees = 1 + Math.floor(Math.random() * 3);
        for(var j = 0; j < numTrees; j++) {
            var tree = new Tree();
            var scale = 0.2 + Math.random() * 0.3; 
            tree.mesh.scale.set(scale, scale, scale);
            var angle = Math.random() * Math.PI * 2;
            var distFromCenter = (mRadius * 0.3) + Math.random() * (mRadius * 0.4);
            tree.mesh.position.x = Math.cos(angle) * distFromCenter;
            tree.mesh.position.z = Math.sin(angle) * distFromCenter;
            var slopeRatio = (mRadius - distFromCenter) / mRadius;
            tree.mesh.position.y = slopeRatio * mHeight * 0.8; 
            mountainGroup.add(tree.mesh);
        }
        mountainGroup.position.x = -2500 + Math.random() * 5000;
        mountainGroup.position.z = -800 - Math.random() * 2500; 
        mountainGroup.position.y = GROUND_LEVEL; 
        gameBackground.add(mountainGroup);
    }
    for(var i = 0; i < 20; i++) {
        var cloud = new Cloud();
        cloud.mesh.position.y = 350 + Math.random() * 300; 
        cloud.mesh.position.x = -2000 + Math.random() * 4000;
        cloud.mesh.position.z = -1000 - Math.random() * 2000;
        var s = 2.0 + Math.random() * 2.0;
        cloud.mesh.scale.set(s,s,s);
        gameBackground.add(cloud.mesh);
    }
    scene.add(gameBackground);
}

function createCollectibles() { collectibles = []; }

FuelPickup = function() {
    this.mesh = new THREE.Object3D();
    var geomFuel = new THREE.OctahedronGeometry(15, 0); 
    var matFuel = new THREE.MeshPhongMaterial({color: 0xFFD700, shading: THREE.FlatShading, emissive: 0xaa5500, emissiveIntensity: 0.5});
    var fuel = new THREE.Mesh(geomFuel, matFuel);
    this.mesh.add(fuel);
    var geomGlow = new THREE.SphereGeometry(15, 8, 8);
    var matGlow = new THREE.MeshPhongMaterial({color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1.0});
    var glow = new THREE.Mesh(geomGlow, matGlow);
    this.mesh.add(glow);
    this.mesh.rotation.z = Math.PI / 2;
    this.collected = false;
};

MountainObstacle = function() {
    this.mesh = new THREE.Object3D();
    this.peaks = [];
    var difficultyScale = 1.0;
    if (gameState.distance > 3000) difficultyScale = 1.2; 
    var mHeight = (300 + Math.random() * 200) * difficultyScale;
    if (mHeight > 450) mHeight = 450; 
    var mRadius = mHeight * 0.4; 
    var mGeom = new THREE.ConeGeometry(mRadius, mHeight, 6);
    var mMat = new THREE.MeshPhongMaterial({color: 0x6B8E23, shading: THREE.FlatShading});
    var mountain = new THREE.Mesh(mGeom, mMat);
    mGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0, mHeight/2, 0));
    mountain.castShadow = true; mountain.receiveShadow = true;
    this.mesh.add(mountain);
    this.peaks.push({ x: 0, z: 0, height: mHeight, radius: mRadius });
    if(mHeight > 350) {
        var capHeight = mHeight * 0.25;
        var capGeom = new THREE.ConeGeometry(mRadius * 0.25, capHeight, 6);
        var capMat = new THREE.MeshPhongMaterial({color: 0xFFFFFF, shading: THREE.FlatShading});
        var cap = new THREE.Mesh(capGeom, capMat);
        cap.position.y = mHeight - (capHeight/2);
        this.mesh.add(cap);
    }
    var sHeight = mHeight * (0.4 + Math.random() * 0.3); 
    var sRadius = sHeight * 0.4; 
    var sGeom = new THREE.ConeGeometry(sRadius, sHeight, 6);
    var sideKick = new THREE.Mesh(sGeom, mMat);
    sGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0, sHeight/2, 0));
    var offsetAngle = Math.random() * Math.PI * 2;
    var offsetDist = mRadius * 0.5; 
    var sx = Math.cos(offsetAngle) * offsetDist;
    var sz = Math.sin(offsetAngle) * offsetDist;
    sideKick.position.set(sx, 0, sz);
    sideKick.castShadow = true; sideKick.receiveShadow = true;
    this.mesh.add(sideKick);
    this.peaks.push({ x: sx, z: sz, height: sHeight, radius: sRadius });
    this.active = true;
    this.isObstacle = true;
    this.isMountain = true; 
};

function spawnFuelPickup() {
    var fuel = new FuelPickup();
    if(gameState.sideScrolling) {
        fuel.mesh.position.x = 400;
        if(gameState.distance > 1000) {
            if(Math.random() < 0.6) {
                fuel.mesh.position.y = 50 + Math.random() * 150; 
            } else {
                fuel.mesh.position.y = 200 + Math.random() * 150;
            }
        } else {
            fuel.mesh.position.y = 100 + Math.random() * 250;
        }
        fuel.mesh.position.z = -200;
    }
    scene.add(fuel.mesh);
    fuelPickups.push(fuel);
}

function spawnTreeObstacle() {
    var tree = new Tree();
    var side = Math.random() < 0.5 ? 'left' : 'right';
    if(side === 'left') {
        var sideOffset = -150 - Math.random() * 100; 
        tree.mesh.position.x = 400 + sideOffset; 
        tree.side = 'left';
        tree.sideOffset = sideOffset; 
    } else {
        var sideOffset = 150 + Math.random() * 100; 
        tree.mesh.position.x = 400 + sideOffset; 
        tree.side = 'right';
        tree.sideOffset = sideOffset; 
    }
    tree.mesh.position.z = -200; 
    var treeScale = 1.5 + Math.random() * 1.0;
    if (gameState.distance > 3000) {
        var growth = Math.min((gameState.distance - 3000) / 5000, 0.8);
        treeScale = 1.2 + Math.random() * 0.5 + growth;
    }
    tree.mesh.scale.set(treeScale, treeScale, treeScale);
    tree.mesh.position.y = GROUND_LEVEL;
    tree.forestTree = true;
    scene.add(tree.mesh);
    obstacles.push(tree);
}

function spawnMountainObstacle() {
    var mountain = new MountainObstacle();
    mountain.mesh.position.x = 500;
    mountain.mesh.position.y = GROUND_LEVEL;
    mountain.mesh.position.z = -300 + Math.random() * 200;
    scene.add(mountain.mesh);
    obstacles.push(mountain);
}

function startWinSequence() {
    gameState.gameWon = true;
    gameState.scrollSpeed = 0; 
    for(var i = 0; i < obstacles.length; i++) { scene.remove(obstacles[i].mesh); }
    obstacles = []; 
    for(var i = 0; i < fuelPickups.length; i++) { scene.remove(fuelPickups[i].mesh); }
    fuelPickups = [];
    var house = new House();
    house.mesh.position.set(180, GROUND_LEVEL, -600); 
    house.mesh.scale.set(1.5, 1.5, 1.5); 
    scene.add(house.mesh);
    var landingInterval = setInterval(function() {
        airplane.mesh.position.x += (0 - airplane.mesh.position.x) * 0.1;
        if(airplane.mesh.position.y > -185) {
            airplane.mesh.position.y -= 1.5; 
            airplane.mesh.rotation.z = 0;
            airplane.mesh.rotation.x = -0.05; 
            airplane.propeller.rotation.x += 0.1; 
        } else {
            clearInterval(landingInterval);
            airplane.mesh.position.y = -185; 
            airplane.mesh.rotation.x = 0;    
            showWinScreen();
        }
    }, 20);
}

function showWinScreen() {
    document.getElementById('winScreen').classList.remove('hidden');
    document.getElementById('winScore').textContent = gameState.score;
    document.getElementById('gameHUD').style.display = 'none'; // HIDE HUD
    createConfetti();
}

function createConfetti() {
    var container = document.getElementById('confettiContainer');
    var colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'];
    for(var i=0; i<100; i++) {
        var conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 3 + 2) + 's';
        container.appendChild(conf);
    }
}

function checkCollectibles() {
    for(var i = fuelPickups.length - 1; i >= 0; i--) {
        if(!fuelPickups[i].collected) {
            var dist = airplane.mesh.position.distanceTo(fuelPickups[i].mesh.position);
            if(dist < 100) {
            fuelPickups[i].collected = true;
            scene.remove(fuelPickups[i].mesh);
            fuelPickups.splice(i, 1);
            gameState.fuel = Math.min(gameState.fuel + 15, gameState.maxFuel); 
            gameState.score += 50;
            updateHUD();
            playCollectSound();
        }
        }
    }
    for(var i = obstacles.length - 1; i >= 0; i--) {
        if(obstacles[i].active && obstacles[i].isObstacle) {
            var planeX = airplane.mesh.position.x;
            var planeY = airplane.mesh.position.y;
            var planeZ = airplane.mesh.position.z;
            if(obstacles[i].isMountain) {
                var obstacleX = obstacles[i].mesh.position.x;
                var obstacleZ = obstacles[i].mesh.position.z;
                for(var p = 0; p < obstacles[i].peaks.length; p++) {
                    var peak = obstacles[i].peaks[p];
                    var peakX = obstacleX + peak.x;
                    var peakZ = obstacleZ + peak.z;
                    var dx = planeX - peakX;
                    var dz = planeZ - peakZ;
                    var horizontalDist = Math.sqrt(dx*dx + dz*dz);
                    var heightFromBase = planeY - GROUND_LEVEL;
                    if (heightFromBase < peak.height) {
                        var safeRadiusAtHeight = peak.radius * (1 - (heightFromBase / peak.height)) * 0.7; 
                        if (horizontalDist < safeRadiusAtHeight) { crashPlane(); break; }
                    }
                }
            } 
            else if(obstacles[i].forestTree) {
                var treeX = obstacles[i].mesh.position.x;
                var horizontalDist = Math.abs(planeX - treeX);
                var treeHeight = 250 * obstacles[i].mesh.scale.y; 
                var treeTopY = GROUND_LEVEL + treeHeight;
                if(horizontalDist < 20 && planeY < treeTopY) { crashPlane(); }
            }
        }
    }
}

function crashPlane() {
    gameState.lives--;
    updateHUD();
    playCrashSound();
    if(gameState.lives <= 0) { gameOver(); } else { airplane.mesh.position.y += 50; }
}

function updatePlane() {
    if(gameState.sideScrolling) {
        var targetY = normalize(mousePos.y, -.75, .75, 50, 220); 
        var controlSpeed = 8 * gameState.planeControlReduction; 
        
        // KEYBOARD OVERRIDE LOGIC
        if(keyStates['w'] || keyStates['ArrowUp']) {
            targetY = 220; // Force Climb
        } else if(keyStates['s'] || keyStates['ArrowDown']) {
            targetY = 50;  // Force Dive
        }

        if(targetY < 50) targetY = 50;   
        if(targetY > 220) targetY = 220; 
        
        var responsiveness = 0.1 * gameState.planeControlReduction;
        airplane.mesh.position.x = 0; 
        airplane.mesh.position.y += (targetY - airplane.mesh.position.y) * responsiveness;
        airplane.mesh.position.z = -200; 
        if(gameState.distance > 5000) { airplane.mesh.position.y += (Math.random() - 0.5) * 5; }
        airplane.mesh.rotation.z = (targetY - airplane.mesh.position.y) * 0.02 * gameState.planeControlReduction;
        airplane.mesh.rotation.x = -0.1; 
        airplane.mesh.rotation.y = 0; 
    } else {
        var targetY = normalize(mousePos.y,-.75,.75, 100, 350);
        var targetX = normalize(mousePos.x,-.75,.75,-300, 300);
        airplane.mesh.position.y += (targetY-airplane.mesh.position.y)*0.1;
        airplane.mesh.position.x += (targetX-airplane.mesh.position.x)*0.1;
        airplane.mesh.rotation.z = (targetY-airplane.mesh.position.y)*0.0128;
        airplane.mesh.rotation.x = (airplane.mesh.position.y-targetY)*0.0064;
    }
    airplane.propeller.rotation.x += gameState.propellerSpeed;
}

function normalize(v,vmin,vmax,tmin, tmax){
    var nv = Math.max(Math.min(v,vmax), vmin);
    var dv = vmax-vmin;
    var pc = (nv-vmin)/dv;
    var dt = tmax-tmin;
    var tv = tmin + (pc*dt);
    return tv;
}

function updateHUD() {
    document.getElementById('scoreDisplay').textContent = gameState.score;
    document.getElementById('livesDisplay').textContent = gameState.lives;
    document.getElementById('distanceDisplay').textContent = Math.floor(gameState.distance);
    var fuelPercent = (gameState.fuel / gameState.maxFuel) * 100;
    var fuelBar = document.getElementById('fuelBar');
    var fuelPercentText = document.getElementById('fuelPercent');
    fuelBar.style.width = fuelPercent + '%';
    fuelPercentText.textContent = Math.floor(fuelPercent) + '%';
    if(fuelPercent < 30) fuelBar.classList.add('low');
    else fuelBar.classList.remove('low');
}

function playCollectSound() {
    try {
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.1);
    } catch(e) {}
}

function playCrashSound() {
    try {
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 150;
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.5, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.3);
    } catch(e) {}
}

function gameOver() {
    gameState.gameOver = true;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('endScreen').classList.remove('hidden');
    document.getElementById('gameHUD').style.display = 'none'; // HIDE HUD
}

function togglePause() {
    if(!gameState.gameOver) {
        gameState.paused = !gameState.paused;
        document.getElementById('pauseScreen').classList.toggle('hidden');
        if(gameState.paused) {
            document.getElementById('gameHUD').style.display = 'none';
        } else {
            document.getElementById('gameHUD').style.display = 'block';
        }
    }
}

var fuelSpawnTimer = 0;
var obstacleSpawnTimer = 0;
var gameTimer = 0;
var launchTimer = 0;

function loop(){
  if(gameState.paused || gameState.gameOver) {
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
    return;
  }

  if(gameState.started && !gameState.gameWon) { 
    if(!gameState.launchComplete) {
      land.mesh.visible = false; forest.mesh.visible = false; sky.mesh.visible = false;
      launchTimer++;
      if(launchTimer < 30) {
        airplane.mesh.position.x += 8 + (launchTimer * 0.3);
        airplane.mesh.position.y += 2; 
        airplane.mesh.rotation.y -= 0.08; 
        airplane.mesh.rotation.x -= 0.02; 
      } else if(launchTimer < 90) {
        airplane.mesh.position.x += 12;
        airplane.mesh.rotation.y -= 0.03;
        airplane.mesh.rotation.x += (0 - airplane.mesh.rotation.x) * 0.1;
      } else if(launchTimer < 120) {
        airplane.mesh.position.x += 8;
        airplane.mesh.position.x += (0 - airplane.mesh.position.x) * 0.1;
        airplane.mesh.position.y += (200 - airplane.mesh.position.y) * 0.1;
        airplane.mesh.position.z += (-200 - airplane.mesh.position.z) * 0.1;
        airplane.mesh.rotation.y += (0 - airplane.mesh.rotation.y) * 0.1; 
      } else {
        gameState.launchComplete = true;
        gameState.sideScrolling = true;
        ThemeManager.setGameTheme();
        camera.position.x = 0; camera.position.y = 250; camera.position.z = 300; 
        camera.lookAt(new THREE.Vector3(0, 150, -250)); 
        land.mesh.visible = false; forest.mesh.visible = false; orbit.mesh.visible = false; sun.mesh.visible = false;
        var animeSky = scene.getObjectByName("AnimeSky");
        if (animeSky) animeSky.visible = false; 
        createGameBackground();
      }
    }
    
    if(gameState.sideScrolling) {
      gameTimer++;
      gameState.distance += 0.5;
      
    // UPDATE: Set to 20000 for final version
    if(gameState.distance >= 20000) { 
        startWinSequence();
    }
      var targetSpeed = gameState.baseSpeed + (gameState.distance * 0.002);
      if(targetSpeed > gameState.maxSpeed) targetSpeed = gameState.maxSpeed;
      gameState.scrollSpeed = targetSpeed;
      gameState.fuel -= gameState.fuelDepletionRate;
      if(gameState.fuel < 0) gameState.fuel = 0;
      if(gameState.fuel <= 0 || airplane.mesh.position.y <= 50) gameOver();
      fuelSpawnTimer++;
      if(fuelSpawnTimer > 80) { spawnFuelPickup(); fuelSpawnTimer = 0; }
      obstacleSpawnTimer++;
      var spawnRate = Math.max(120 - (gameState.scrollSpeed * 5), 40);
      if(obstacleSpawnTimer > spawnRate) {
        var difficulty = gameState.distance * 0.001; 
        var mountainChance = 0.2 + (difficulty * 0.1); 
        if(mountainChance > 0.6) mountainChance = 0.6; 
        if(Math.random() < mountainChance) { spawnMountainObstacle(); } else { spawnTreeObstacle(); }
        obstacleSpawnTimer = 0;
      }
      for(var i = fuelPickups.length - 1; i >= 0; i--) {
        fuelPickups[i].mesh.position.x -= gameState.scrollSpeed;
        fuelPickups[i].mesh.rotation.x += 0.08;
        if(fuelPickups[i].mesh.position.x < -600) { scene.remove(fuelPickups[i].mesh); fuelPickups.splice(i, 1); }
      }
      for(var i = obstacles.length - 1; i >= 0; i--) {
        if(obstacles[i].forestTree && obstacles[i].sideOffset !== undefined) {
          var baseX = obstacles[i].mesh.position.x - obstacles[i].sideOffset;
          baseX -= gameState.scrollSpeed;
          obstacles[i].mesh.position.x = baseX + obstacles[i].sideOffset;
        } else {
          obstacles[i].mesh.position.x -= gameState.scrollSpeed;
        }
        if(obstacles[i].mesh.position.x < -600) { scene.remove(obstacles[i].mesh); obstacles.splice(i, 1); }
      }
      if(gameBackground) {
        gameBackground.position.x -= gameState.scrollSpeed * 0.3; 
        if(gameBackground.position.x < -2000) gameBackground.position.x += 2000;
      }
      updateHUD();
      updatePlane();
      checkCollectibles();
    }
  }
  land.mesh.rotation.z += .005;
  orbit.mesh.rotation.z += .001;
  sky.mesh.rotation.z += .003;
  forest.mesh.rotation.z += .005;
  
  if(!gameState.started) {
      airplane.mesh.rotation.y += 0.005;
      airplane.propeller.rotation.x += 0.3;
  } else if (!gameState.gameWon) { 
      updatePlane(); 
  }
  
  if(gameState.sideScrolling) {
      if(gameState.distance < 2000) {
          sun.mesh.position.y = 500;
          sun.mesh.rotation.z = 0;
          ThemeManager.update(500); 
          hemisphereLight.intensity = 1.0; shadowLight.intensity = 0.9;
          MusicManager.update(false); 
      } else {
          var sunsetProgress = (gameState.distance - 2000) * 0.001; 
          sun.mesh.position.y = 500 - (sunsetProgress * 700); 
          if(sun.mesh.position.y < -200) sun.mesh.position.y = -200;
          ThemeManager.update(sun.mesh.position.y);
          if (sun.mesh.position.y > -50) {
              hemisphereLight.intensity = 1.0; shadowLight.intensity = 0.9;
              MusicManager.update(false); 
          } else {
              hemisphereLight.intensity = 0.2; shadowLight.intensity = 0.1;
              MusicManager.update(true); 
          }
      }
  } else {
      var sunRotationSpeed = 0.0001;
      sun.mesh.position.y = -30 - (500 * Math.sin(sunRotationSpeed * Date.now()));
      var sunY = sun.mesh.position.y;
      ThemeManager.update(sunY);
      if (sunY > -50) {
          hemisphereLight.intensity = 1.0; shadowLight.intensity = 0.9;
      } else {
          hemisphereLight.intensity = 0.4; shadowLight.intensity = 0.2;
      }
  }

  // --- BUTTON LISTENERS ---
  if(document.getElementById('storyButton')) {
      document.getElementById('storyButton').onclick = function() {
          document.getElementById('mainMenuScreen').classList.add('hidden');
          document.getElementById('storyScreen').classList.remove('hidden');
          var content = document.querySelector('.star-wars-content');
          content.style.animation = 'none';
          content.offsetHeight; 
          content.style.animation = 'crawl 60s linear infinite';
      };
  }
  if(document.getElementById('backFromStory')) {
      document.getElementById('backFromStory').onclick = function() {
          document.getElementById('storyScreen').classList.add('hidden');
          document.getElementById('mainMenuScreen').classList.remove('hidden');
      };
  }
  if(document.getElementById('instructionsButton')) {
    document.getElementById('instructionsButton').onclick = function() {
        document.getElementById('mainMenuScreen').classList.add('hidden');
        document.getElementById('aboutScreen').classList.remove('hidden');
    };
  }
  if(document.getElementById('backFromAbout')) {
    document.getElementById('backFromAbout').onclick = function() {
        document.getElementById('aboutScreen').classList.add('hidden');
        document.getElementById('mainMenuScreen').classList.remove('hidden');
    };
  }
  if(document.getElementById('creditsButton')) {
      document.getElementById('creditsButton').onclick = function() {
          document.getElementById('mainMenuScreen').classList.add('hidden');
          document.getElementById('creditsScreen').classList.remove('hidden');
      };
  }
  if(document.getElementById('backFromCredits')) {
      document.getElementById('backFromCredits').onclick = function() {
          document.getElementById('creditsScreen').classList.add('hidden');
          document.getElementById('mainMenuScreen').classList.remove('hidden');
      };
  }
  if(document.getElementById('featuresButton')) {
      document.getElementById('featuresButton').onclick = function() {
          document.getElementById('mainMenuScreen').classList.add('hidden');
          document.getElementById('featuresScreen').classList.remove('hidden');
      };
  }
  if(document.getElementById('backFromFeatures')) {
      document.getElementById('backFromFeatures').onclick = function() {
          document.getElementById('featuresScreen').classList.add('hidden');
          document.getElementById('mainMenuScreen').classList.remove('hidden');
      };
  }
  
  if(document.getElementById('restartWinButton')) {
      document.getElementById('restartWinButton').onclick = function() { location.reload(); };
  }
  if(document.getElementById('returnToMenuWin')) {
      document.getElementById('returnToMenuWin').onclick = function() { location.reload(); };
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function handleMouseMove (event) {
    var tx = -1 + (event.clientX / WIDTH)*2;
    var ty = 1 - (event.clientY / HEIGHT)*2;
    mousePos = {x:tx, y:ty}; 
    MusicManager.play();   
}

function handleKeyDown(event) {
    keyStates[event.key.toLowerCase()] = true;
    if(event.key.toLowerCase() === 'p') togglePause();
    MusicManager.play();
}

function handleKeyUp(event) {
    keyStates[event.key.toLowerCase()] = false;
}

function cyclePlane(direction) {
    currentPlaneType += direction;
    if(currentPlaneType > 3) currentPlaneType = 0;
    if(currentPlaneType < 0) currentPlaneType = 3;
    scene.remove(airplane.mesh);
    createPlane();
    airplane.mesh.position.set(0, 150, 0);    
    airplane.mesh.rotation.set(0.3, 0.5, 0);  
}

function init(event) {
    document.getElementById('gameHUD').style.display = 'none';
    if (!document.getElementById('world')) return;
    createScene();
    createLights();
    createPlane();
    createOrbit();
    createSun();
    createLand();
    createForest();
    createSky();
    createCollectibles();
    ThemeManager.init(); 
    ThemeManager.setGameTheme(); 
    MusicManager.init();

    document.addEventListener('mousemove', handleMouseMove, false);
    document.addEventListener('keydown', handleKeyDown, false);
    document.addEventListener('keyup', handleKeyUp, false);

    var hudMenuBtn = document.getElementById('mainMenuButton');
    if(hudMenuBtn) hudMenuBtn.addEventListener('click', function() { location.reload(); });
    var winFlyBtn = document.getElementById('restartWinButton');
    if(winFlyBtn) winFlyBtn.addEventListener('click', function() { location.reload(); });
    var winMenuBtn = document.getElementById('returnToMenuWin');
    if(winMenuBtn) winMenuBtn.addEventListener('click', function() { location.reload(); });
    var failFlyBtn = document.getElementById('restartButton');
    if(failFlyBtn) failFlyBtn.addEventListener('click', function() { location.reload(); });
    var failMenuBtn = document.getElementById('returnToMenuEnd');
    if(failMenuBtn) failMenuBtn.addEventListener('click', function() { location.reload(); });
    var pauseResumeBtn = document.getElementById('resumeButton');
    if(pauseResumeBtn) pauseResumeBtn.addEventListener('click', function() { togglePause(); });
    var pauseMenuBtn = document.getElementById('returnToMenu');
    if(pauseMenuBtn) pauseMenuBtn.addEventListener('click', function() { location.reload(); });
    document.getElementById('prevPlane').addEventListener('click', function() { cyclePlane(-1); });
    document.getElementById('nextPlane').addEventListener('click', function() { cyclePlane(1); });
    
    var startBtn = document.getElementById('startGameButton');
    if(startBtn) startBtn.addEventListener('click', startGameSequence);
    
    airplane.mesh.position.set(0, 150, 0);   
    airplane.mesh.rotation.set(0.3, 0.5, 0); 
    gameState.started = false;
    gameState.paused = false;
    loop();
}

function startGameSequence() {
    var menuScreen = document.getElementById('mainMenuScreen');
    if(menuScreen) menuScreen.classList.add('hidden');
    airplane.mesh.position.set(-40, 110, -250); 
    airplane.mesh.rotation.set(0, 0, 0);
    document.getElementById('gameHUD').style.display = 'block';
    gameState.started = true;
    gameState.paused = false;
    gameState.score = 0;
    gameState.distance = 0;
    gameState.lives = 3;
    gameState.fuel = 100;
    gameState.gameOver = false;
    gameState.sideScrolling = false;
    gameState.launchComplete = false;
    gameState.scrollSpeed = gameState.baseSpeed; 
    MusicManager.dayTrack.volume = 0.5;
    MusicManager.nightTrack.volume = 0;
    fuelPickups = [];
    obstacles = [];
    airplane.mesh.position.set(-40, 110, -250);
    airplane.mesh.rotation.set(0, 0, 0);
    if(gameBackground) { scene.remove(gameBackground); gameBackground = null; }
    updateHUD();
    MusicManager.play();
}

window.addEventListener('load', init, false);