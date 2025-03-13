class ParticleSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            particleCount: options.particleCount || 50,
            color: options.color || 'var(--primary-color)',
            speed: options.speed || 0.5,
            size: options.size || 2,
            lifetime: options.lifetime || 2000
        };
        
        this.particles = [];
        this.isActive = true;
        
        // Create particle container
        this.particleContainer = document.createElement('div');
        this.particleContainer.className = 'particle-container';
        this.particleContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
            z-index: 1000;
        `;
        this.container.appendChild(this.particleContainer);
        
        // Start animation loop
        this.animate();
    }
    
    createParticle(x, y, type = 'default') {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Set particle styles based on type
        const styles = {
            default: {
                backgroundColor: this.options.color,
                boxShadow: `0 0 ${this.options.size * 2}px ${this.options.color}`
            },
            success: {
                backgroundColor: 'var(--success-color)',
                boxShadow: '0 0 10px var(--success-color)'
            },
            warning: {
                backgroundColor: 'var(--warning-color)',
                boxShadow: '0 0 10px var(--warning-color)'
            }
        };
        
        particle.style.cssText = `
            position: absolute;
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            border-radius: 50%;
            pointer-events: none;
            ${Object.entries(styles[type] || styles.default)
                .map(([prop, value]) => `${prop}: ${value};`)
                .join('')}
        `;
        
        // Set initial position
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        // Add to container
        this.particleContainer.appendChild(particle);
        
        // Create particle data
        const angle = Math.random() * Math.PI * 2;
        const speed = this.options.speed * (0.5 + Math.random());
        const lifetime = this.options.lifetime * (0.8 + Math.random() * 0.4);
        const startTime = Date.now();
        
        return {
            element: particle,
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifetime,
            startTime
        };
    }
    
    emit(type = 'default', count = 10) {
        const rect = this.container.getBoundingClientRect();
        
        for (let i = 0; i < count; i++) {
            const x = Math.random() * rect.width;
            const y = Math.random() * rect.height;
            this.particles.push(this.createParticle(x, y, type));
        }
    }
    
    animate() {
        if (!this.isActive) return;
        
        const now = Date.now();
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            const age = now - particle.startTime;
            if (age >= particle.lifetime) {
                particle.element.remove();
                return false;
            }
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Apply fade out
            const opacity = 1 - (age / particle.lifetime);
            particle.element.style.transform = `translate(${particle.x}px, ${particle.y}px)`;
            particle.element.style.opacity = opacity;
            
            return true;
        });
        
        requestAnimationFrame(() => this.animate());
    }
    
    destroy() {
        this.isActive = false;
        this.particles.forEach(particle => particle.element.remove());
        this.particles = [];
        this.particleContainer.remove();
    }
}
