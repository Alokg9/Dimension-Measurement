const videoElement = document.getElementById("cameraFeed");

if (videoElement) {
    videoElement.addEventListener("loadedmetadata", () => {
        console.log("Camera is ready");
    });
} else {
    console.error("Camera element not found");
}
document.addEventListener("DOMContentLoaded", () => {
    const videoElement = document.getElementById("cameraFeed");

    if (videoElement) {
        videoElement.addEventListener("loadedmetadata", () => {
            console.log("Camera is ready");
        });
    } else {
        console.error("Camera element not found");
    }
});
navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        const videoElement = document.getElementById("cameraFeed");
        if (videoElement) {
            videoElement.srcObject = stream;
            videoElement.play();
        } else {
            console.error("Camera element not found");
        }
    })
    .catch((error) => {
        console.error("Error accessing camera:", error);
    });


class CaptureHandler {
    constructor() {
        // Safely get DOM elements (returns null if not found)
        this.video = document.getElementById('video');
        this.captureBtn = document.getElementById('captureBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.confidenceSlider = document.getElementById('confidenceSlider');
        this.aiStatus = document.querySelector('.ai-status');
        this.resultsPanel = document.getElementById('results');
        
        // Check if we have the minimum required elements
        const missingElements = [];
        if (!this.video) missingElements.push('video');
        
        // Log warnings about missing elements, but don't stop execution
        if (missingElements.length > 0) {
            console.warn(`Missing required elements: ${missingElements.join(', ')}`);
        }
        
        this.stream = null;
        this.initialized = false;
        
        // Add quality indicator only if video container exists
        const videoContainer = document.querySelector('.video-container');
        if (videoContainer) {
            this.qualityIndicator = document.createElement('div');
            this.qualityIndicator.className = 'quality-indicator';
            this.qualityIndicator.innerHTML = `
                <div class="quality-metrics">
                    <div class="metric">
                        <i class="fas fa-crosshairs"></i>
                        <span class="metric-label">Centering</span>
                        <div class="metric-bar">
                            <div class="metric-fill" data-metric="centering"></div>
                        </div>
                    </div>
                    <div class="metric">
                        <i class="fas fa-expand-arrows-alt"></i>
                        <span class="metric-label">Frame Fill</span>
                        <div class="metric-bar">
                            <div class="metric-fill" data-metric="frame-fill"></div>
                        </div>
                    </div>
                    <div class="metric">
                        <i class="fas fa-sun"></i>
                        <span class="metric-label">Lighting</span>
                        <div class="metric-bar">
                            <div class="metric-fill" data-metric="lighting"></div>
                        </div>
                    </div>
                    <div class="metric">
                        <i class="fas fa-arrows-alt"></i>
                        <span class="metric-label">Angle</span>
                        <div class="metric-bar">
                            <div class="metric-fill" data-metric="angle"></div>
                        </div>
                    </div>
                </div>
                <div class="quality-status">
                    <span class="status-text">Adjusting...</span>
                    <div class="status-indicator"></div>
                </div>
            `;
            
            videoContainer.appendChild(this.qualityIndicator);
        } else {
            console.warn('Video container not found - quality indicator will not be added');
        }
        
        // Add styles
        this.addStyles();
        
        // Defer initialization to ensure DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            // DOM already loaded, initialize now
            this.init();
        }
    }

    addStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            .quality-indicator {
                position: absolute;
                bottom: 20px;
                left: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 15px;
                color: white;
                z-index: 100;
            }

