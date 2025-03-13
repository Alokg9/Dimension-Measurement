// Animation Loader and Performance Optimizer
class AnimationLoader {
    constructor() {
        this.loadingPromises = [];
        this.initialized = false;
        this.loadingOverlay = null;
        this.init();
    }

    init() {
        // Create loading overlay
        this.createLoadingOverlay();
        
        // Register animation modules
        this.registerAnimationModules();
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeAnimations());
        } else {
            this.initializeAnimations();
        }
    }

    createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'loading-overlay';
        
        const content = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">
                    <h3>Initializing AI Systems</h3>
                    <div class="loading-progress">
                        <div class="progress-bar"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.loadingOverlay.innerHTML = content;
        document.body.appendChild(this.loadingOverlay);

        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: var(--background-dark);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 1;
                transition: opacity 0.5s ease;
            }

            .loading-content {
                text-align: center;
                color: white;
            }

            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 3px solid transparent;
                border-top-color: var(--primary-color);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            .loading-text h3 {
                margin-bottom: 15px;
                background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .loading-progress {
                width: 200px;
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                overflow: hidden;
                margin: 0 auto;
            }

            .loading-progress .progress-bar {
                width: 0%;
                height: 100%;
                background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
                transition: width 0.3s ease;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(styles);
    }

    registerAnimationModules() {
        // Register car animations
        this.loadingPromises.push(
            new Promise(resolve => {
                this.loadScript('/static/js/car-animations.js')
                    .then(() => {
                        this.updateProgress(25);
                        resolve();
                    });
            })
        );

        // Register service animations
        this.loadingPromises.push(
            new Promise(resolve => {
                this.loadScript('/static/js/service-animations.js')
                    .then(() => {
                        this.updateProgress(50);
                        resolve();
                    });
            })
        );

        // Register GSAP and ScrollTrigger
        this.loadingPromises.push(
            new Promise(resolve => {
                Promise.all([
                    this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/gsap.min.js'),
                    this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/ScrollTrigger.min.js')
                ]).then(() => {
                    this.updateProgress(75);
                    resolve();
                });
            })
        );
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    updateProgress(percent) {
        const progressBar = this.loadingOverlay.querySelector('.progress-bar');
        progressBar.style.width = `${percent}%`;
    }

    async initializeAnimations() {
        if (this.initialized) return;

        try {
            // Wait for all animation modules to load
            await Promise.all(this.loadingPromises);
            
            // Update final progress
            this.updateProgress(100);

            // Initialize car animations
            if (window.CarAnimations) {
                window.carScene = window.CarAnimations.init();
            }

            // Initialize service animations
            if (window.ServiceAnimations) {
                window.serviceAnimations = new ServiceAnimations();
            }

            // Remove loading overlay
            setTimeout(() => {
                this.loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    this.loadingOverlay.remove();
                }, 500);
            }, 500);

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize animations:', error);
            this.loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <h3>Failed to load animations</h3>
                    <p>Please refresh the page</p>
                </div>
            `;
        }
    }

    // Performance monitoring
    static monitorPerformance() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'longtask' && entry.duration > 50) {
                        console.warn('Long task detected:', entry);
                        this.optimizeAnimations();
                    }
                }
            });

            observer.observe({ entryTypes: ['longtask'] });
        }
    }

    static optimizeAnimations() {
        // Reduce particle count if performance issues detected
        if (window.carScene) {
            const particles = window.carScene.getParticles();
            if (particles.length > 100) {
                window.carScene.setParticleCount(Math.floor(particles.length * 0.8));
            }
        }

        // Optimize neural network connections
        const neuralNetwork = document.querySelector('.neural-network');
        if (neuralNetwork) {
            const connections = neuralNetwork.querySelectorAll('.neural-connection');
            if (connections.length > 50) {
                Array.from(connections)
                    .slice(50)
                    .forEach(connection => connection.remove());
            }
        }
    }
}

// Initialize animation loader
window.animationLoader = new AnimationLoader();

// Start performance monitoring
AnimationLoader.monitorPerformance();
