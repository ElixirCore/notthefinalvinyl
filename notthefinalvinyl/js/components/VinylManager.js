// js/components/VinylManager.js
export default class VinylManager {
    constructor(albumSize) {
        this.albumSize = albumSize;
        this.slideOutDuration = 800;  // Faster duration
        this.slideInDuration = 600;   // Faster duration
        this.slideDistance = this.albumSize * 0.25;
        
        this.currentlyAnimatingAlbums = new Set();
        this.lastPlayingAlbum = null;
    }

    async slideVinylOut(album) {
        if (!album || this.currentlyAnimatingAlbums.has(album)) {
            return;
        }

        // If another vinyl is out, slide it in first
        if (this.lastPlayingAlbum && this.lastPlayingAlbum !== album) {
            await this.slideVinylIn(this.lastPlayingAlbum);
        }

        // Ensure we start from a clean state
        if (album.vinylMesh) {
            album.vinylMesh.visible = true;
            requestAnimationFrame(() => {
                album.setVinylPosition(0);
            });
        }

        this.currentlyAnimatingAlbums.add(album);
        this.lastPlayingAlbum = album;

        return new Promise((resolve) => {
            let startTime = null;
            
            // Set initial state before animation starts
            album.setVinylState({
                isVinylAnimating: true,
                isVinylSpinning: false,
                spinSpeed: 0,
                isVinylOut: false
            });

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const elapsed = (timestamp - startTime) / this.slideOutDuration;
                
                if (elapsed < 1) {
                    // Smooth elastic easing
                    const t = elapsed;
                    const progress = t < 0.5
                        ? 4 * t * t * t
                        : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    
                    const currentPosition = this.slideDistance * progress;
                    album.setVinylPosition(currentPosition);
                    
                    requestAnimationFrame(animate);
                } else {
                    album.setVinylPosition(this.slideDistance);
                    this.currentlyAnimatingAlbums.delete(album);
                    
                    // Slight delay before setting final state
                    setTimeout(() => {
                        album.setVinylState({
                            isVinylAnimating: false,
                            isVinylOut: true,
                            isVinylSpinning: true,
                            spinSpeed: 0
                        });
                        resolve();
                    }, 50);
                }
            };

            requestAnimationFrame(animate);
        });
    }

    async slideVinylIn(album) {
        if (!album || this.currentlyAnimatingAlbums.has(album) || !album.isVinylOut()) {
            return;
        }

        this.currentlyAnimatingAlbums.add(album);
        if (this.lastPlayingAlbum === album) {
            this.lastPlayingAlbum = null;
        }

        return new Promise((resolve) => {
            let startTime = null;
            const startPosition = album.getVinylPosition();

            album.setVinylState({
                isVinylAnimating: true,
                isVinylSpinning: false
            });

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const elapsed = (timestamp - startTime) / this.slideInDuration;
                
                if (elapsed < 1) {
                    // Smooth easing
                    const progress = 1 - Math.pow(1 - elapsed, 4);
                    const currentPosition = startPosition * (1 - progress);
                    album.setVinylPosition(currentPosition);
                    
                    requestAnimationFrame(animate);
                } else {
                    album.setVinylPosition(0);
                    this.currentlyAnimatingAlbums.delete(album);
                    
                    album.setVinylState({
                        isVinylAnimating: false,
                        isVinylOut: false,
                        isVinylSpinning: false,
                        spinSpeed: 0
                    });
                    
                    if (album.vinylMesh) {
                        album.vinylMesh.visible = false;
                    }
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    updateVinyl(album) {
        if (album) {
            album.update();
        }
    }

    resetVinyl(album) {
        if (album && album.isVinylOut()) {
            return this.slideVinylIn(album);
        }
    }

    async resetAllVinyls(albums) {
        if (!albums) return;
        
        for (const album of albums) {
            if (album && album.isVinylOut()) {
                await this.slideVinylIn(album);
            }
        }
        this.lastPlayingAlbum = null;
    }

    stopAllSpinning(albums) {
        if (!albums) return;

        albums.forEach(album => {
            if (album && album.isVinylSpinning()) {
                album.setVinylState({
                    isVinylSpinning: false,
                    spinSpeed: 0
                });
            }
        });
    }
}