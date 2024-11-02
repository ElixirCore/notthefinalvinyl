import SceneManager from './SceneManager.js';
import Album from '../components/Albums.js';
import VinylManager from '../components/VinylManager.js';
import EventHandler from '../handlers/EventHandler.js';
import NavigationHandler from '../handlers/NavigationHandler.js';
import InfoDisplay from '../ui/InfoDisplay.js';
import Loader from '../utils/Loader.js';

export default class AlbumGallery {
    constructor() {
        try {
            // Core settings
            this.settings = {
                albumSize: 200,
                padding: 40,
                visibleAlbums: 5,
                normalScale: 1.0,
                focusedScale: 1.5
            };

            // State
            this.albums = [];
            this.currentIndex = 0;
            this.isAnimating = false;
            this.isInitialized = false;
            
            // Initialize core components
            this.initializeComponents();
            
            // Start initialization
            this.init().catch(error => {
                console.error('Failed to initialize gallery:', error);
                this.handleInitError(error);
            });
        } catch (error) {
            console.error('Error in gallery constructor:', error);
            this.handleInitError(error);
        }
    }

    initializeComponents() {
        try {
            // Initialize managers in specific order
            this.sceneManager = new SceneManager();
            if (!this.sceneManager) throw new Error('Failed to initialize SceneManager');

            this.vinylManager = new VinylManager(this.settings.albumSize);
            if (!this.vinylManager) throw new Error('Failed to initialize VinylManager');

            this.navigation = new NavigationHandler(this);
            if (!this.navigation) throw new Error('Failed to initialize NavigationHandler');

            this.eventHandler = new EventHandler(this);
            if (!this.eventHandler) throw new Error('Failed to initialize EventHandler');

            // Pass gallery instance to InfoDisplay
            this.infoDisplay = new InfoDisplay(this);
            if (!this.infoDisplay) throw new Error('Failed to initialize InfoDisplay');

            // Initialize loader
            this.loader = new Loader();
        } catch (error) {
            console.error('Error initializing components:', error);
            throw error;
        }
    }
    
    async init() {
        try {
            // Start loading albums
            const albumsData = await this.loader.loadAlbums();
            if (!albumsData || !Array.isArray(albumsData)) {
                throw new Error('Invalid album data received');
            }

            // Start splash fade out
            this.hideSplash();

            // Show loading bar after short delay to ensure smooth transition
            setTimeout(() => {
                this.loader.showLoading();
            }, 500);
            
            // Create album objects
            const albumCreationPromises = albumsData.map((albumData, index) => {
                try {
                    return new Album(
                        albumData,
                        index,
                        this.settings,
                        this.sceneManager.getScene()
                    );
                } catch (error) {
                    console.error(`Error creating album ${index}:`, error);
                    return null;
                }
            });

            // Wait for all albums to be created
            this.albums = (await Promise.all(albumCreationPromises)).filter(album => album !== null);

            if (this.albums.length === 0) {
                throw new Error('No albums were successfully created');
            }

            // Start loading textures (progress will be tracked by loader)
            await this.loader.loadAllTextures(albumsData);

            // Set up initial positions
            this.navigation.updatePositions(true);
            
            // Mark as initialized and start animation
            this.isInitialized = true;
            this.animate();

            // Show instructions once everything is loaded
            this.showInstructions();
            
        } catch (error) {
            console.error('Failed to initialize gallery:', error);
            this.handleInitError(error);
            throw error;
        }
    }

    animate() {
        try {
            requestAnimationFrame(() => this.animate());
            
            // Update all components
            if (this.navigation) {
                this.navigation.updatePositions();
            }

            if (this.albums && Array.isArray(this.albums)) {
                this.albums.forEach(album => {
                    if (album && album.update) {
                        album.update();
                    }
                    // Only update vinyl if it's animating or spinning
                    if (album && this.vinylManager && 
                        (album.isVinylAnimating() || album.isVinylSpinning())) {
                        this.vinylManager.updateVinyl(album);
                    }
                });
            }
            
            if (this.sceneManager) {
                this.sceneManager.render();
            }
        } catch (error) {
            console.error('Error in animation loop:', error);
        }
    }

    hideSplash() {
        try {
            const splash = document.getElementById('splash');
            if (splash) {
                splash.style.opacity = '0';
                setTimeout(() => {
                    splash.style.display = 'none';
                }, 1000);
            }
        } catch (error) {
            console.error('Error hiding splash screen:', error);
        }
    }

    showInstructions() {
        const instructions = document.querySelector('.instructions');
        if (instructions) {
            instructions.classList.add('visible');
        }
    }

    handleInitError(error) {
        // Show error to user
        const splash = document.getElementById('splash');
        if (splash) {
            splash.innerHTML = `<div class="error">Failed to load gallery. Please try refreshing the page.</div>`;
        }
        
        // Try to clean up any partial initialization
        this.dispose();
    }

    getAlbum(index) {
        if (index < 0 || index >= this.albums.length) {
            console.error('Invalid album index:', index);
            return null;
        }
        return this.albums[index];
    }

    getCurrentAlbum() {
        return this.getAlbum(this.currentIndex);
    }

    setCurrentIndex(index) {
        if (index < 0 || index >= this.albums.length) {
            console.error('Invalid current index:', index);
            return;
        }
        this.currentIndex = index;
    }

    getSettings() {
        return { ...this.settings };
    }

    getSceneManager() {
        return this.sceneManager;
    }

    getVinylManager() {
        return this.vinylManager;
    }

    getInfoDisplay() {
        return this.infoDisplay;
    }

    getNavigation() {
        return this.navigation;
    }

    isAnimating() {
        return this.isAnimating;
    }

    setAnimating(state) {
        this.isAnimating = Boolean(state);
    }

    dispose() {
        try {
            if (this.eventHandler) {
                this.eventHandler.dispose();
            }
            if (this.sceneManager) {
                this.sceneManager.dispose();
            }
            if (this.infoDisplay) {
                this.infoDisplay.dispose();
            }
            if (this.loader) {
                this.loader.dispose();
            }
            
            if (this.albums) {
                this.albums.forEach(album => {
                    if (album && album.dispose) {
                        album.dispose();
                    }
                });
            }
            
            this.albums = [];
            this.sceneManager = null;
            this.vinylManager = null;
            this.navigation = null;
            this.eventHandler = null;
            this.infoDisplay = null;
            this.loader = null;
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}