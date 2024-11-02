// js/handlers/NavigationHandler.js
import { Vector3 } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.162.0/three.module.js';

export default class NavigationHandler {
    constructor(gallery) {
        this.gallery = gallery;
        this.settings = gallery.getSettings();
        this.vinylManager = gallery.getVinylManager();
        
        this.isAnimating = false;
        this.animationDuration = 300;
        this.lastCenteredIndex = null;
        this.albumSpacing = this.settings.albumSize + (this.settings.padding * 4);
        
        this.positionLerpFactor = 0.1;
        this.scaleLerpFactor = 0.1;
        this.baseRenderOrder = 10;
        
        this.lastDirection = 0;
    }

    navigate(direction) {
        if (this.isAnimating) return;
        
        this.lastDirection = direction;
        const totalAlbums = this.gallery.albums.length;
        const newIndex = (this.gallery.currentIndex + direction + totalAlbums) % totalAlbums;
        
        this.navigateToIndex(newIndex);
    }

    navigateToIndex(newIndex) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        const currentAlbum = this.gallery.getCurrentAlbum();
        if (currentAlbum) {
            currentAlbum.resetTilt();
            currentAlbum.setCentered(false);
        }

        this.gallery.setCurrentIndex(newIndex);
        const newCurrentAlbum = this.gallery.getCurrentAlbum();
        this.gallery.getInfoDisplay().showAlbumInfo(newCurrentAlbum.getData());
        
        this.updateRenderOrders(newIndex);
        
        setTimeout(() => {
            this.isAnimating = false;
            if (newCurrentAlbum) {
                newCurrentAlbum.setCentered(true);
                newCurrentAlbum.setTilt(true);
                newCurrentAlbum.setWrapping(false);
            }
        }, this.animationDuration);
    }

    updatePositions(immediate = false) {
        const totalAlbums = this.gallery.albums.length;
        const currentIndex = this.gallery.currentIndex;
        
        this.updateRenderOrders(currentIndex);
        
        this.gallery.albums.forEach((album, arrayIndex) => {
            let distanceFromCenter = ((arrayIndex - currentIndex + totalAlbums) % totalAlbums);
            if (distanceFromCenter > totalAlbums/2) {
                distanceFromCenter -= totalAlbums;
            }
            
            const targetX = distanceFromCenter * this.albumSpacing;
            const isNearby = Math.abs(distanceFromCenter) <= Math.floor(this.settings.visibleAlbums / 2);
            
            const isWrapping = Math.abs(distanceFromCenter) > Math.floor(totalAlbums/2) - 1;
            album.setWrapping(isWrapping);

            if (isNearby && !isWrapping) {
                album.show();
            } else {
                album.hide();
                album.resetTilt();
                album.setCentered(false);
                
                if (isWrapping) {
                    album.setWrapping(true);
                }
                return;
            }
            
            const isCentered = distanceFromCenter === 0;
            const targetScale = isCentered ? this.settings.focusedScale : this.settings.normalScale;
            
            if (isCentered) {
                if (this.lastCenteredIndex !== arrayIndex && !immediate) {
                    setTimeout(() => {
                        album.setWrapping(false);
                        album.setCentered(true);
                        album.setTilt(true);
                    }, this.animationDuration);
                } else if (immediate) {
                    album.setWrapping(false);
                    album.setCentered(true);
                    album.setTilt(true);
                }
                this.lastCenteredIndex = arrayIndex;
            } else {
                album.setCentered(false);
                album.resetTilt();
            }
            
            if (immediate) {
                album.setPosition(targetX, 0, 0);
                album.setScale(targetScale);
            } else {
                this.interpolatePosition(album, targetX);
                this.interpolateScale(album, targetScale);
            }
        });
    }

    updateRenderOrders(centeredIndex) {
        const totalAlbums = this.gallery.albums.length;
        
        this.gallery.albums.forEach((album, index) => {
            let distanceFromCenter = ((index - centeredIndex + totalAlbums) % totalAlbums);
            if (distanceFromCenter > totalAlbums/2) {
                distanceFromCenter -= totalAlbums;
            }

            const order = this.baseRenderOrder - Math.abs(distanceFromCenter);
            album.setRenderOrder(order);
            album.setCentered(index === centeredIndex);
        });
    }

    interpolatePosition(album, targetX) {
        const group = album.getGroup();
        if (!group) return;
        
        const currentX = group.position.x;
        const newX = currentX + (targetX - currentX) * this.positionLerpFactor;
        
        album.setPosition(newX, 0, 0);
    }

    interpolateScale(album, targetScale) {
        const group = album.getGroup();
        if (!group) return;
        
        const currentScale = group.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * this.scaleLerpFactor;
        
        album.setScale(newScale);
    }

    isNavigating() {
        return this.isAnimating;
    }

    getDistanceFromCenter(index) {
        const totalAlbums = this.gallery.albums.length;
        let distance = ((index - this.gallery.currentIndex + totalAlbums) % totalAlbums);
        if (distance > totalAlbums/2) {
            distance -= totalAlbums;
        }
        return distance;
    }

    isAlbumVisible(index) {
        const distance = Math.abs(this.getDistanceFromCenter(index));
        return distance <= Math.floor(this.settings.visibleAlbums / 2);
    }

    calculateTargetX(distanceFromCenter) {
        return distanceFromCenter * this.albumSpacing;
    }

    calculateTargetScale(distanceFromCenter) {
        return distanceFromCenter === 0 ? this.settings.focusedScale : this.settings.normalScale;
    }

    setAnimationDuration(duration) {
        this.animationDuration = duration;
    }

    setLerpFactors(position, scale) {
        this.positionLerpFactor = position;
        this.scaleLerpFactor = scale;
    }

    scrollToAlbum(index) {
        const currentPosition = this.gallery.currentIndex;
        const totalAlbums = this.gallery.albums.length;
        
        let direction = index - currentPosition;
        if (Math.abs(direction) > totalAlbums / 2) {
            direction = direction > 0 ? direction - totalAlbums : direction + totalAlbums;
        }
        
        this.navigate(Math.sign(direction));
    }

    getVisibleAlbums() {
        return this.gallery.albums.filter((_, index) => this.isAlbumVisible(index));
    }
}