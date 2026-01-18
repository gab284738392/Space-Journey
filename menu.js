// Menu Page JavaScript - 3D animated background
var scene, camera, renderer, container;
var land, sky, orbit, sun, airplane;
var mousePos = {x:0, y:0};

// Initialize 3D scene for menu
function initMenu() {
	var HEIGHT = window.innerHeight;
	var WIDTH = window.innerWidth;
	
	scene = new THREE.Scene();
	scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
	
	var aspectRatio = WIDTH / HEIGHT;
	camera = new THREE.PerspectiveCamera(60, aspectRatio, 1, 10000);
	camera.position.set(0, 150, 100);
	
	renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
	renderer.setSize(WIDTH, HEIGHT);
	renderer.shadowMap.enabled = true;
	
	container = document.getElementById('world');
	container.appendChild(renderer.domElement);
	
	// Lights
	var hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, .9);
	var shadowLight = new THREE.DirectionalLight(0xffffff, .9);
	shadowLight.position.set(0, 350, 350);
	shadowLight.castShadow = true;
	scene.add(hemisphereLight, shadowLight);
	
	// Create world elements
	createMenuWorld();
	
	// Event listeners
	document.addEventListener('mousemove', handleMouseMove, false);
	window.addEventListener('resize', handleResize, false);
	
	// Menu navigation
	document.getElementById('startGameButton').addEventListener('click', function() {
		window.location.href = 'game.html';
	});
	
	document.getElementById('aboutButton').addEventListener('click', function() {
		document.getElementById('mainMenuScreen').classList.add('hidden');
		document.getElementById('aboutScreen').classList.remove('hidden');
	});
	
	document.getElementById('creditsButton').addEventListener('click', function() {
		document.getElementById('mainMenuScreen').classList.add('hidden');
		document.getElementById('creditsScreen').classList.remove('hidden');
	});
	
	document.getElementById('backFromAbout').addEventListener('click', function() {
		document.getElementById('aboutScreen').classList.add('hidden');
		document.getElementById('mainMenuScreen').classList.remove('hidden');
	});
	
	document.getElementById('backFromCredits').addEventListener('click', function() {
		document.getElementById('creditsScreen').classList.add('hidden');
		document.getElementById('mainMenuScreen').classList.remove('hidden');
	});
	
	// Start animation
	animate();
}
// In menu.js
const menuMusic = new Audio('Day.mp3'); // Or whichever track you want for the menu
	menuMusic.loop = true;
	menuMusic.volume = 0.5; // Adjust volume (0.0 to 1.0)

	function playMenuMusic() {
    	// Try to play
    	var promise = menuMusic.play();

    	if (promise !== undefined) {
        	promise.catch(error => {
           		// Auto-play was prevented.
            	// We need to wait for a user interaction to trigger playback.
            	console.log("Autoplay prevented. Waiting for click.");
            	enableAudioOnClick();
        	});
    	}
	}

	function enableAudioOnClick() {
    	// Add a one-time event listener to the whole document
    	document.addEventListener('click', function() {
        	menuMusic.play();
        	// Remove the listener so it doesn't fire on every click
    }, { once: true });
}

// Initialize when the page loads
window.addEventListener('DOMContentLoaded', playMenuMusic);

function createMenuWorld() {
	// Land
	var geomLand = new THREE.CylinderGeometry(600, 600, 1700, 40, 10);
	geomLand.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	var matLand = new THREE.MeshPhongMaterial({color: 0x7EC850, shading: THREE.FlatShading});
	land = new THREE.Mesh(geomLand, matLand);
	land.receiveShadow = true;
	land.position.y = -600;
	scene.add(land);
	
	// Sun
	var geomSun = new THREE.SphereGeometry(400, 20, 10);
	var matSun = new THREE.MeshPhongMaterial({color: 0xedeb27, shading: THREE.SmoothShading});
	sun = new THREE.Mesh(geomSun, matSun);
	sun.position.set(0, -30, -850);
	scene.add(sun);
	
	// Airplane (simple)
	var geomPlane = new THREE.BoxGeometry(80, 50, 50);
	var matPlane = new THREE.MeshPhongMaterial({color: 0xf25346, shading: THREE.FlatShading});
	airplane = new THREE.Mesh(geomPlane, matPlane);
	airplane.position.set(-40, 110, -250);
	airplane.castShadow = true;
	scene.add(airplane);
}

function animate() {
	requestAnimationFrame(animate);
	
	// Rotate world
	if(land) land.rotation.z += 0.005;
	if(sun) sun.position.y = -30 - (500 * Math.sin(0.0001 * Date.now()));
	
	// Move plane with mouse
	if(airplane && mousePos) {
		var targetY = 100 + (mousePos.y + 0.75) * 125;
		var targetX = (mousePos.x * 300);
		airplane.position.y += (targetY - airplane.position.y) * 0.1;
		airplane.position.x += (targetX - airplane.position.x) * 0.1;
	}
	
	// Change background based on sun
	if(sun && container) {
		var yPos = sun.position.y;
		var bgColor = 'rgb(' + Math.round(Math.max(yPos/3,70)) + ', ' + Math.round(Math.max(yPos/3,70)) + ', ' + Math.round(Math.max(yPos,150)) + ')';
		container.style.backgroundColor = bgColor;
	}
	
	renderer.render(scene, camera);
}

function handleMouseMove(event) {
	var WIDTH = window.innerWidth;
	var HEIGHT = window.innerHeight;
	mousePos.x = -1 + (event.clientX / WIDTH) * 2;
	mousePos.y = 1 - (event.clientY / HEIGHT) * 2;
}

function handleResize() {
	var HEIGHT = window.innerHeight;
	var WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}

// Start menu when page loads
window.addEventListener('load', initMenu, false);
