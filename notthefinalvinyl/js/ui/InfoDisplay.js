// js/ui/InfoDisplay.js
import InfoDisplayBase from './InfoDisplayBase.js';

export default class InfoDisplay extends InfoDisplayBase {
    constructor(gallery) {
        super();
        
        // Store gallery reference properly
        this.gallery = gallery;
        
        // Add references to default and album info containers
        this.elements.defaultInfo = this.infoElement?.querySelector('.default-info');
        this.elements.albumInfoContainer = this.infoElement?.querySelector('.album-info');
        
        // Initialize state variables
        this.currentlyPlayingAlbum = null;
        this.hoveredAlbum = null;
        
        // Start with default info visible and album info hidden
        if (this.elements.defaultInfo && this.elements.albumInfoContainer) {
            this.elements.defaultInfo.style.display = 'block';
            this.elements.albumInfoContainer.style.display = 'none';
        }
    }

    showAlbumInfo(albumData, isPlaying = false) {
        if (!albumData || !this.infoElement) return;

        // If expanded, only show playing album and ignore mouseovers
        if (this.infoElement.classList.contains(this.expandedClass)) {
            if (!isPlaying) return; // Ignore mouseovers when expanded
        }

        // Show album info and hide default info
        if (this.elements.defaultInfo && this.elements.albumInfoContainer) {
            this.elements.defaultInfo.style.display = 'none';
            this.elements.albumInfoContainer.style.display = 'block';
        }

        // Update state
        if (isPlaying) {
            this.currentlyPlayingAlbum = albumData;
            if (this.elements.expandButton) {
                this.elements.expandButton.style.display = 'block';
            }
        }
        this.hoveredAlbum = albumData;

        // When expanded, always show current playing album
        const displayData = this.infoElement.classList.contains(this.expandedClass) 
            ? this.currentlyPlayingAlbum 
            : albumData;

        // Update basic info
        if (this.elements.title) {
            this.elements.title.textContent = displayData.title || '';
        }
        if (this.elements.artist) {
            this.elements.artist.textContent = displayData.artist || '';
        }
        if (this.elements.details) {
            const duration = this.calculateAlbumLength(displayData.tracks);
            const trackCount = displayData.tracks?.length || 0;
            this.elements.details.textContent = `${trackCount} track${trackCount !== 1 ? 's' : ''} · ${duration}`;
        }

        // Create or update expanded content
        let expandedContent = this.infoElement.querySelector('.expanded-content');
        if (!expandedContent) {
            expandedContent = document.createElement('div');
            expandedContent.className = 'expanded-content';
            this.infoElement.appendChild(expandedContent);
        }
        expandedContent.innerHTML = this.generateExpandedContent(displayData);

        // Show the info panel
        this.infoElement.classList.add(this.fadeInClass);
    }

    hideEmbed() {
        if (!this.embedContainer) return;
        
        this.embedContainer.classList.remove(this.embedVisibleClass);
        
        setTimeout(() => {
            if (this.elements.embedContent) {
                this.elements.embedContent.innerHTML = '';
            }
            
            // Find and retract vinyl for currently playing album
            if (this.currentlyPlayingAlbum && this.gallery?.albums) {
                const playingAlbum = this.gallery.albums.find(
                    album => album.getData().title === this.currentlyPlayingAlbum.title
                );
                if (playingAlbum && playingAlbum.isVinylOut()) {
                    this.gallery.getVinylManager()?.slideVinylIn(playingAlbum);
                }
            }
            
            // Clear playing state
            this.currentlyPlayingAlbum = null;
            
            // Hide expand button
            if (this.elements.expandButton) {
                this.elements.expandButton.style.display = 'none';
            }
            
            // Collapse expanded view when stopping playback
            if (this.infoElement.classList.contains(this.expandedClass)) {
                this.toggleExpand();
            }
            
            // Return to showing default or hovered album info
            if (this.hoveredAlbum) {
                this.showAlbumInfo(this.hoveredAlbum, false);
            } else {
                // Show default info if no album is hovered
                if (this.elements.defaultInfo && this.elements.albumInfoContainer) {
                    this.elements.defaultInfo.style.display = 'block';
                    this.elements.albumInfoContainer.style.display = 'none';
                }
            }
        }, 300);
    }

