import cv2
import time
import os

def test_camera():
    print("Testing OpenCV Camera Access...")
    
    # Try different backends
    backends = [cv2.CAP_V4L2, cv2.CAP_ANY]
    devices = ['/dev/video0', 0]
    
    cap = None
    selected_device = None
    
    for device in devices:
        for backend in backends:
            print(f"Trying device {device} with backend {backend}...")
            temp_cap = cv2.VideoCapture(device, backend)
            
            if temp_cap.isOpened():
                # Set properties
                temp_cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'YUYV'))
                temp_cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                temp_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                
                # Try reading a frame
                ret, frame = temp_cap.read()
                if ret and frame is not None and frame.size > 0:
                    print(f"SUCCESS: Frame read from {device} using backend {backend}")
                    print(f"Frame shape: {frame.shape}")
                    cap = temp_cap
                    selected_device = device
                    break
                else:
                    print(f"Failed to read frame from {device}")
                    temp_cap.release()
            else:
                print(f"Failed to open {device}")
        
        if cap: break
    
    if cap is None:
        print("ERROR: Could not find a working camera.")
        return

    print("Capturing 10 frames...")
    start_time = time.time()
    for i in range(10):
        ret, frame = cap.read()
        if not ret:
            print(f"Frame {i} failed")
        else:
            print(f"Frame {i} captured")
    
    end_time = time.time()
    print(f"10 frames captured in {end_time - start_time:.2f} seconds")
    
    # Save a test image
    ret, frame = cap.read()
    if ret:
        cv2.imwrite('test_capture.jpg', frame)
        print("Saved test_capture.jpg")
    
    cap.release()

if __name__ == "__main__":
    test_camera()



