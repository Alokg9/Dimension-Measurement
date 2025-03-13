// Result Page Animations and Interactions
class ResultAnimations {
    constructor() {
        this.measurementCards = document.querySelectorAll('.measurement-card');
        this.resultImage = document.querySelector('.result-image');
        this.accuracyChart = null;
        this.init();
    }

    init() {
        this.initializeGSAP();
        this.createEntryAnimations();
        this.initializeAccuracyChart();
        this.addHoverEffects();
        this.initializeDimensionGrid();
    }

    initializeGSAP() {
        gsap.registerPlugin(ScrollTrigger);
        
        // Animate result image
        gsap.from(this.resultImage, {
            scale: 0.8,
            opacity: 0,
            duration: 1,
            ease: "power3.out"
        });

        // Animate measurement cards
        gsap.from(this.measurementCards, {
            y: 50,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "power2.out"
        });
    }

    initializeAccuracyChart() {
        const ctx = document.getElementById('accuracyChart');
        if (!ctx) return;

        this.accuracyChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Edge Detection', 'Object Recognition', 'Scale Accuracy', 'Perspective Correction', 'Lighting Analysis'],
                datasets: [{
                    label: 'Measurement Confidence',
                    data: [95, 90, 85, 92, 88],
                    fill: true,
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    borderColor: 'rgb(99, 102, 241)',
                    pointBackgroundColor: 'rgb(99, 102, 241)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(99, 102, 241)'
                }]
            },
            options: {
                elements: {
                    line: {
                        borderWidth: 3
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            backdropColor: 'transparent'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
    }

    addHoverEffects() {
        this.measurementCards.forEach(card => {
            const value = card.querySelector('.measurement-value');
            const particles = [];

            card.addEventListener('mouseenter', () => {
                // Scale animation
                gsap.to(card, {
                    scale: 1.05,
                    duration: 0.3,
                    ease: "power2.out"
                });

                // Glow effect
                gsap.to(card, {
                    boxShadow: '0 0 30px rgba(var(--primary-color-rgb), 0.3)',
                    duration: 0.3
                });

                // Value highlight
                gsap.to(value, {
                    scale: 1.1,
                    color: 'var(--primary-color)',
                    duration: 0.3
                });

                // Create particles
                this.createParticles(card, particles);
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    scale: 1,
                    boxShadow: '0 0 0 rgba(var(--primary-color-rgb), 0)',
                    duration: 0.3
                });

                gsap.to(value, {
                    scale: 1,
                    color: 'white',
                    duration: 0.3
                });

                // Remove particles
                particles.forEach(particle => {
                    gsap.to(particle, {
                        opacity: 0,
                        duration: 0.2,
                        onComplete: () => particle.remove()
                    });
                });
                particles.length = 0;
            });
        });
    }

    createParticles(card, particles) {
        const numParticles = 10;
        const cardRect = card.getBoundingClientRect();

        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'measurement-particle';
            document.body.appendChild(particle);
            particles.push(particle);

            const angle = (Math.random() * Math.PI * 2);
            const radius = 50 + Math.random() * 50;
            const startX = cardRect.left + cardRect.width / 2;
            const startY = cardRect.top + cardRect.height / 2;

            gsap.set(particle, {
                x: startX,
                y: startY,
                scale: 0
            });

            gsap.to(particle, {
                x: startX + Math.cos(angle) * radius,
                y: startY + Math.sin(angle) * radius,
                scale: 1,
                opacity: 0,
                duration: 1 + Math.random(),
                ease: "power2.out"
            });
        }
    }

    initializeDimensionGrid() {
        const grid = document.querySelector('.dimension-grid');
        if (!grid) return;

        const gridSize = 20;
        const cellSize = Math.min(grid.offsetWidth, grid.offsetHeight) / gridSize;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                grid.appendChild(cell);

                gsap.from(cell, {
                    scale: 0,
                    opacity: 0,
                    duration: 0.5,
                    delay: (i + j) * 0.02,
                    ease: "power2.out"
                });
            }
        }
    }
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const resultAnimations = new ResultAnimations();
});
