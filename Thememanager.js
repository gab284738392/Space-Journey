// ThemeManager.js
var ThemeManager = {
    animeSkyMesh: null, 
    currentMode: "menu",
    
    colors: {
        day: { top: new THREE.Color(0x0077ff), bottom: new THREE.Color(0xffffff) },
        night: { top: new THREE.Color(0x000000), bottom: new THREE.Color(0x2c0e3a) }
    },

    init: function() {
        var skyGeo = new THREE.SphereGeometry(4000, 32, 15);
        var skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: [
                "varying vec3 vWorldPosition;",
                "void main() {",
                "  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
                "  vWorldPosition = worldPosition.xyz;",
                "  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
                "}"
            ].join("\n"),
            fragmentShader: [
                "uniform vec3 topColor;",
                "uniform vec3 bottomColor;",
                "uniform float offset;",
                "uniform float exponent;",
                "varying vec3 vWorldPosition;",
                "void main() {",
                "  float h = normalize( vWorldPosition + offset ).y;",
                "  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );",
                "}"
            ].join("\n"),
            side: THREE.BackSide,
            fog: false 
        });
        
        this.animeSkyMesh = new THREE.Mesh(skyGeo, skyMat);
        this.animeSkyMesh.name = "AnimeSky";
        this.animeSkyMesh.visible = false; 
        scene.add(this.animeSkyMesh);
    },

    setMenuTheme: function() {
        this.currentMode = "menu";
        if(this.animeSkyMesh) this.animeSkyMesh.visible = true; 
        scene.fog = new THREE.Fog(0xd6eae6, 100, 950);
        if(renderer) renderer.setClearColor(0xd6eae6, 1);
    },

    setGameTheme: function() {
        this.currentMode = "game";
        if(this.animeSkyMesh) this.animeSkyMesh.visible = true;
        scene.fog = new THREE.Fog(0xd6eae6, 100, 3000); 
        if(renderer) renderer.setClearColor(0xd6eae6, 1); 
    },

    update: function(sunY) {
        if(!this.animeSkyMesh) return;
        var dayRatio = Math.max(0, Math.min(1, (sunY + 200) / 400));
        this.animeSkyMesh.material.uniforms.topColor.value.copy(this.colors.night.top).lerp(this.colors.day.top, dayRatio);
        this.animeSkyMesh.material.uniforms.bottomColor.value.copy(this.colors.night.bottom).lerp(this.colors.day.bottom, dayRatio);

        if(scene.fog) {
            var dayFog = new THREE.Color(0xd6eae6);
            var nightFog = new THREE.Color(0x2c0e3a);
            scene.fog.color.copy(nightFog).lerp(dayFog, dayRatio);
            if(this.currentMode === "menu") {
                scene.fog.far = 950; 
            } else {
                var targetFar = 1500 + (1500 * dayRatio); 
                scene.fog.far = targetFar;
            }
        }
        if(renderer) renderer.setClearColor(scene.fog.color, 1);
    }
};