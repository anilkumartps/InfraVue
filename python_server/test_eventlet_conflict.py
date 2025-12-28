import eventlet
eventlet.monkey_patch()
import time
from picamera2 import Picamera2

print("Monkey patched. Initializing Picamera2...")
picam2 = Picamera2()
config = picam2.create_preview_configuration(main={"size": (640, 480), "format": "RGB888"})
picam2.configure(config)
print("Starting Picamera2...")
picam2.start()
print("Started. Capturing...")
frame = picam2.capture_array()
print("Captured.")
picam2.stop()
print("Stopped.")



