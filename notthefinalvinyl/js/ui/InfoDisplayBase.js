// js/ui/InfoDisplayBase.js
export default class InfoDisplayBase {
    constructor() {
        this.infoElement = document.getElementById('info');
        this.embedContainer = document.getElementById('embed-container');
        
        this.fadeInClass = 'active';
        this.embedVisibleClass = 'visible';
        this.expandedClass = 'expanded';
        
        this.currentlyPlayingAlbum = null;
        this.hoveredAlbum = null;

        // Bind methods
        this.hideEmbed = this.hideEmbed.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.toggleExpand = this.toggleExpand.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        // Initialize UI elements
        this.elements = {
            title: this.infoElement?.querySelector('.album-title'),
            artist: this.infoElement?.querySelector('.artist'),
            details: this.infoElement?.querySelector('.album-details'),
            embedContent: this.embedContainer?.querySelector('.embed-content')
        };

        this.setupExpandButton();
        this.addEventListeners();
    }

    setupExpandButton() {
        if (!this.infoElement) return;

        const expandButton = document.createElement('button');
        expandButton.className = 'expand-button';
        expandButton.innerHTML = '↑';
        expandButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 15px;  /* Increased touch target */
            margin: -10px;  /* Offset increased padding */
            opacity: 0.8;
            transition: all 0.3s ease;
            transform-origin: center;
            z-index: 10;
            display: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            user-select: none;
            -webkit-user-select: none;
        `;

        // Mouse events
        expandButton.addEventListener('mouseenter', () => expandButton.style.opacity = '1');
        expandButton.addEventListener('mouseleave', () => expandButton.style.opacity = '0.8');
        expandButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleExpand(e);
        });

        // Touch events
        expandButton.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        expandButton.addEventListener('touchend', this.handleTouchEnd, { passive: false });

        this.elements.expandButton = expandButton;
        this.infoElement.appendChild(expandButton);
    }

    handleTouchStart(e) {
        if (e.target.closest('.expand-button')) {
            e.preventDefault();
            e.target.style.opacity = '1';
        }
    }

    handleTouchEnd(e) {
        if (e.target.closest('.expand-button')) {
            e.preventDefault();
            e.target.style.opacity = '0.8';
            this.toggleExpand(e);
        }
    }

    addEventListeners() {
        document.addEventListener('keydown', this.handleEscapeKey);
        
        if (this.infoElement) {
            // Mouse events
            this.infoElement.addEventListener('click', (e) => {
                const isDefaultInfo = e.target.closest('.default-info');
                if (isDefaultInfo) return;

                const isExpandButton = e.target.closest('.expand-button');
                const isAlbumInfo = e.target.closest('.album-info');

                if (isExpandButton || isAlbumInfo) {
                    if (this.currentlyPlayingAlbum || this.infoElement.classList.contains(this.expandedClass)) {
                        this.toggleExpand(e);
                    }
                }
            });

            // Touch events
            this.infoElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
            this.infoElement.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        }
    }

    handleEscapeKey(event) {
        if (event.key === 'Escape') {
            if (this.embedContainer?.classList.contains(this.embedVisibleClass)) {
                this.hideEmbed();
            } else if (this.infoElement?.classList.contains(this.expandedClass)) {
                this.toggleExpand();
            }
        }
    }

    calculateAlbumLength(tracks) {
        if (!tracks || !tracks.length) return '0:00';

        try {
            let totalSeconds = 0;
            tracks.forEach(track => {
                if (track.duration) {
                    const [minutes, seconds] = track.duration.split(':').map(Number);
                    totalSeconds += (minutes * 60) + (seconds || 0);
                }
            });

            return this.formatTime(totalSeconds);
        } catch (error) {
            console.error('Error calculating album length:', error);
            return '0:00';
        }
    }

    formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    dispose() {
        document.removeEventListener('keydown', this.handleEscapeKey);

        if (this.elements.expandButton) {
            this.elements.expandButton.removeEventListener('click', this.toggleExpand);
            this.elements.expandButton.removeEventListener('touchstart', this.handleTouchStart);
            this.elements.expandButton.removeEventListener('touchend', this.handleTouchEnd);
            this.elements.expandButton.remove();
        }

        if (this.infoElement) {
            this.infoElement.removeEventListener('touchstart', this.handleTouchStart);
            this.infoElement.removeEventListener('touchend', this.handleTouchEnd);
        }

        // Clear references
        this.elements = {};
        this.infoElement = null;
        this.embedContainer = null;
    }
}