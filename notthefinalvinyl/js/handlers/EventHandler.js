// js/handlers/EventHandler.js
export default class EventHandler {
    constructor(gallery) {
        if (!gallery) {
            console.error('Gallery instance not provided to EventHandler');
            return;
        }
        
        // Store gallery reference
        this._gallery = gallery;
        this._sceneManager = gallery.getSceneManager();
        this._navigation = gallery.getNavigation();
        
        // Touch handling state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.touchCooldown = 250;
        this.lastTouchTime = 0;
        this.touchMoved = false;

        // Wheel handling state
        this.wheelCooldown = 250;
        this.lastWheelTime = 0;

        // Track last hovered album
        this.lastHoveredAlbumIndex = null;

        // Bind methods to preserve context
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleResize = this.handleResize.bind(this);

        this.setupEventListeners();
    }

    // Getters to ensure we always have references
    get gallery() {
        if (!this._gallery) {
            console.error('Gallery reference lost');
        }
        return this._gallery;
    }

    get sceneManager() {
        return this._sceneManager;
    }

    get navigation() {
        return this._navigation;
    }

    setupEventListeners() {
        // Mouse events
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('click', this.handleClick);
        
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown);
        
        // Touch events
        window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
        window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        
        // Wheel/scroll events
        window.addEventListener('wheel', this.handleWheel, { passive: false });
        
        // Window events
        window.addEventListener('resize', this.handleResize);
    }

    handleMouseMove(event) {
        if (!this.sceneManager || !this.gallery?.albums) return;
        
        this.sceneManager.updateMousePosition(event);
        
        const intersects = this.sceneManager.raycast(
            this.gallery.albums
                .filter(album => album.getGroup().visible)
                .map(album => album.getGroup())
        );
        
        if (intersects.length > 0) {
            const hoveredMesh = intersects[0].object;
            const group = hoveredMesh.parent;
            
            if (group && group.userData && group.userData.originalIndex !== undefined) {
                const hoveredAlbumIndex = group.userData.originalIndex;
                
                if (this.lastHoveredAlbumIndex !== hoveredAlbumIndex) {
                    this.lastHoveredAlbumIndex = hoveredAlbumIndex;
                    const album = this.gallery.albums[hoveredAlbumIndex];
                    if (album) {
                        // Check if this is the currently playing album
                        const isPlaying = album.isVinylOut();
                        this.gallery.getInfoDisplay()?.showAlbumInfo(album.getData(), isPlaying);
                    }
                }
            }
        } else {
            this.lastHoveredAlbumIndex = null;
        }
    }

    handleClick(event) {
        this.handleInteraction(event.clientX, event.clientY);
    }

    handleTouchStart(event) {
        this.touchMoved = false;
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
        this.touchStartTime = Date.now();
    }

    handleTouchMove(event) {
        if (!this.touchMoved) {
            const deltaX = Math.abs(event.touches[0].clientX - this.touchStartX);
            const deltaY = Math.abs(event.touches[0].clientY - this.touchStartY);
            if (deltaX > 10 || deltaY > 10) {
                this.touchMoved = true;
            }
        }
    }

    handleTouchEnd(event) {
        const now = Date.now();
        const touchDuration = now - this.touchStartTime;
        
        // If it's a quick tap without much movement
        if (!this.touchMoved && touchDuration < 300) {
            event.preventDefault(); // Prevent default only for taps
            this.handleInteraction(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
        }
        // Handle swipe navigation
        else if (this.touchMoved && this.navigation) {
            const touchEndX = event.changedTouches[0].clientX;
            const touchDistance = touchEndX - this.touchStartX;

            if (Math.abs(touchDistance) > 50) {
                this.navigation.navigate(touchDistance < 0 ? 1 : -1);
                this.lastTouchTime = now;
            }
        }
    }

    handleInteraction(clientX, clientY) {
        if (!this.gallery?.albums) {
            console.error('Gallery or albums not available');
            return;
        }

        const renderer = this.sceneManager?.getRenderer();
        if (!renderer) {
            console.error('Renderer not available');
            return;
        }

        // Convert coordinates
        const rect = renderer.domElement.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((clientY - rect.top) / rect.height) * 2 + 1;
        
        this.sceneManager.updateMousePosition({ clientX, clientY });
        
        const visibleAlbums = this.gallery.albums
            .filter(album => album.getGroup().visible)
            .map(album => album.getGroup());
            
        const intersects = this.sceneManager.raycast(visibleAlbums);

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const group = clickedMesh.parent;
            const clickedIndex = group.userData.originalIndex;
            
            if (clickedIndex !== this.gallery.currentIndex) {
                this.navigation?.navigateToIndex(clickedIndex);
            } else {
                const album = this.gallery.getCurrentAlbum();
                if (album && !album.isVinylOut()) {
                    const infoDisplay = this.gallery.getInfoDisplay();
                    const vinylManager = this.gallery.getVinylManager();
                    
                    if (infoDisplay) {
                        infoDisplay.showEmbed(album.getData());
                    }
                    if (vinylManager) {
                        vinylManager.slideVinylOut(album);
                    }
                }
            }
        }
    }

    handleKeyDown(event) {
        if (!this.navigation) return;

        switch (event.key) {
            case 'ArrowRight':
                event.preventDefault();
                this.navigation.navigate(1);
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.navigation.navigate(-1);
                break;
            case 'Escape':
                event.preventDefault();
                this.handleCloseEmbed();
                break;
        }
    }

    handleWheel(event) {
        if (!this.navigation) return;
        
        event.preventDefault();
        
        const now = Date.now();
        if (now - this.lastWheelTime < this.wheelCooldown) {
            return;
        }
        
        this.lastWheelTime = now;
        
        // If it's primarily a horizontal scroll
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
            this.navigation.navigate(event.deltaX > 0 ? 1 : -1);
        } else {
            // Keep the existing vertical scroll behavior
            this.navigation.navigate(event.deltaY > 0 ? 1 : -1);
        }
    }

    handleResize() {
        if (this.sceneManager) {
            this.sceneManager.onWindowResize();
        }
    }

    handleCloseEmbed() {
        const infoDisplay = this.gallery?.getInfoDisplay();
        if (infoDisplay) {
            infoDisplay.hideEmbed();
            // Stop vinyl animation but don't affect other playback
            const currentAlbum = this.gallery.getCurrentAlbum();
            if (currentAlbum) {
                this.gallery.getVinylManager()?.slideVinylIn(currentAlbum);
            }
        }
    }

    preventDefaultForKeys(event) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
        }
    }

    dispose() {
        // Remove event listeners with bound methods
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('click', this.handleClick);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('touchstart', this.handleTouchStart);
        window.removeEventListener('touchmove', this.handleTouchMove);
        window.removeEventListener('touchend', this.handleTouchEnd);
        window.removeEventListener('wheel', this.handleWheel);
        window.removeEventListener('resize', this.handleResize);
        
        // Clear state
        this.lastHoveredAlbumIndex = null;
        this._gallery = null;
        this._sceneManager = null;
        this._navigation = null;
    }
}