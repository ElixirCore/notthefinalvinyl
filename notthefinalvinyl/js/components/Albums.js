import { TextureLoader, Group, CircleGeometry, PlaneGeometry, MeshBasicMaterial, Mesh, DoubleSide, Vector3 } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.162.0/three.module.js';

export default class Album {
    constructor(albumData, index, settings, scene) {
        console.log(`Creating album ${index}: ${albumData.title}`);
        
        this.data = albumData;
        this.index = index;
        this.settings = settings;
        this.scene = scene;
        
        this.group = new Group();
        this.albumMesh = null;
        this.vinylMesh = null;
        this.isLoaded = false;
        
        this.state = {
            isVinylOut: false,
            isVinylAnimating: false,
            isVinylSpinning: false,
            spinSpeed: 0,
            maxSpinSpeed: 0.02,
            isTilting: false,
            currentTilt: new Vector3(0, 0, 0),
            targetTilt: new Vector3(0, 0, 0),
            currentLift: 0,
            targetLift: 0,
            tiltLerpFactor: 0.15,
            isWrapping: false,
            currentVinylPosition: 0,
            targetVinylPosition: 0,
            vinylLerpFactor: 0.1
        };

        this.isCentered = false;
        this.baseRenderOrder = 0;
        
        this.scene.add(this.group);
        this.group.visible = false;

        this.group.userData = {
            album: this.data,
            originalIndex: this.index
        };

        this.init();
    }

    async init() {
        try {
            const artworkPath = `./assets/artwork/${this.data.artist.replace(/[^a-zA-Z0-9]/g, '_')}_${this.data.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
            console.log(`Loading album ${this.index}: ${this.data.title}`);

            const [albumTexture, vinylTexture] = await Promise.all([
                this.loadAlbumTexture(),
                this.loadVinylTexture()
            ]);

            await this.createVinyl(vinylTexture);
            await this.createCover(albumTexture);
            
            this.isLoaded = true;
            this.group.visible = false;
            
            console.log(`Initialized album ${this.index}: ${this.data.title}`);
            return true;
        } catch (error) {
            console.error(`Failed to initialize album ${this.index}: ${this.data.title}`, error);
            return false;
        }
    }

    loadAlbumTexture() {
        return new Promise((resolve, reject) => {
            const loader = new TextureLoader();
            const artworkPath = `./assets/artwork/${this.data.artist.replace(/[^a-zA-Z0-9]/g, '_')}_${this.data.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
            
            loader.load(
                artworkPath,
                texture => resolve(texture),
                undefined,
                error => reject(error)
            );
        });
    }

    loadVinylTexture() {
        return new Promise((resolve, reject) => {
            const loader = new TextureLoader();
            loader.load(
                './assets/images/vinyl.png',
                texture => resolve(texture),
                undefined,
                error => reject(error)
            );
        });
    }

    async createVinyl(vinylTexture) {
        const vinylGeometry = new CircleGeometry(this.settings.albumSize/2, 32);
        const vinylMaterial = new MeshBasicMaterial({
            map: vinylTexture,
            transparent: true,
            side: DoubleSide,
            depthTest: true,
            depthWrite: true
        });
        
        this.vinylMesh = new Mesh(vinylGeometry, vinylMaterial);
        this.vinylMesh.position.set(0, 0, -0.1);
        this.vinylMesh.visible = false;
        this.group.add(this.vinylMesh);
    }

    async createCover(albumTexture) {
        const albumGeometry = new PlaneGeometry(this.settings.albumSize, this.settings.albumSize);
        const albumMaterial = new MeshBasicMaterial({
            map: albumTexture,
            side: DoubleSide,
            transparent: true
        });
        
        this.albumMesh = new Mesh(albumGeometry, albumMaterial);
        this.albumMesh.position.z = 0;
        this.group.add(this.albumMesh);
    }

    update() {
        if (this.vinylMesh) {
            if (this.state.isVinylSpinning) {
                if (this.state.spinSpeed < this.state.maxSpinSpeed) {
                    this.state.spinSpeed = Math.min(
                        this.state.maxSpinSpeed,
                        this.state.spinSpeed + 0.001
                    );
                }
                this.vinylMesh.rotation.z += this.state.spinSpeed;
            } else if (this.state.spinSpeed > 0) {
                this.state.spinSpeed = Math.max(0, this.state.spinSpeed - 0.002);
                this.vinylMesh.rotation.z += this.state.spinSpeed;
            }

            if (this.state.isVinylAnimating) {
                const positionDiff = this.state.targetVinylPosition - this.state.currentVinylPosition;
                if (Math.abs(positionDiff) > 0.001) {
                    this.state.currentVinylPosition += positionDiff * this.state.vinylLerpFactor;
                    this.vinylMesh.position.x = this.state.currentVinylPosition;
                    this.vinylMesh.position.z = this.state.currentVinylPosition > 0 ? -0.1 : -0.1;
                } else {
                    this.state.isVinylAnimating = false;
                    this.state.currentVinylPosition = this.state.targetVinylPosition;
                    this.vinylMesh.position.x = this.state.targetVinylPosition;
                }
            }
        }

        if (this.state.isTilting) {
            const tiltDiff = this.state.targetTilt.clone().sub(this.state.currentTilt);
            if (tiltDiff.length() > 0.001) {
                this.state.currentTilt.add(tiltDiff.multiplyScalar(this.state.tiltLerpFactor));
                this.group.rotation.set(
                    this.state.currentTilt.x,
                    this.state.currentTilt.y,
                    this.state.currentTilt.z
                );
                this.group.position.y = this.state.currentLift;
            } else {
                this.state.isTilting = false;
            }
        }
    }

