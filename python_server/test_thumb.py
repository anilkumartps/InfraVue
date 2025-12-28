import cv2
import os

def test_thumb(filepath):
    print(f"Testing thumb gen for {filepath}")
    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        print("Failed to open video file")
        return
    
    # Seek
    cap.set(cv2.CAP_PROP_POS_MSEC, 500)
    ret, frame = cap.read()
    if ret:
        print(f"Frame read successfully. Shape: {frame.shape}")
        cv2.imwrite("test_thumb.jpg", frame)
    else:
        print("Failed to read frame")
    cap.release()

if __name__ == "__main__":
    # Find a video file
    save_dir = os.path.join(os.path.expanduser("~"), "rpi_captures")
    files = [f for f in os.listdir(save_dir) if f.endswith(".mp4")]
    if files:
        test_thumb(os.path.join(save_dir, files[0]))
    else:
        print("No video files found")

