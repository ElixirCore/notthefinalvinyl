export default class AlbumGallery {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(
            window.innerWidth / -2,
            window.innerWidth / 2,
            window.innerHeight / 2,
            window.innerHeight / -2,
            0.1,
            2000
        );
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#canvas'),
            antialias: true
        });
        
        this.albums = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.loadedCount = 0;
        this.totalToLoad = 0;
        
        // Display settings
        this.albumSize = 200;
        this.padding = 40;
        this.visibleAlbums = 5;
        this.currentIndex = 0;
        this.isAnimating = false;
        
        // Scale factors
        this.normalScale = 1.0;
        this.focusedScale = 1.5;
        
        // Camera setup
        this.camera.position.z = 1000;
        
        // Navigation cooldown
        this.lastWheelTime = 0;
        this.wheelCooldown = 250;
        
        // Touch handling
        this.touchStartX = 0;
        this.touchStartTime = 0;
        
        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);
        this.renderer.sortObjects = true;
        
        this.setupEvents();
        this.loadAlbums();
        this.animate();
    }

    setupEvents() {
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('click', (e) => this.onClick(e));
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                this.navigateAlbums(e.key === 'ArrowRight' ? 1 : -1);
            }
        });
        
        // Improved wheel handling
        window.addEventListener('wheel', (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - this.lastWheelTime > this.wheelCooldown) {
                this.lastWheelTime = now;
                this.navigateAlbums(e.deltaY > 0 ? 1 : -1);
            }
        }, { passive: false });

        // Touch events
        window.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartTime = Date.now();
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - this.touchStartTime;
            const touchDistance = touchEndX - this.touchStartX;

            if (touchDuration < 300 && Math.abs(touchDistance) > 50) {
                this.navigateAlbums(touchDistance < 0 ? 1 : -1);
            }
        }, { passive: true });
    }

    async loadAlbums() {
        try {
            const response = await fetch('releases.json');
            const albums = await response.json();
            
            this.totalToLoad = albums.length * 2;
            
            albums.forEach((album, index) => {
                this.createAlbumWithVinyl(album, index);
            });
        } catch (error) {
            console.error('Error loading albums:', error);
            this.hideSplash();
        }
    }

    createAlbumWithVinyl(album, index) {
        const loader = new THREE.TextureLoader();
        const artworkPath = `artwork/${album.artist.replace(/[^a-zA-Z0-9]/g, '_')}_${album.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
        
        const group = new THREE.Group();
        
        loader.load(
            artworkPath,
            (texture) => {
                // Create vinyl first
                const vinylGeometry = new THREE.CircleGeometry(this.albumSize/2, 32);
                loader.load('./assets/vinyl.png', (vinylTexture) => {
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
                    
                    group.position.set(
                        (index - this.currentIndex) * (this.albumSize + this.padding),
                        0,
                        0
                    );
                    
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
                    
                    this.loadedCount += 2;
                    if (this.loadedCount >= this.totalToLoad) {
                        this.onLoadComplete();
                        this.updatePositions(true);
                        this.showCenterAlbumInfo();
                    }
                    
                    this.scene.add(group);
                    this.albums.push(group);
                });
            },
            undefined,
            (error) => {
                console.error('Error loading texture:', error);
                this.loadedCount += 2;
                if (this.loadedCount >= this.totalToLoad) {
                    this.onLoadComplete();
                }
            }
        );
    }

    updatePositions(immediate = false) {
        const totalAlbums = this.albums.length;
        this.albums.forEach((group, arrayIndex) => {
            let distanceFromCenter = ((arrayIndex - this.currentIndex + totalAlbums) % totalAlbums);
            if (distanceFromCenter > totalAlbums/2) {
                distanceFromCenter -= totalAlbums;
            }
            
            const targetX = distanceFromCenter * (this.albumSize + this.padding);
            const isNearby = Math.abs(distanceFromCenter) <= Math.floor(this.visibleAlbums / 2);
            group.visible = isNearby;
            
            if (!isNearby) return;
            
            const isCentered = distanceFromCenter === 0;
            const targetScale = isCentered ? this.focusedScale : this.normalScale;
            
            if (immediate) {
                group.position.x = targetX;
                group.scale.set(targetScale, targetScale, 1);
            } else {
                group.position.lerp(new THREE.Vector3(targetX, 0, 0), 0.1);
                group.scale.lerp(new THREE.Vector3(targetScale, targetScale, 1), 0.1);
            }

            if (isCentered) {
                this.showAlbumInfo(group.userData.album);
            }
        });
    }

    navigateAlbums(direction) {
        if (this.isAnimating) return;
        
        const totalAlbums = this.albums.length;
        this.currentIndex = (this.currentIndex + direction + totalAlbums) % totalAlbums;
        this.isAnimating = true;
        
        // Hide vinyl from current album if it's out
        this.albums.forEach(group => {
            if (group.userData.vinyl && group.userData.vinyl.isOut) {
                this.slideVinylIn(group);
            }
        });
        
        this.showCenterAlbumInfo();
        
        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
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

    showCenterAlbumInfo() {
        const centerAlbum = this.albums[this.currentIndex];
        if (centerAlbum) {
            this.showAlbumInfo(centerAlbum.userData.album);
        }
    }

    showEmbed(album) {
        if (window.albumEmbeds && window.albumEmbeds[album.title]) {
            const container = document.getElementById('embed-container');
            const content = container.querySelector('.embed-content');
            const embedData = window.albumEmbeds[album.title];
            
            content.innerHTML = `<iframe style="border: 0; width: 100%; height: 120px;" 
                src="${embedData.url}" 
                seamless></iframe>`;
                
            container.classList.add('visible');
        }
    }

    showAlbumInfo(album) {
        const info = document.getElementById('info');
        info.querySelector('.album-title').textContent = album.title;
        info.querySelector('.artist').textContent = album.artist;
        
        // Calculate total album length
        let totalSeconds = 0;
        if (album.tracks) {
            album.tracks.forEach(track => {
                const [minutes, seconds] = track.duration.split(':').map(Number);
                totalSeconds += (minutes * 60) + seconds;
            });
        }
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        let duration = '';
        if (hours > 0) {
            duration = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            duration = `${minutes}:${String(seconds).padStart(2, '0')}`;
        }
        
        const details = `Length: ${duration}`;
        info.querySelector('.album-details').textContent = details;
        info.classList.add('active');
    }

    showEmbed(album) {
        if (window.albumEmbeds && window.albumEmbeds[album.title]) {
            const container = document.getElementById('embed-container');
            const content = container.querySelector('.embed-content');
            const embedData = window.albumEmbeds[album.title];
            
            // Clear existing content
            content.innerHTML = '';
            
            // Create and append iframe
            const iframe = document.createElement('iframe');
            iframe.style.border = '0';
            iframe.style.width = '100%';
            iframe.style.height = '120px';
            iframe.src = embedData.url;
            iframe.setAttribute('seamless', '');
            
            content.appendChild(iframe);
            container.classList.add('visible');

            // Update close button functionality
            const closeButton = container.querySelector('.close-button');
            if (closeButton) {
                closeButton.onclick = () => container.classList.remove('visible');
            }
        }
    }
    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.albums, true);
        
        if (intersects.length > 0) {
            const hoveredMesh = intersects[0].object;
            const group = hoveredMesh.parent;
            if (group.userData.album) {
                this.showAlbumInfo(group.userData.album);
            }
        }
    }

    onClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.albums, true);

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const group = clickedMesh.parent;
            const clickedIndex = group.userData.originalIndex;
            
            if (clickedIndex !== this.currentIndex) {
                this.navigateAlbums(clickedIndex - this.currentIndex);
            } else {
                const album = group.userData.album;
                this.slideVinylOut(group);
                this.showEmbed(album);
            }
        }
    }

    onLoadComplete() {
        this.hideSplash();
    }

    hideSplash() {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                const instructions = document.querySelector('.instructions');
                if (instructions) {
                    instructions.classList.add('visible');
                }
            }, 1000);
        }
    }

    onWindowResize() {
        this.camera.left = window.innerWidth / -2;
        this.camera.right = window.innerWidth / 2;
        this.camera.top = window.innerHeight / 2;
        this.camera.bottom = window.innerHeight / -2;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update() {
        this.updatePositions();
        
        this.albums.forEach(group => {
            if (group.userData.vinyl && group.userData.vinyl.isSpinning) {
                group.userData.vinyl.mesh.rotation.z += 0.02;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
    }
}