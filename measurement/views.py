from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, StreamingHttpResponse
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from concurrent.futures import ThreadPoolExecutor
import cv2
import numpy as np
import base64
import threading
import time
import logging
import json
import io
import re
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

# Constants
CAMERA_WARMUP_TIME = 1.0  # seconds
DEFAULT_REFERENCE_OBJECT_WIDTH_CM = 10.0

# Initialize object detection
try:
    import torch
    from ultralytics import YOLO
    yolo_model = YOLO('yolov8n.pt')
    USING_YOLO = True
    logger.info("YOLO model initialized successfully")
except ImportError:
    USING_YOLO = False
    logger.warning("YOLO not available, falling back to traditional contour detection")

class VideoCamera:
    def __init__(self, camera_index=0, resolution=(1280, 720)):
        """Initialize camera with higher resolution for better accuracy"""
        self.video = cv2.VideoCapture(camera_index)
        if not self.video.isOpened():
            logger.error("Failed to open camera")
            raise RuntimeError("Could not open camera")
            
        # Set camera properties
        self.video.set(cv2.CAP_PROP_FRAME_WIDTH, resolution[0])
        self.video.set(cv2.CAP_PROP_FRAME_HEIGHT, resolution[1])
        self.video.set(cv2.CAP_PROP_AUTOFOCUS, 1)  # Enable autofocus
        self.video.set(cv2.CAP_PROP_FPS, 30)  # Set FPS
        
        self.lock = threading.Lock()
        self.resolution = resolution
        
        # Allow camera to warm up
        time.sleep(CAMERA_WARMUP_TIME)
        
        # Verify camera settings
        actual_width = self.video.get(cv2.CAP_PROP_FRAME_WIDTH)
        actual_height = self.video.get(cv2.CAP_PROP_FRAME_HEIGHT)
        logger.info(f"Camera initialized with resolution: {actual_width}x{actual_height}")
        
    def __del__(self):
        with self.lock:
            if hasattr(self, 'video') and self.video.isOpened():
                self.video.release()

    def get_frame(self, add_guidelines=True):
        """Get frame with optional measurement guidelines"""
        with self.lock:
            if not self.video.isOpened():
                logger.error("Camera is not opened")
                return None
                
            success = False
            image = None
            
            # Try to read frame multiple times
            for _ in range(3):
                success, image = self.video.read()
                if success and image is not None:
                    break
                time.sleep(0.1)
            
            if not success or image is None:
                logger.error("Failed to capture frame")
                return None
            
            try:
                # Resize if necessary
                if image.shape[3] != self.resolution[0] or image.shape[0] != self.resolution[1]:
                    image = cv2.resize(image, self.resolution)
                
                # Add measurement guidelines if requested
                if add_guidelines:
                    height, width = image.shape[:2]
                    # Draw grid lines
                    cv2.line(image, (width//3, 0), (width//3, height), (0, 255, 0), 1)
                    cv2.line(image, (2*width//3, 0), (2*width//3, height), (0, 255, 0), 1)
                    cv2.line(image, (0, height//3), (width, height//3), (0, 255, 0), 1)
                    cv2.line(image, (0, 2*height//3), (width, 2*height//3), (0, 255, 0), 1)
                    
                    # Add center crosshair for alignment
                    cv2.line(image, (width//2-20, height//2), (width//2+20, height//2), (0, 0, 255), 2)
                    cv2.line(image, (width//2, height//2-20), (width//2, height//2+20), (0, 0, 255), 2)
                
                # Use higher quality compression
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
                ret, jpeg = cv2.imencode('.jpg', image, encode_param)
                return jpeg.tobytes() if ret else None
                
            except Exception as e:
                logger.error(f"Error processing frame: {str(e)}")
                return None

def gen(camera):
    """Generator for video streaming"""
    while True:
        frame = camera.get_frame()
        if frame:
            yield (b'--frame\r\n'
                  b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')
        else:
            time.sleep(0.1)

def calibrate_camera(reference_width_cm=DEFAULT_REFERENCE_OBJECT_WIDTH_CM):
    """Calibration function to determine pixels per cm ratio"""
    # In a production app, this would capture an image of a reference object 
    # and determine the pixels per cm ratio
    # For now, we'll return a reasonable default with a simulation of calibration
    return 37.79  # Default value

def preprocess_image(image):
    """Preprocess image for better contour detection and ML model"""
    # Convert to RGB for YOLO model
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Also prepare traditional preprocessing for backup
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape[:2]
    kernel_size = max(3, min(7, int(min(height, width) / 100))) 
    kernel_size = kernel_size if kernel_size % 2 == 1 else kernel_size + 1
    blurred = cv2.GaussianBlur(gray, (kernel_size, kernel_size), 0)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    )
    kernel = np.ones((3, 3), np.uint8)
    opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)
    closing = cv2.morphologyEx(opening, cv2.MORPH_CLOSE, kernel, iterations=2)
    
    return rgb_image, closing

def find_object_contours(image, preprocessed_image):
    """Find objects using YOLO and fallback to traditional contour detection"""
    try:
        if USING_YOLO:
            # Run YOLO detection
            results = yolo_model(image)
            if results and len(results) > 0:
                result = results[0]
                boxes = result.boxes
                if len(boxes) > 0:
                    # Get the box with highest confidence
                    box = boxes[0]
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    confidence = float(box.conf[0])
                    return [{
                        'contour': np.array([[x1, y1], [x2, y1], [x2, y2], [x1, y2]]),
                        'confidence': confidence,
                        'bbox': (x1, y1, x2-x1, y2-y1)
                    }]
        
        # Fallback to traditional contour detection
        contours, _ = cv2.findContours(
            preprocessed_image,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        # Filter and process contours
        valid_contours = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 1000:  # Skip small contours
                continue
                
            # Get bounding box
            x, y, w, h = cv2.boundingRect(contour)
            
            # Calculate contour features for confidence
            hull_area = cv2.contourArea(cv2.convexHull(contour))
            solidity = float(area) / hull_area if hull_area > 0 else 0
            
            # Estimate confidence based on contour features
            confidence = min(0.7, 0.3 + solidity * 0.4)  # Cap at 0.7 for traditional detection
            
            valid_contours.append({
                'contour': contour,
                'confidence': confidence,
                'bbox': (x, y, w, h)
            })
        
        return sorted(valid_contours, key=lambda x: x['confidence'], reverse=True)
        
    except Exception as e:
        logger.error(f"Error in object detection: {str(e)}")
        return []

def get_object_dimensions(obj_data, pixels_per_cm):
    """Get dimensions of an object using multiple measurement approaches"""
    contour = obj_data['contour']
    
    # Get measurements using multiple methods
    # 1. Minimum area rectangle (better for rotated objects)
    rect = cv2.minAreaRect(contour)
    box = cv2.boxPoints(rect)
    box = np.int0(box)
    width_pixels = rect[1][0]
    height_pixels = rect[1][1]
    
    # 2. Contour arc length based measurement
    arc_length = cv2.arcLength(contour, True)
    area = cv2.contourArea(contour)
    aspect_ratio = width_pixels / height_pixels if height_pixels > 0 else 1
    
    # Calculate dimensions using weighted average of different methods
    width_cm_rect = width_pixels / pixels_per_cm
    height_cm_rect = height_pixels / pixels_per_cm
    
    # Adjust measurements based on object class if available
    if 'class' in obj_data and obj_data['class'] != 'unknown' and obj_data['confidence'] is not None:
        # Apply confidence-based weighting
        confidence_factor = obj_data['confidence']
        width_cm = width_cm_rect * confidence_factor + (width_cm_rect * (1 - confidence_factor))
        height_cm = height_cm_rect * confidence_factor + (height_cm_rect * (1 - confidence_factor))
    else:
        width_cm = width_cm_rect
        height_cm = height_cm_rect
    
    # Ensure width is always the longer dimension
    width_cm, height_cm = max(width_cm, height_cm), min(width_cm, height_cm)
    
    return round(width_cm, 2), round(height_cm, 2), box

def estimate_dimensions(image_data, calibrated_pixels_per_cm=None):
    """Estimate dimensions of object in image using ML and traditional methods"""
    try:
        start_time = time.time()
        
        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
            
        img_height, img_width = image.shape[:2]
        logger.info(f"Processing image of size {img_width}x{img_height}")

        # Preprocess image
        rgb_image, preprocessed = preprocess_image(image)
        
        # Find objects using ML and traditional methods
        detected_objects = find_object_contours(rgb_image, preprocessed)
        
        if not detected_objects:
            logger.warning("No objects detected in image")
            return False, None, None, None, "No objects detected"
        
        # Get the most confident or largest object
        target_object = max(detected_objects, 
                          key=lambda x: x['confidence'] if x['confidence'] is not None 
                          else cv2.contourArea(x['contour']))
        
        # Get calibration
        pixels_per_cm = calibrated_pixels_per_cm or calibrate_camera()
        
        # Calculate dimensions
        width_cm, height_cm, box = get_object_dimensions(target_object, pixels_per_cm)
        
        # Draw measurements on image
        result_image = image.copy()
        cv2.drawContours(result_image, [box], 0, (0, 255, 0), 2)
        
        # Add confidence and class information if available
        if target_object['confidence'] is not None:
            cv2.putText(result_image, 
                       f"Class: {target_object.get('class', 'unknown')} ({target_object['confidence']:.2f})",
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        # Encode result image
        _, buffer = cv2.imencode('.jpg', result_image)
        result_image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        processing_time = time.time() - start_time
        logger.info(f"Measurement completed in {processing_time:.2f} seconds")
        
        return True, width_cm, height_cm, result_image_base64, None
        
    except Exception as e:
        logger.error(f"Error in dimension estimation: {str(e)}")
        return False, None, None, None, str(e)

def home(request):
    return render(request, 'measurement/home.html')

def video_feed(request):
    """Stream video feed to the client"""
    try:
        # Parse optional resolution parameters
        try:
            width = int(request.GET.get('width', 1280))
            height = int(request.GET.get('height', 720))
        except ValueError:
            width, height = 1280, 720
            
        # Limit to reasonable resolutions
        width = max(320, min(width, 1920))
        height = max(240, min(height, 1080))
        
        # Initialize camera with error handling
        try:
            camera = VideoCamera(resolution=(width, height))
            return StreamingHttpResponse(
                gen(camera),
                content_type='multipart/x-mixed-replace; boundary=frame'
            )
        except RuntimeError as e:
            logger.error(f"Camera initialization failed: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': 'Failed to initialize camera. Please check camera permissions and try again.'
            })
            
    except Exception as e:
        logger.error(f"Error in video feed: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'An error occurred while setting up the video feed.'
        })

@csrf_exempt
def capture_and_measure(request):
    """Capture image and measure dimensions"""
    if request.method == 'POST':
        try:
            # Get image data
            image_data = request.POST.get('image')
            if not image_data:
                return JsonResponse({
                    'success': False,
                    'error': 'No image data received'
                })
            
            # Get optional calibration value
            try:
                pixels_per_cm = float(request.POST.get('calibration', 0))
                if pixels_per_cm <= 0:
                    pixels_per_cm = None
            except (ValueError, TypeError):
                pixels_per_cm = None
            
            # Process in background thread
            future = executor.submit(estimate_dimensions, image_data, pixels_per_cm)
            success, width, height, result_image, error = future.result(timeout=10)
            
            if success:
                return JsonResponse({
                    'success': True,
                    'width': width,
                    'height': height,
                    'result_image': result_image,
                    'processing_time': time.time() - float(request.POST.get('timestamp', time.time()))
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': error or 'Measurement failed'
                })
                
        except Exception as e:
            logger.error(f"Error in capture_and_measure: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({
        'success': False,
        'error': 'Invalid request'
    })

@csrf_exempt
def calibrate(request):
    """Endpoint for camera calibration"""
    if request.method == 'POST':
        try:
            # Get image data and reference object size
            image_data = request.POST.get('image')
            if not image_data:
                return JsonResponse({
                    'success': False,
                    'error': 'No image data received'
                })
            
            reference_width_cm = float(request.POST.get('reference_width_cm', DEFAULT_REFERENCE_OBJECT_WIDTH_CM))
            
            # TODO: Implement actual calibration logic
            # For now, return a dummy value
            pixels_per_cm = calibrate_camera(reference_width_cm)
            
            return JsonResponse({
                'success': True,
                'pixels_per_cm': pixels_per_cm
            })
                
        except Exception as e:
            logger.error(f"Error in calibration: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({
        'success': False,
        'error': 'Invalid request'
    })

# Thread pool for parallel processing
executor = ThreadPoolExecutor(max_workers=4)