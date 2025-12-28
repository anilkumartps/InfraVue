# import eventlet
# eventlet.monkey_patch()

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import time
import threading
from camera import Camera
import base64
import cv2

# Initialize Flask App
# Serve static files from the build directory
app = Flask(__name__, static_folder='../InfraVue_webpage/dist', static_url_path='')
CORS(app)
# Use threading for async_mode since eventlet conflicts with Picamera2/libcamera
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Configuration
SAVE_DIR = os.path.join(os.path.expanduser("~"), "rpi_captures")
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

# Camera Instance (Global)
# We initialize it lazily or on startup? Startup is better to detect errors early.
try:
    camera = Camera()
except Exception as e:
    print(f"Warning: Camera initialization failed: {e}")
    camera = None

# Streaming State
streaming_active = False
clients_connected = 0
streaming_thread = None

def background_stream():
    """Background task to emit frames to clients."""
    global streaming_active
    print("Streaming background task started")
    frames_sent = 0
    while streaming_active:
        if camera:
            frame_bytes = camera.get_frame()
            if frame_bytes:
                # Encode to base64
                b64_frame = base64.b64encode(frame_bytes).decode('utf-8')
                socketio.emit('image', b64_frame)
                frames_sent += 1
                if frames_sent % 50 == 0:
                    print(f"Sent {frames_sent} frames")
            else:
                # No frame available yet
                pass
        socketio.sleep(0.1) # ~10 FPS (100ms)
    print("Streaming background task stopped")

def start_streaming_if_needed():
    global streaming_active, streaming_thread
    if not streaming_active:
        streaming_active = True
        streaming_thread = socketio.start_background_task(background_stream)

def stop_streaming_if_no_clients():
    global streaming_active, clients_connected
    if clients_connected <= 0:
        streaming_active = False
        # Thread will exit on next loop

def generate_filename(extension):
    now = time.localtime()
    # Format: file_DDMMYYHHMMSS.ext matches Node.js implementation
    date_str = time.strftime("%d%m%y%H%M%S", now)
    return f"file_{date_str}.{extension}"

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    # SPA Fallback for React Router
    if os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    return "Not Found", 404

# --- API Endpoints ---

@app.route('/api/capture', methods=['GET'])
def capture_api():
    print("capture request received")
    try:
        filename = generate_filename('jpg')
        filepath = os.path.join(SAVE_DIR, filename)
        if camera and camera.capture_snapshot(filepath):
            return "OK", 200
        else:
            return "Failed to capture", 500
    except Exception as e:
        print(f"Error in capture: {e}")
        return "Error", 500

@app.route('/api/start_recording', methods=['POST'])
def start_recording_api():
    print("Start recording request received")
    try:
        filename = generate_filename('mp4')
        filepath = os.path.join(SAVE_DIR, filename)
        if camera:
            success = camera.start_recording(filepath)
            if success:
                return jsonify({"isRecording": True})
        return jsonify({"error": "Failed to start"}), 500
    except Exception as e:
        print(f"Error starting recording: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/stop_recording', methods=['POST'])
def stop_recording_api():
    print("Stop recording request received")
    try:
        if camera:
            camera.stop_recording()
        return jsonify({"isRecording": False})
    except Exception as e:
        print(f"Error stopping recording: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/filesList', methods=['GET'])
def files_list_api():
    print("fileList api request received")
    try:
        if not os.path.exists(SAVE_DIR):
             return jsonify([])
        files = os.listdir(SAVE_DIR)
        # Filter for known extensions if needed, keeping simple for now
        # Also exclude thumbnails from the main list? Node.js implementation didn't explicitly filter.
        # But commonly we don't want to list thumbnails as separate items if they are auxiliary.
        # However, Node.js code: files.map... returning imageSrc: "".
        # It returned ALL files.
        file_list = []
        for f in files:
            # Basic filter to avoid system files and thumbnails
            if f.startswith('.') or f.startswith('thumb_'): continue
            file_list.append({
                "imageSrc": "", 
                "fileName": f
            })
        return jsonify(file_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/downloadFile', methods=['GET'])
def download_file_api():
    print("download file api request received")
    filename = request.args.get('fileName')
    if not filename:
        return "File name is required", 400
    try:
        return send_from_directory(SAVE_DIR, filename, as_attachment=True)
    except Exception as e:
        return "File not found", 404

@app.route('/api/deleteFile', methods=['GET'])
def delete_file_api():
    print("delete file api request received")
    filename = request.args.get('fileName')
    if not filename:
        return "File name is required", 400
    filepath = os.path.join(SAVE_DIR, filename)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            # Try to delete thumbnail if it exists
            name, ext = os.path.splitext(filename)
            thumb_name = f"thumb_{name}.jpg"
            thumb_path = os.path.join(SAVE_DIR, thumb_name)
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
            return "File Deleted", 200
        except Exception as e:
            print(f"Error deleting file: {e}")
            return "Error deleting file", 500
    else:
        return "File not found", 404

@app.route('/api/image_preview', methods=['GET'])
def image_preview_api():
    print("preview -image file api request received")
    filename = request.args.get('fileName')
    if not filename:
        return "File name required", 400
    
    filepath = os.path.join(SAVE_DIR, filename)
    if not os.path.exists(filepath):
         return "File not found", 404

    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.jpg', '.jpeg', '.png']:
        return send_file(filepath)
    elif ext in ['.mp4', '.avi', '.mov']:
        # Generate thumbnail
        name = os.path.splitext(filename)[0]
        thumb_name = f"thumb_{name}.jpg"
        thumb_path = os.path.join(SAVE_DIR, thumb_name)
        
        if os.path.exists(thumb_path):
            return send_file(thumb_path)
        else:
            # Generate thumb using ffmpeg
            try:
                # ffmpeg -i input.mp4 -ss 00:00:00.500 -vframes 1 -s 300x300 output.jpg
                import subprocess
                cmd = [
                    'ffmpeg', '-y', 
                    '-i', filepath, 
                    '-ss', '00:00:00.500', 
                    '-vframes', '1', 
                    '-s', '300x300', 
                    thumb_path
                ]
                subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
                if os.path.exists(thumb_path):
                    return send_file(thumb_path)
                else:
                    return "Could not generate thumbnail", 500
            except Exception as e:
                 print(f"Thumb gen error: {e}")
                 return "Error", 500
    else:
        return "Unsupported extension", 404

@app.route('/api/start_stream', methods=['POST'])
def start_stream_api():
    print("API start stream")
    start_streaming_if_needed()
    return jsonify({"streaming": True})

@app.route('/api/stop_stream', methods=['POST'])
def stop_stream_api():
    print("API stop stream")
    global streaming_active
    streaming_active = False
    return jsonify({"streaming": False})

# --- Socket Events ---

@socketio.on('connect')
def handle_connect():
    global clients_connected
    clients_connected += 1
    print(f'New client connected. Total: {clients_connected}')
    # Auto-start streaming when a client connects
    start_streaming_if_needed()

@socketio.on('disconnect')
def handle_disconnect():
    global clients_connected
    clients_connected -= 1
    print(f'Client disconnected. Total: {clients_connected}')
    stop_streaming_if_no_clients()

if __name__ == '__main__':
    # Run server on port 3000
    print("Starting Python server on port 3000")
    socketio.run(app, host='0.0.0.0', port=3000, allow_unsafe_werkzeug=True)