    showEmbed(albumData) {
        if (!this.embedContainer || !window.albumEmbeds || !albumData) {
            console.warn('Missing required data for embed:', {
                hasContainer: !!this.embedContainer,
                hasEmbeds: !!window.albumEmbeds,
                hasAlbumData: !!albumData
            });
            return;
        }

        try {
            const embedData = window.albumEmbeds[albumData.title];
            if (!embedData) {
                console.warn('No embed data found for:', albumData.title);
                return;
            }

            // Handle previous playing album
            if (this.currentlyPlayingAlbum && 
                this.currentlyPlayingAlbum.title !== albumData.title && 
                this.gallery?.albums) {
                
                const previousAlbum = this.gallery.albums.find(
                    album => album.getData().title === this.currentlyPlayingAlbum.title
                );
                
                if (previousAlbum?.isVinylOut() && this.gallery.getVinylManager()) {
                    this.gallery.getVinylManager().slideVinylIn(previousAlbum);
                }
            }

            // Handle embed content
            const content = this.elements.embedContent;
            if (!content) {
                console.warn('No embed content element found');
                return;
            }

            // Clear and create new iframe
            content.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.style.cssText = `
                border: 0;
                width: 100%;
                height: 120px;
            `;
            
            // Configure iframe source
            iframe.src = embedData.url
                .replace('bgcol=ffffff', 'bgcol=000000')
                .replace('linkcol=0687f5', 'linkcol=ffffff');
                
            iframe.setAttribute('seamless', '');
            iframe.setAttribute('loading', 'lazy');

            // Add iframe and show container
            content.appendChild(iframe);
            requestAnimationFrame(() => {
                this.embedContainer.classList.add(this.embedVisibleClass);
            });

            // Update state and display
            this.currentlyPlayingAlbum = albumData;
            if (this.elements.expandButton) {
                this.elements.expandButton.style.display = 'block';
            }
            this.showAlbumInfo(albumData, true);

        } catch (error) {
            console.error('Error showing embed:', error, {
                albumTitle: albumData?.title,
                hasGallery: !!this.gallery,
                hasVinylManager: !!this.gallery?.getVinylManager()
            });
        }
    }

    generateExpandedContent(albumData) {
        let content = '';

        // Add description if available
        if (albumData.description) {
            content += `
                <div class="description">${albumData.description}</div>
            `;
        }

        // Add track listing
        if (albumData.tracks && albumData.tracks.length > 0) {
            content += '<div class="track-list">';
            albumData.tracks.forEach((track, index) => {
                content += `
                    <div class="track-item">
                        <span>${(index + 1).toString().padStart(2, '0')}. ${track.title}</span>
                        <span class="track-duration">${track.duration || ''}</span>
                    </div>
                `;
            });
            content += '</div>';
        }

        // Add release info
        content += `
            <div class="release-info">
                <div>Released: ${albumData.release_date || 'Unknown'}</div>
                ${albumData.pricing ? `<div>Price: £${albumData.pricing.amount.toFixed(2)}</div>` : ''}
            </div>
        `;

        // Add tags
        if (albumData.tags && albumData.tags.length > 0) {
            content += '<div class="tags">';
            albumData.tags.forEach(tag => {
                content += `<span class="tag">${tag}</span>`;
            });
            content += '</div>';
        }

        // Add buy now link if URL available
        if (albumData.url) {
            content += `
                <div class="buy-now-container">
                    <a href="${albumData.url}" target="_blank" rel="noopener noreferrer" class="buy-now-link">
                        Buy Now
                    </a>
                </div>
            `;
        }

        return content;
    }

    toggleExpand(e) {
        if (e) {
            e.stopPropagation();
        }
        if (!this.infoElement) return;
        
        // Don't allow expansion unless we have a currently playing album
        if (!this.currentlyPlayingAlbum && !this.infoElement.classList.contains(this.expandedClass)) {
            return;
        }

        const isExpanded = this.infoElement.classList.toggle(this.expandedClass);
        
        if (isExpanded) {
            // When expanding, show the currently playing album's info
            this.showAlbumInfo(this.currentlyPlayingAlbum, true);
        }
        
        this.infoElement.scrollTop = 0;

        // Update expand button rotation
        if (this.elements.expandButton) {
            this.elements.expandButton.style.transform = isExpanded ? 'rotate(180deg)' : '';
        }
    }

    calculateAlbumLength(tracks) {
        if (!tracks || !tracks.length) return '0:00';
        
        let totalSeconds = 0;
        tracks.forEach(track => {
            if (track.duration) {
                const parts = track.duration.split(':');
                const minutes = parseInt(parts[0]) || 0;
                const seconds = parseInt(parts[1]) || 0;
                totalSeconds += minutes * 60 + seconds;
            }
        });
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}