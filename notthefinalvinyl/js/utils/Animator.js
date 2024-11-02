export default class Animator {
    constructor() {
        this.animations = new Map();
        this.easingFunctions = {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeInCubic: t => t * t * t,
            easeOutCubic: t => (--t) * t * t + 1,
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
            easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
            easeOutExpo: t => t === 1 ? 1 : -Math.pow(2, -10 * t) + 1,
            spring: (t) => {
                const c4 = (2 * Math.PI) / 3;
                return -Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            }
        };
        
        this.frameTime = 1000 / 60; // Target 60fps
        this.lastFrameTime = 0;
        this.isRunning = false;
    }

    animate({
        target,
        duration = 1000,
        properties = {},
        easing = 'easeOutCubic',
        onUpdate = null,
        onComplete = null
    }) {
        const animationId = Symbol('animation');
        const startTime = performance.now();
        const initialValues = {};
        const easingFunction = this.easingFunctions[easing] || this.easingFunctions.linear;

        // Store initial values
        for (const prop in properties) {
            initialValues[prop] = target[prop];
        }

        const animation = {
            id: animationId,
            update: (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easingFunction(progress);

                // Update properties
                for (const prop in properties) {
                    const start = initialValues[prop];
                    const end = properties[prop];
                    target[prop] = start + (end - start) * easedProgress;
                }

                if (onUpdate) {
                    onUpdate(target, easedProgress);
                }

                if (progress >= 1) {
                    this.animations.delete(animationId);
                    if (onComplete) {
                        onComplete(target);
                    }
                    return false;
                }

                return true;
            }
        };

        this.animations.set(animationId, animation);
        this.startLoop();
        return animationId;
    }

    startLoop() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.loop();
        }
    }

    loop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime >= this.frameTime) {
            this.update(currentTime);
            this.lastFrameTime = currentTime;
        }

        if (this.animations.size > 0) {
            requestAnimationFrame(() => this.loop());
        } else {
            this.isRunning = false;
        }
    }

    update(currentTime) {
        this.animations.forEach((animation, id) => {
            if (!animation.update(currentTime)) {
                this.animations.delete(id);
            }
        });
    }

    stop(animationId) {
        if (this.animations.has(animationId)) {
            this.animations.delete(animationId);
        }
        if (this.animations.size === 0) {
            this.isRunning = false;
        }
    }

    stopAll() {
        this.animations.clear();
        this.isRunning = false;
    }

    isAnimating(animationId) {
        return this.animations.has(animationId);
    }

    // Utility functions
    lerp(start, end, t) {
        return start + (end - start) * t;
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Common animation presets
    fadeIn(element, duration = 300, onComplete = null) {
        return this.animate({
            target: element.style,
            duration,
            properties: { opacity: 1 },
            easing: 'easeOutCubic',
            onComplete
        });
    }

    fadeOut(element, duration = 300, onComplete = null) {
        return this.animate({
            target: element.style,
            duration,
            properties: { opacity: 0 },
            easing: 'easeInCubic',
            onComplete
        });
    }

    slideIn(element, direction = 'left', duration = 300) {
        const start = direction === 'left' ? -100 : 100;
        return this.animate({
            target: element.style,
            duration,
            properties: { transform: `translateX(${start}%) translateX(0)` },
            easing: 'easeOutCubic'
        });
    }

    spring(value, target, velocity = 0, stiffness = 0.1, damping = 0.8) {
        const acceleration = (target - value) * stiffness;
        velocity = velocity * damping + acceleration;
        return {
            value: value + velocity,
            velocity
        };
    }

    // Performance optimization
    setFrameRate(fps) {
        this.frameTime = 1000 / fps;
    }

    // Cleanup
    dispose() {
        this.stopAll();
    }
}

// Export commonly used animation functions
export const animate = (options) => {
    const animator = new Animator();
    return animator.animate(options);
};

export const spring = (value, target, velocity, stiffness, damping) => {
    const animator = new Animator();
    return animator.spring(value, target, velocity, stiffness, damping);
};