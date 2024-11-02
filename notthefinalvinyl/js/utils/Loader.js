import { TextureLoader } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.162.0/three.module.js';

export default class Loader {
    constructor() {
        this.textureLoader = new TextureLoader();
        this.loadingElement = document.getElementById('gallery-loading');
        this.progressBar = this.loadingElement?.querySelector('.progress');
        
        this.totalAssets = 0;
        this.loadedCount = 0;
    }

    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.visibility = 'visible';
            this.loadingElement.classList.add('visible');
            if (this.progressBar) {
                this.progressBar.style.width = '0%';
            }
        }
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.remove('visible');
            setTimeout(() => {
                this.loadingElement.style.visibility = 'hidden';
            }, 300);
        }
    }

    async loadAlbums() {
        const response = await fetch('./data/releases.json');
        const albums = await response.json();
        
        // Set total (all albums + vinyl texture)
        this.totalAssets = albums.length + 1;
        console.log(`Need to load ${this.totalAssets} assets`);
        return albums;
    }

    async loadTexture(path) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                texture => {
                    this.loadedCount++;
                    const percent = (this.loadedCount / this.totalAssets) * 100;
                    
                    if (this.progressBar) {
                        this.progressBar.style.width = `${percent}%`;
                    }

                    if (this.loadedCount >= this.totalAssets) {
                        this.hideLoading();
                    }

                    resolve(texture);
                },
                undefined,
                error => {
                    console.error(`Failed to load texture: ${path}`, error);
                    reject(error);
                }
            );
        });
    }

    async loadAllTextures(albums) {
        const loadedTextures = new Map();
        const promises = [];

        // Load vinyl texture
        promises.push(
            this.loadTexture('./assets/images/vinyl.png')
                .then(texture => loadedTextures.set('vinyl', texture))
                .catch(error => {
                    console.error('Error loading vinyl texture:', error);
                    throw error;
                })
        );

        // Load album artworks
        albums.forEach(album => {
            const path = `./assets/artwork/${album.artist.replace(/[^a-zA-Z0-9]/g, '_')}_${album.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
            promises.push(
                this.loadTexture(path)
                    .then(texture => loadedTextures.set(path, texture))
                    .catch(error => {
                        console.error(`Error loading artwork for ${album.title}:`, error);
                        throw error;
                    })
            );
        });

        try {
            await Promise.all(promises);
            return loadedTextures;
        } catch (error) {
            console.error('Error loading all textures:', error);
            throw error;
        }
    }

    dispose() {
        this.hideLoading();
    }
}

export const loadAlbums = async () => {
    const loader = new Loader();
    return loader.loadAlbums();
};

export const loadTexture = async (path) => {
    const loader = new Loader();
    return loader.loadTexture(path);
};