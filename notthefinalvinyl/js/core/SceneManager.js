// js/core/SceneManager.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.162.0/three.module.js';



export default class SceneManager {
    constructor() {
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initRaycaster();
        this.setupResize();
    }

    initScene() {
        this.scene = new THREE.Scene();
    }

    initCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 1000;
        
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            1,
            2000
        );
        this.camera.position.z = 1000;
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#canvas'),
            antialias: true,
            alpha: true
        });
        
        this.renderer.sortObjects = false;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
    }

    initRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    setupResize() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 1000;

        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateMousePosition(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    raycast(objects) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(objects, true);
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    getWorldPosition(x, y, z = 0) {
        const vector = new THREE.Vector3();
        vector.set(
            (x / window.innerWidth) * 2 - 1,
            -(y / window.innerHeight) * 2 + 1,
            z
        );
        vector.unproject(this.camera);
        return vector;
    }

    getScreenPosition(worldPosition) {
        const vector = worldPosition.clone();
        vector.project(this.camera);
        
        return {
            x: (vector.x + 1) / 2 * window.innerWidth,
            y: (-vector.y + 1) / 2 * window.innerHeight
        };
    }

    dispose() {
        this.renderer.dispose();
        window.removeEventListener('resize', this.onWindowResize.bind(this));
    }

    getScene() { return this.scene; }
    getCamera() { return this.camera; }
    getRenderer() { return this.renderer; }
    getRaycaster() { return this.raycaster; }
}