class CaptureHandler {
    constructor() {
        this.video = document.getElementById('video');
        this.captureBtn = document.getElementById('captureBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.confidenceSlider = document.getElementById('confidenceSlider');
        this.stream = null;
        this.metricsUpdateInterval = null;
        this.particleSystem = null;
        this.radarChart = null;
        
        // Initialize GSAP timeline for animations
        this.timeline = gsap.timeline();
        
        this.setupEventListeners();
        this.initializeCamera();
        this.initializeParticleSystem();
        this.initializeRadarChart();
    }

    initializeParticleSystem() {
        const container = document.querySelector('.measurement-container');
        this.particleSystem = new ParticleSystem(container, {
            particleCount: 50,
            color: 'var(--primary-color)',
            speed: 0.5,
            size: 2
        });
    }

    initializeRadarChart() {
        const ctx = document.getElementById('qualityRadar').getContext('2d');
        this.radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Centering', 'Frame Fill', 'Lighting', 'Angle'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: 'rgba(var(--primary-rgb), 0.2)',
                    borderColor: 'rgb(var(--primary-rgb))',
                    pointBackgroundColor: 'rgb(var(--primary-rgb))'
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 1
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async initializeCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment'
                }
            });
            this.video.srcObject = this.stream;
            
            // Animate camera container on initialization
            gsap.from('.video-container', {
                duration: 1,
                scale: 0.9,
                opacity: 0,
                ease: 'power2.out'
            });
            
            // Start quality metrics update
            this.metricsUpdateInterval = setInterval(() => this.updateQualityMetrics(), 200);
            
        } catch (err) {
            console.error('Error accessing camera:', err);
            this.showError('Camera access denied. Please check permissions.');
        }
    }

    setupEventListeners() {
        // Capture button
        this.captureBtn.addEventListener('click', () => this.captureImage());
        
        // Upload button
        this.uploadBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => this.handleFileUpload(e.target.files[0]);
            input.click();
        });
        
        // Confidence slider
        this.confidenceSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            document.querySelector('.confidence-value').textContent = `${value}%`;
        });
        
        // Device orientation handling
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
        }
    }

    handleOrientation(event) {
        if (!event.beta || !event.gamma) return;
        
        const beta = event.beta; // Front-back tilt
        const gamma = event.gamma; // Left-right tilt
        
        // Update angle quality based on device orientation
        const betaQuality = 1 - Math.abs(90 - beta) / 90;
        const gammaQuality = 1 - Math.abs(gamma) / 90;
        this.updateAngleIndicator(Math.min(betaQuality, gammaQuality));
    }

    updateAngleIndicator(quality) {
        const angleIndicator = document.querySelector('[data-metric="angle"]');
        if (angleIndicator) {
            angleIndicator.style.width = `${quality * 100}%`;
            angleIndicator.style.background = quality > 0.8 ? 
                'var(--success-color)' : quality > 0.6 ? 
                'var(--primary-color)' : 'var(--warning-color)';
        }
    }

    async captureImage() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        await this.processImage(imageData);
    }

    async handleFileUpload(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            await this.processImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    async processImage(imageData) {
        try {
            const formData = new FormData();
            formData.append('image', imageData);
            formData.append('confidence', this.confidenceSlider.value / 100);
            
            const response = await fetch('/measurement/capture/', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to process image');
            }
            
            if (result.success) {
                // Show success animation
                this.showSuccess();
                
                // Navigate to results page
                setTimeout(() => {
                    window.location.href = `/measurement/result/${result.image_path}`;
                }, 1000);
            } else {
                this.showError(result.error || 'Measurement failed');
            }
            
        } catch (err) {
            console.error('Error processing image:', err);
            this.showError(err.message);
        }
    }

    updateQualityMetrics() {
        const metrics = this.analyzeFrame();
        
        // Update radar chart
        this.radarChart.data.datasets[0].data = [
            metrics.centering,
            metrics.frameFill,
            metrics.lighting,
            metrics.angle
        ];
        this.radarChart.update();

        // Update neural network visualization
        this.updateNeuralNetworkVisualization(metrics);

        // Trigger particle effects based on overall quality
        const overallQuality = Object.values(metrics).reduce((a, b) => a + b, 0) / 4;
        if (overallQuality > 0.8) {
            this.particleSystem.emit('success');
        }
    }

    updateNeuralNetworkVisualization(metrics) {
        const nodes = document.querySelectorAll('.neural-node');
        const overallQuality = Object.values(metrics).reduce((a, b) => a + b, 0) / 4;
        
        nodes.forEach((node, index) => {
            gsap.to(node, {
                scale: 0.8 + (overallQuality * 0.4),
                opacity: 0.5 + (overallQuality * 0.5),
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    }

    analyzeFrame() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        ctx.drawImage(this.video, 0, 0);
        
        // Calculate metrics
        return {
            centering: this.calculateCentering(ctx),
            frameFill: this.calculateFrameFill(ctx),
            lighting: this.calculateLighting(ctx),
            angle: this.calculateAngle()
        };
    }

    calculateCentering(ctx) {
        // Implement centering calculation based on object position
        return 0.8; // Placeholder
    }

    calculateFrameFill(ctx) {
        // Implement frame fill calculation based on object size
        return 0.7; // Placeholder
    }

    calculateLighting(ctx) {
        // Implement lighting calculation based on image brightness
        return 0.9; // Placeholder
    }

    calculateAngle() {
        // Use device orientation data
        return this.currentAngleQuality || 0.8;
    }

    showSuccess() {
        // Create success alert with enhanced animation
        const alert = document.createElement('div');
        alert.className = 'alert alert-success fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        alert.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            Image captured successfully!
        `;
        document.body.appendChild(alert);
        
        // Trigger success animations
        this.particleSystem.emit('success');
        gsap.from(alert, {
            y: -50,
            opacity: 0,
            duration: 0.5,
            ease: 'back.out'
        });
        
        setTimeout(() => {
            gsap.to(alert, {
                y: -50,
                opacity: 0,
                duration: 0.5,
                ease: 'power2.in',
                onComplete: () => alert.remove()
            });
        }, 3000);
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        alert.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
        `;
        document.body.appendChild(alert);
        
        // Error animation
        gsap.from(alert, {
            y: -50,
            opacity: 0,
            duration: 0.5,
            ease: 'back.out'
        });
        
        setTimeout(() => {
            gsap.to(alert, {
                y: -50,
                opacity: 0,
                duration: 0.5,
                ease: 'power2.in',
                onComplete: () => alert.remove()
            });
        }, 5000);
    }

    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.metricsUpdateInterval) {
            clearInterval(this.metricsUpdateInterval);
        }
        if (this.particleSystem) {
            this.particleSystem.destroy();
        }
        if (this.radarChart) {
            this.radarChart.destroy();
        }
    }
}

// Initialize handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const handler = new CaptureHandler();
    // Cleanup on page unload
    window.addEventListener('unload', () => handler.cleanup());
});
