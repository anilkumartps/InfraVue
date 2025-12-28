import time
from picamera2 import Picamera2

def test_picamera2():
    print("Testing Picamera2...")
    try:
        picam2 = Picamera2()
        config = picam2.create_preview_configuration(main={"size": (640, 480), "format": "RGB888"})
        picam2.configure(config)
        picam2.start()
        
        print("Camera started. Capturing frames...")
        start_time = time.time()
        for i in range(10):
            frame = picam2.capture_array()
            print(f"Frame {i} captured, shape: {frame.shape}")
        
        end_time = time.time()
        print(f"10 frames captured in {end_time - start_time:.2f} seconds")
        
        picam2.stop()
        print("Success!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_picamera2()