    setTilt(active) {
        if (active) {
            this.state.targetTilt.set(-0.2, 0.3, 0.1);
            this.state.targetLift = 20;
        } else {
            this.state.targetTilt.set(0, 0, 0);
            this.state.targetLift = 0;
        }
        this.state.isTilting = true;
    }

    resetTilt() {
        this.setTilt(false);
    }

    setPosition(x, y, z) {
        if (this.group) {
            // If the position is far from center, just hide immediately
            const distanceFromCenter = Math.abs(x);
            const visibilityThreshold = (this.settings.albumSize + this.settings.padding) * 3;
            
            if (distanceFromCenter > visibilityThreshold) {
                this.hide();
                return;
            }
            
            const finalY = y + this.state.currentLift;
            this.group.position.set(x, finalY, z);
        }
    }

    setScale(scale) {
        if (this.group) {
            this.group.scale.set(scale, scale, 1);
        }
    }

    setCentered(isCentered) {
        this.isCentered = isCentered;
        this.updateRenderOrder(this.baseRenderOrder);
    }
    setWrapping(isWrapping) {
        if (this.state.isWrapping !== isWrapping) {
            this.state.isWrapping = isWrapping;
            if (isWrapping) {
                this.hide();
                // Reset position instantly when wrapping
                if (this.group) {
                    const currentPos = this.group.position;
                    // If moving left to right, place far left, if right to left, place far right
                    const direction = this.group.position.x > 0 ? -1 : 1;
                    const totalWidth = this.settings.albumSize * this.settings.visibleAlbums;
                    this.setPosition(direction * totalWidth, currentPos.y, currentPos.z);
                }
            }
        }
    }
    setRenderOrder(order) {
        this.baseRenderOrder = order;
        this.updateRenderOrder(order);
    }

    updateRenderOrder(order) {
        if (this.group) {
            if (this.isCentered) {
                this.group.renderOrder = order + 2;
                if (this.albumMesh) {
                    this.albumMesh.renderOrder = order + 3;
                }
                if (this.vinylMesh) {
                    this.vinylMesh.renderOrder = order + 1;
                }
            } else {
                this.group.renderOrder = order;
                if (this.albumMesh) {
                    this.albumMesh.renderOrder = order;
                }
                if (this.vinylMesh) {
                    this.vinylMesh.renderOrder = order - 1;
                }
            }
        }
    }

    setVinylState(state) {
        Object.assign(this.state, state);
        if (this.vinylMesh) {
            this.vinylMesh.visible = !this.state.isWrapping && this.group.visible;
        }
        this.updateRenderOrder(this.baseRenderOrder);
    }

    setVinylPosition(x) {
        if (this.vinylMesh) {
            this.state.targetVinylPosition = x;
            this.state.isVinylAnimating = true;
            this.vinylMesh.visible = !this.state.isWrapping && this.group.visible;
        }
    }

    getVinylPosition() {
        return this.state.currentVinylPosition;
    }

    isVinylOut() {
        return this.state.isVinylOut;
    }

    isVinylAnimating() {
        return this.state.isVinylAnimating;
    }

    isVinylSpinning() {
        return this.state.isVinylSpinning;
    }

    show() {
        if (!this.state.isWrapping) {
            this.group.visible = true;
            if (this.vinylMesh) {
                this.vinylMesh.visible = this.state.isVinylOut;
            }
        }
    }

    hide() {
        this.group.visible = false;
        if (this.vinylMesh) {
            this.vinylMesh.visible = false;
        }
    }

    dispose() {
        if (this.albumMesh) {
            this.albumMesh.geometry.dispose();
            this.albumMesh.material.dispose();
        }
        if (this.vinylMesh) {
            this.vinylMesh.geometry.dispose();
            this.vinylMesh.material.dispose();
        }
        if (this.group) {
            this.scene.remove(this.group);
        }
    }

    getGroup() {
        return this.group;
    }

    getData() {
        return this.data;
    }

    getIndex() {
        return this.index;
    }
}