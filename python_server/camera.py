import threading
import time
import os
import cv2
import numpy as np
from picamera2 import Picamera2

class Camera:
    def __init__(self):
        self.picam2 = Picamera2()
        # Configure camera for video recording and preview
        # We need a configuration that supports both video recording (H.264 potentially) and raw capture for streaming/snapshot.
        # Picamera2 is flexible. We can create a configuration with 'main' for high res/recording and 'lo' for preview/streaming.
        # For simplicity, let's use a single main stream at 640x480 for everything to start, as requested.
        
        config = self.picam2.create_preview_configuration(main={"size": (640, 480), "format": "RGB888"})
        self.picam2.configure(config)
        self.picam2.start()
        
        self.is_recording = False
        self.video_output = None # Will hold FfmpegOutput or similar if using picamera2's encoder, OR we manually write
        # Manual writing with OpenCV VideoWriter from array is slow. Picamera2 has efficient H.264 encoding.
        # However, to keep it simple and consistent with previous architecture where we get frames:
        
        self.lock = threading.Lock()
        self.running = True
        
        # We don't need a separate thread for capturing if we use picamera2's request system or just call capture_array
        # But for streaming, we want non-blocking access.
        
        # NOTE: capture_array() is blocking until a frame arrives.
        
        self.latest_frame = None
        self.thread = threading.Thread(target=self._capture_loop)
        self.thread.daemon = True
        self.thread.start()
        
        self.video_writer = None # OpenCV VideoWriter

    def _capture_loop(self):
        print("Camera capture loop started")
        while self.running:
            try:
                # Capture frame as numpy array
                # This waits for the next frame
                # print("Waiting for frame...")
                frame = self.picam2.capture_array()
                # print("Frame received from picam2")
                
                # IMPORTANT: picamera2 returns array which might be read-only or shared buffer?
                # Let's ensure we copy it or handle it safely.
                
                with self.lock:
                    # Convert RGB to BGR for OpenCV
                    self.latest_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                    # print("Frame captured") 
                    
                    if self.is_recording and self.video_writer:
                        self.video_writer.write(self.latest_frame)
            except Exception as e:
                print(f"Error in capture loop: {e}")
                time.sleep(0.1)

    def get_frame(self):
        """Return the current frame as JPEG bytes."""
        with self.lock:
            if self.latest_frame is not None:
                ret, jpeg = cv2.imencode('.jpg', self.latest_frame)
                if ret:
                    return jpeg.tobytes()
        return None

    def start_recording(self, filepath):
        """Start recording video to the specified filepath."""
        with self.lock:
            if self.is_recording:
                print("Already recording.")
                return True
            
            print(f"Starting recording to {filepath}")
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            # Using OpenCV VideoWriter with the frames we are already capturing
            # codec 'mp4v' or 'X264' if available. 
            # Note: For efficient RPi recording, using picamera2's encoder directly is better, 
            # but that requires a different architecture (encoder output).
            # Given the constraints, we'll try OpenCV writer first.
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            self.video_writer = cv2.VideoWriter(filepath, fourcc, 20.0, (640, 480))
            
            if not self.video_writer.isOpened():
                print("Failed to open VideoWriter")
                self.video_writer = None
                return False
                
            self.is_recording = True
            return True

    def stop_recording(self):
        """Stop current recording."""
        with self.lock:
            if self.is_recording:
                print("Stopping recording.")
                self.is_recording = False
                if self.video_writer:
                    self.video_writer.release()
                    self.video_writer = None
                return True
        return False

    def capture_snapshot(self, filepath):
        """Save the current frame to a file."""
        with self.lock:
            if self.latest_frame is not None:
                print(f"Capturing snapshot to {filepath}")
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                cv2.imwrite(filepath, self.latest_frame)
                return True
            else:
                print("No frame to capture.")
        return False

    def stop(self):
        """Release resources."""
        self.running = False
        if self.thread.is_alive():
            self.thread.join()
        self.picam2.stop()
