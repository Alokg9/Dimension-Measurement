// Service Card Animations and Interactions
class ServiceAnimations {
    constructor() {
        this.cards = document.querySelectorAll('.service-card');
        this.activeCard = null;
        this.init();
    }

    init() {
        // Initialize GSAP
        gsap.registerPlugin(ScrollTrigger);
        
        // Initialize animations
        this.initCardAnimations();
        this.initScrollAnimations();
        this.initHoverEffects();
        this.initProgressBars();
    }

    initCardAnimations() {
        // Initial animation for cards
        gsap.from(this.cards, {
            duration: 0.8,
            y: 100,
            opacity: 0,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
                trigger: ".service-cards",
                start: "top 80%",
                end: "top 20%",
                toggleActions: "play none none reverse"
            }
        });

        // Add floating animation
        this.cards.forEach(card => {
            gsap.to(card, {
                y: -10,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: "power1.inOut"
            });
        });
    }

    initScrollAnimations() {
        // Parallax effect for service icons
        this.cards.forEach(card => {
            const icon = card.querySelector('.service-icon');
            
            ScrollTrigger.create({
                trigger: card,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
                onUpdate: (self) => {
                    const progress = self.progress;
                    gsap.to(icon, {
                        rotation: progress * 360,
                        duration: 0.1
                    });
                }
            });
        });
    }

    initHoverEffects() {
        this.cards.forEach(card => {
            const icon = card.querySelector('.service-icon');
            const title = card.querySelector('.card-title');
            const text = card.querySelector('.card-text');
            const progress = card.querySelector('.progress');

            // Create hover timeline
            const tl = gsap.timeline({ paused: true });
            
            tl.to(card, {
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                duration: 0.3
            })
            .to(icon, {
                scale: 1.2,
                rotation: "+=30",
                duration: 0.3
            }, 0)
            .to([title, text], {
                y: -5,
                duration: 0.3,
                stagger: 0.1
            }, 0)
            .to(progress, {
                scaleX: 1.05,
                duration: 0.3
            }, 0);

            // Add hover listeners
            card.addEventListener('mouseenter', () => {
                tl.play();
                this.animateServiceIcon(icon);
            });

            card.addEventListener('mouseleave', () => {
                tl.reverse();
                this.stopServiceIcon(icon);
            });
        });
    }

    initProgressBars() {
        this.cards.forEach(card => {
            const progressBar = card.querySelector('.progress-bar');
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: card,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                }
            });

            tl.fromTo(progressBar, {
                width: "0%"
            }, {
                width: "100%",
                duration: 1.5,
                ease: "power3.out"
            });
        });
    }

    animateServiceIcon(icon) {
        // Create particle effects
        const particles = [];
        const numParticles = 10;

        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'service-particle';
            icon.appendChild(particle);
            particles.push(particle);

            gsap.set(particle, {
                position: 'absolute',
                width: '4px',
                height: '4px',
                backgroundColor: 'var(--primary-color)',
                borderRadius: '50%',
                top: '50%',
                left: '50%'
            });

            gsap.to(particle, {
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                opacity: 0,
                duration: 1 + Math.random(),
                ease: "power2.out",
                onComplete: () => {
                    particle.remove();
                }
            });
        }

        // Glow effect
        gsap.to(icon, {
            boxShadow: '0 0 20px var(--primary-color)',
            duration: 0.3
        });
    }

    stopServiceIcon(icon) {
        // Remove glow effect
        gsap.to(icon, {
            boxShadow: 'none',
            duration: 0.3
        });
    }
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const serviceAnimations = new ServiceAnimations();
});

// Export for use in other files
window.ServiceAnimations = ServiceAnimations;