            .quality-metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-bottom: 10px;
            }

            .metric {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .metric i {
                color: var(--primary-color, #0d6efd);
                margin-right: 8px;
            }

            .metric-label {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.8);
            }

            .metric-bar {
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
                overflow: hidden;
            }

            .metric-fill {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, var(--primary-color, #0d6efd), var(--secondary-color, #6610f2));
                transition: width 0.3s ease;
            }

            .quality-status {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .status-text {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.9);
            }

            .status-indicator {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: var(--warning-color, #ffc107);
                transition: background-color 0.3s ease;
            }

            .status-indicator.good {
                background: var(--success-color, #198754);
            }
            
            .btn-pulse {
                animation: button-pulse 2s infinite;
            }
            
            @keyframes button-pulse {
                0% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.7);
                }
                
                70% {
                    transform: scale(1.05);
                    box-shadow: 0 0 0 10px rgba(25, 135, 84, 0);
                }
                
                100% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(25, 135, 84, 0);
                }
            }
        `;
        document.head.appendChild(styles);
    }

    async init() {
        try {
            // Check if video element exists before accessing camera
            if (!this.video) {
                throw new Error('Video element not found');
            }
            
            // Try to get camera with preferred settings
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'environment'
                    } 
                });
            } catch (initialError) {
                console.warn('Could not access camera with preferred settings, trying fallback:', initialError);
                
                // Fallback to basic video without specific constraints
                this.stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true 
                });
            }
            
            // Set up video stream
            this.video.srcObject = this.stream;
            
            // Use promise and event listener to ensure video is ready
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => resolve();
                this.video.onerror = (e) => reject(e);
            });
            
            await this.video.play();
            
            // Update AI status if element exists
            if (this.aiStatus) {
                const statusSpan = this.aiStatus.querySelector('span');
                const statusDot = this.aiStatus.querySelector('.ai-status-dot');
                
                if (statusSpan) statusSpan.textContent = 'AI Ready';
                if (statusDot) statusDot.style.backgroundColor = 'var(--success-color, #198754)';
            } else {
                console.warn('AI status element not found, continuing initialization');
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            
            // Start updating quality metrics if we have a video
            if (this.video) {
                this.updateQualityMetricsInterval = setInterval(() => this.updateQualityMetrics(), 100);
            }
            
        } catch (error) {
            console.error('Error initializing camera:', error);
            
            // Use a safe error handling method
            this.safeHandleError(`Camera error: ${error.message}. Please reload the page or try a different browser.`);
        }
    }
    
    // Add this safe error handling method to prevent null reference errors
    safeHandleError(message) {
        console.error(message);
        
        // Create an alert element and add it to the page
        const errorAlert = document.createElement('div');
        errorAlert.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); z-index: 9999; max-width: 90%;';
        errorAlert.textContent = message;
        document.body.appendChild(errorAlert);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(errorAlert)) {
                document.body.removeChild(errorAlert);
            }
        }, 5000);
    }

    setupEventListeners() {
        // Only set up listeners for elements that exist
        
        // Capture button click
        if (this.captureBtn) {
            this.captureBtn.addEventListener('click', () => this.captureImage());
        } else {
            console.warn('Capture button not found - capture functionality disabled');
        }
        
        // Upload button click
        if (this.uploadBtn) {
            this.uploadBtn.addEventListener('click', () => this.handleImageUpload());
        } else {
            console.warn('Upload button not found - upload functionality disabled');
        }
        
        // Confidence slider change
        if (this.confidenceSlider) {
            this.confidenceSlider.addEventListener('input', (e) => {
                // Update UI based on confidence threshold
                const value = e.target.value;
                this.updateConfidenceUI(value);
                
                // Update confidence value display if it exists
                const confidenceValue = document.querySelector('.confidence-value');
                if (confidenceValue) {
                    confidenceValue.textContent = `${value}%`;
                }
            });
        } else {
            console.warn('Confidence slider not found - confidence adjustment disabled');
        }
    }

    updateQualityMetrics() {
        // Make sure we have video and it's playing
        if (!this.video || this.video.paused || this.video.ended || !this.video.videoWidth) {
            return;
        }
        
        // Get current frame for analysis
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        
        // Analyze frame - using dummy values for demonstration
        const metrics = {
            'centering': 0.7,
            'frame-fill': 0.6,
            'lighting': 0.8,
            'angle': 0.9
        };
        
        // Update corner guides if they exist
        const cornerGuides = document.querySelectorAll('.corner-guide');
        cornerGuides.forEach(guide => {
            guide.classList.toggle('active', metrics.centering > 0.7);
        });
        
        // Update distance markers if they exist
        const distanceMarkers = document.querySelectorAll('.distance-marker');
        distanceMarkers.forEach(marker => marker.classList.remove('active'));
        
        const tooFarMarker = document.querySelector('.distance-marker.too-far');
        const tooCloseMarker = document.querySelector('.distance-marker.too-close');
        const optimalMarker = document.querySelector('.distance-marker.optimal');
        
        if (metrics['frame-fill'] < 0.4) {
            if (tooFarMarker) tooFarMarker.classList.add('active');
        } else if (metrics['frame-fill'] > 0.8) {
            if (tooCloseMarker) tooCloseMarker.classList.add('active');
        } else {
            if (optimalMarker) optimalMarker.classList.add('active');
        }
        
        // Update target ring color if it exists
        const targetRing = document.querySelector('.target-ring');
        if (targetRing) {
            targetRing.style.borderColor = metrics.centering > 0.7 ? 
                'var(--success-color, #198754)' : 'var(--primary-color, #0d6efd)';
        }
        
        // Update quality indicator bars
        Object.entries(metrics).forEach(([metric, value]) => {
            const fill = document.querySelector(`[data-metric="${metric}"]`);
            if (fill) {
                fill.style.width = `${value * 100}%`;
                
                // Add color feedback
                if (value > 0.8) {
                    fill.style.background = 'linear-gradient(90deg, var(--success-color, #198754), var(--success-color-light, #28a745))';
                } else if (value > 0.6) {
                    fill.style.background = 'linear-gradient(90deg, var(--primary-color, #0d6efd), var(--secondary-color, #6610f2))';
                } else {
                    fill.style.background = 'linear-gradient(90deg, var(--warning-color, #ffc107), var(--warning-color-light, #ffcd39))';
                }
            }
        });
        
        // Update overall status if elements exist
        const statusText = document.querySelector('.status-text');
        const statusIndicator = document.querySelector('.status-indicator');
        
        if (statusText && statusIndicator && this.captureBtn) {
            // Calculate average quality
            const avgQuality = Object.values(metrics).reduce((a, b) => a + b, 0) / Object.keys(metrics).length;
            
            if (avgQuality > 0.8) {
                statusText.textContent = '✓ Perfect Shot Ready';
                statusIndicator.style.background = 'var(--success-color, #198754)';
                this.captureBtn.classList.add('btn-success');
                this.captureBtn.classList.remove('btn-primary', 'btn-warning');
            } else if (avgQuality > 0.6) {
                statusText.textContent = 'Good Quality';
                statusIndicator.style.background = 'var(--primary-color, #0d6efd)';
                this.captureBtn.classList.add('btn-primary');
                this.captureBtn.classList.remove('btn-success', 'btn-warning');
            } else {
                statusText.textContent = 'Adjust Position...';
                statusIndicator.style.background = 'var(--warning-color, #ffc107)';
                this.captureBtn.classList.add('btn-warning');
                this.captureBtn.classList.remove('btn-success', 'btn-primary');
            }
            
            // Add pulsing effect when quality is excellent
            this.captureBtn.classList.toggle('btn-pulse', avgQuality > 0.8);
        }
    }

    async captureImage() {
        if (!this.video) {
            this.safeHandleError('Video element not found. Cannot capture image.');
            return;
        }
        
        try {
            // Create canvas and draw video frame
            const canvas = document.createElement('canvas');
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0);
            
            // Convert to base64
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            
            // Show processing state
            this.showProcessingState();
            
            // Send to server
            const response = await this.sendToServer(imageData);
            
            if (response && response.success) {
                this.displayResults(response);
            } else {
                this.handleError(response?.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error capturing image:', error);
            this.handleError('Failed to capture image. Please try again.');
        }
    }

    async handleImageUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    // Convert file to base64
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const imageData = e.target.result;
                        
                        // Show processing state
                        this.showProcessingState();
                        
                        // Send to server
                        const response = await this.sendToServer(imageData);
                        
                        if (response && response.success) {
                            this.displayResults(response);
                        } else {
                            this.handleError(response?.error || 'Unknown error occurred');
                        }
                    };
                    reader.readAsDataURL(file);
                } catch (error) {
                    console.error('Error processing uploaded image:', error);
                    this.handleError('Failed to process image. Please try another.');
                }
            }
        };
        
        input.click();
    }

    async sendToServer(imageData) {
        const formData = new FormData();
        formData.append('image', imageData);
        formData.append('timestamp', Date.now());
        
        if (this.confidenceSlider) {
            formData.append('confidence', this.confidenceSlider.value);
        } else {
            formData.append('confidence', 70); // Default value
        }
        
        try {
            const response = await fetch('/capture/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': this.getCsrfToken()
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error sending to server:', error);
            throw new Error('Failed to communicate with server');
        }
    }

    showProcessingState() {
        // Disable buttons if they exist
        if (this.captureBtn) this.captureBtn.disabled = true;
        if (this.uploadBtn) this.uploadBtn.disabled = true;
        
        // Update AI status if it exists
        if (this.aiStatus) {
            const statusSpan = this.aiStatus.querySelector('span');
            const statusDot = this.aiStatus.querySelector('.ai-status-dot');
            
            if (statusSpan) statusSpan.textContent = 'Processing...';
            if (statusDot) statusDot.style.backgroundColor = 'var(--primary-color, #0d6efd)';
        }
    }

    displayResults(response) {
        // Check if results panel exists
        if (!this.resultsPanel) {
            console.warn('Results panel not found - cannot display results');
            return;
        }
        
        // Update results panel elements if they exist
        const widthValue = document.getElementById('widthValue');
        const heightValue = document.getElementById('heightValue');
        const confidenceValue = document.getElementById('confidenceValue');
        const reloadBtn = document.querySelector('#refresh');
        
        reloadBtn.addEventListener('click', () =>{
            location.reload();
        });
        
        if (widthValue) widthValue.textContent = `${response.width.toFixed(2)} cm`;
        if (heightValue) heightValue.textContent = `${response.height.toFixed(2)} cm`;
        if (confidenceValue) confidenceValue.textContent = `${(response.confidence * 100).toFixed(1)}%`;
        
        // Show results panel
        this.resultsPanel.classList.remove('d-none');
        
        // Update chart if it exists
        if (window.accuracyChart) {
            window.accuracyChart.data.datasets[0].data = [
                response.confidence * 100,
                response.edge_accuracy * 100,
                response.measurement_accuracy * 100
            ];
            window.accuracyChart.update();
        }
        
        // Reset UI state
        this.resetUIState();
    }

    handleError(message) {
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Find a suitable container to add the error message
        const container = document.querySelector('.video-container') || document.body;
        if (container === document.body) {
            // If adding to body, style appropriately
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '20px';
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translateX(-50%)';
            errorDiv.style.zIndex = '9999';
            errorDiv.style.maxWidth = '90%';
        }
        
        container.insertAdjacentElement('beforebegin', errorDiv);
        
        // Reset UI state
        this.resetUIState();
    }

    resetUIState() {
        // Re-enable buttons if they exist
        if (this.captureBtn) this.captureBtn.disabled = false;
        if (this.uploadBtn) this.uploadBtn.disabled = false;
        
        // Reset AI status if it exists
        if (this.aiStatus) {
            const statusSpan = this.aiStatus.querySelector('span');
            const statusDot = this.aiStatus.querySelector('.ai-status-dot');
            
            if (statusSpan) statusSpan.textContent = 'AI Ready';
            if (statusDot) statusDot.style.backgroundColor = 'var(--success-color, #198754)';
        }
    }

    updateConfidenceUI(value) {
        // Update confidence threshold visualization if elements exist
        const progressBars = document.querySelectorAll('.progress-bar');
        progressBars.forEach(bar => {
            bar.style.width = `${value}%`;
        });
    }

    getCsrfToken() {
        // Get CSRF token from cookie
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
}

// Initialize capture handler
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the DOM to fully load before initializing
    window.captureHandler = new CaptureHandler();
});

// Also handle the case where the script loads after DOMContentLoaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!window.captureHandler) {
        window.captureHandler = new CaptureHandler();
    }
}
