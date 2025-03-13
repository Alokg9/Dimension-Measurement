// Car Service 3D Animations using Three.js
let scene, camera, renderer, car;

// Initialize the 3D scene
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
    renderer.setClearColor(0x000000, 0);
    
    // Add to container
    const container = document.getElementById('car-model-container');
    if (container) {
        container.appendChild(renderer.domElement);
    }

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // Position camera
    camera.position.z = 5;
}

// Create a simple car model
function createCar() {
    const carGroup = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 1);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x6366f1,
        metalness: 0.8,
        roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    carGroup.add(body);

    // Roof
    const roofGeometry = new THREE.BoxGeometry(1.2, 0.4, 0.9);
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
    roof.position.y = 0.45;
    carGroup.add(roof);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32);
    const wheelMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.5
    });

    const wheels = [];
    const wheelPositions = [
        { x: -0.6, y: -0.25, z: 0.5 },
        { x: 0.6, y: -0.25, z: 0.5 },
        { x: -0.6, y: -0.25, z: -0.5 },
        { x: 0.6, y: -0.25, z: -0.5 }
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, pos.y, pos.z);
        wheels.push(wheel);
        carGroup.add(wheel);
    });

    // Windows
    const windowMaterial = new THREE.MeshPhongMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.5,
        metalness: 0.8,
        roughness: 0.2
    });

    // Windshield
    const windshieldGeometry = new THREE.PlaneGeometry(0.8, 0.4);
    const windshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
    windshield.rotation.x = Math.PI / 6;
    windshield.position.set(0.3, 0.4, 0);
    carGroup.add(windshield);

    // Add details (lights, grille)
    const detailMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    });

    // Headlights
    const headlightGeometry = new THREE.CircleGeometry(0.1, 16);
    const leftHeadlight = new THREE.Mesh(headlightGeometry, detailMaterial);
    const rightHeadlight = new THREE.Mesh(headlightGeometry, detailMaterial);
    
    leftHeadlight.position.set(1, 0, 0.3);
    rightHeadlight.position.set(1, 0, -0.3);
    
    carGroup.add(leftHeadlight);
    carGroup.add(rightHeadlight);

    return carGroup;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (car) {
        // Rotate car
        car.rotation.y += 0.01;

        // Add floating animation
        car.position.y = Math.sin(Date.now() * 0.001) * 0.1;
    }

    renderer.render(scene, camera);
}

// Service animation states
const serviceAnimations = {
    engineCheck: {
        start: function() {
            if (car) {
                // Highlight engine area
                const engineGlow = new THREE.PointLight(0xff0000, 1, 2);
                engineGlow.position.set(0.5, 0, 0);
                car.add(engineGlow);
                
                // Animate engine check
                const engineCheck = gsap.to(engineGlow, {
                    intensity: 0.5,
                    duration: 1,
                    repeat: -1,
                    yoyo: true
                });

                return engineGlow;
            }
        },
        stop: function(light) {
            if (light) {
                car.remove(light);
            }
        }
    },
    
    wheelService: {
        start: function() {
            if (car) {
                // Animate wheels
                car.children.forEach(child => {
                    if (child.geometry instanceof THREE.CylinderGeometry) {
                        gsap.to(child.rotation, {
                            x: Math.PI * 2,
                            duration: 1,
                            repeat: -1,
                            ease: "linear"
                        });
                    }
                });
            }
        },
        stop: function() {
            car.children.forEach(child => {
                if (child.geometry instanceof THREE.CylinderGeometry) {
                    gsap.killTweensOf(child.rotation);
                    child.rotation.x = 0;
                }
            });
        }
    },
    
    paintJob: {
        start: function() {
            if (car) {
                // Change car color gradually
                const bodyMaterial = car.children[0].material;
                gsap.to(bodyMaterial.color, {
                    r: Math.random(),
                    g: Math.random(),
                    b: Math.random(),
                    duration: 2,
                    repeat: -1,
                    yoyo: true
                });
            }
        },
        stop: function() {
            const bodyMaterial = car.children[0].material;
            gsap.killTweensOf(bodyMaterial.color);
            bodyMaterial.color.setHex(0x6366f1);
        }
    }
};

// Initialize scene
function initCarScene() {
    init();
    car = createCar();
    scene.add(car);
    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
    });

    return {
        startAnimation: function(animationName) {
            if (serviceAnimations[animationName]) {
                return serviceAnimations[animationName].start();
            }
        },
        stopAnimation: function(animationName, element) {
            if (serviceAnimations[animationName]) {
                serviceAnimations[animationName].stop(element);
            }
        }
    };
}

// Export for use in other files
window.CarAnimations = {
    init: initCarScene
};
