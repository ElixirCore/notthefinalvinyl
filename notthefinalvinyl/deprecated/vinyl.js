class VinylManager {
    constructor(albumSize) {
        this.albumSize = albumSize;
        this.loader = new THREE.TextureLoader();
    }

    createAlbumWithVinyl(album, index, currentIndex, scene, callback) {
        const artworkPath = `artwork/${album.artist.replace(/[^a-zA-Z0-9]/g, '_')}_${album.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
        const group = new THREE.Group();
        
        this.loader.load(
            artworkPath,
            (texture) => {
                // Create vinyl first
                const vinylGeometry = new THREE.CircleGeometry(this.albumSize/2, 32);
                this.loader.load('./assets/vinyl.png', (vinylTexture) => {
                    const vinylMaterial = new THREE.MeshBasicMaterial({
                        map: vinylTexture,
                        transparent: true,
                        side: THREE.DoubleSide,
                        depthTest: true,
                        depthWrite: true
                    });
                    
                    const vinylMesh = new THREE.Mesh(vinylGeometry, vinylMaterial);
                    vinylMesh.position.z = -5;
                    vinylMesh.visible = true;
                    group.add(vinylMesh);
                    
                    // Create album cover
                    const albumGeometry = new THREE.PlaneGeometry(this.albumSize, this.albumSize);
                    const albumMaterial = new THREE.MeshBasicMaterial({
                        map: texture,
                        side: THREE.DoubleSide,
                        depthTest: true,
                        depthWrite: true
                    });
                    
                    const albumMesh = new THREE.Mesh(albumGeometry, albumMaterial);
                    albumMesh.position.z = 0;
                    group.add(albumMesh);
                    
                    // Store album data and vinyl state in userData
                    group.userData = {
                        album: album,
                        originalIndex: index,
                        albumMesh: albumMesh,
                        vinyl: {
                            mesh: vinylMesh,
                            isOut: false,
                            isAnimating: false,
                            isSpinning: false
                        }
                    };
                    
                    scene.add(group);
                    if (callback) callback(group);
                });
            },
            undefined,
            (error) => {
                console.error('Error loading texture:', error);
                if (callback) callback(null);
            }
        );
        
        return group;
    }

    slideVinylOut(group) {
        const vinyl = group.userData.vinyl;
        if (!vinyl || vinyl.isAnimating || vinyl.isOut) return;

        vinyl.isAnimating = true;
        vinyl.isSpinning = true;
        
        const startX = vinyl.mesh.position.x;
        const targetX = this.albumSize/2;
        const startTime = Date.now();
        const duration = 1000;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Cubic easing out
            const eased = 1 - Math.pow(1 - progress, 3);
            vinyl.mesh.position.x = startX + (targetX - startX) * eased;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                vinyl.isAnimating = false;
                vinyl.isOut = true;
            }
        };

        animate();
    }

    slideVinylIn(group) {
        const vinyl = group.userData.vinyl;
        if (!vinyl || vinyl.isAnimating || !vinyl.isOut) return;

        vinyl.isAnimating = true;
        
        const startX = vinyl.mesh.position.x;
        const targetX = 0;
        const startTime = Date.now();
        const duration = 800;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Cubic easing in
            const eased = progress * progress * progress;
            vinyl.mesh.position.x = startX + (targetX - startX) * eased;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                vinyl.isAnimating = false;
                vinyl.isOut = false;
                vinyl.isSpinning = false;
            }
        };

        animate();
    }

    updateVinyl(group) {
        if (group.userData.vinyl && group.userData.vinyl.isSpinning) {
            group.userData.vinyl.mesh.rotation.z += 0.02;
        }
    }

    resetVinyl(group) {
        if (group.userData.vinyl && group.userData.vinyl.isOut) {
            this.slideVinylIn(group);
        }
    }
}

// Export the class for use in app.js
export default VinylManager;