#!/usr/bin/env python3
import sys
from picamera2 import Picamera2
from PIL import Image

out = sys.argv[1]
picam2 = Picamera2()
config = picam2.create_preview_configuration({'size': (640, 480)})
picam2.configure(config)
picam2.start()
try:
    frame = picam2.capture_array()
    img = Image.fromarray(frame)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    img.save(out, format='JPEG', quality=85)
    print('OK')
except Exception as e:
    print('ERROR', e, file=sys.stderr)
    sys.exit(1)
finally:
    picam2.stop()
