# InfraVue: Raspberry Pi Camera Streaming & Control

InfraVue is a full-stack application designed to stream live video from a Raspberry Pi camera to a web interface. It allows users to view a live feed, capture snapshots, record videos, and manage the gallery of saved files.

## 🏗 System Architecture

The project consists of two main components:

1.  **Frontend (`InfraVue_webpage/`)**: A modern **React** application (built with Vite + Tailwind CSS) that provides the user interface. It connects to the backend via **Socket.IO** for live video streaming and **HTTP REST APIs** for controls (capture, record, file management).
2.  **Backend (`python_server/`)**: A **Flask** server running on the Raspberry Pi. It interacts directly with the camera hardware to capture frames, stream them to connected clients, and manage file storage.

**Note**: A legacy/alternative Node.js server exists in the `server/` directory, but the Python server is recommended for better hardware integration.

## 🚀 Getting Started

### Prerequisites

*   Raspberry Pi with a camera module installed and enabled (`libcamera` support).
*   Python 3.9+.
*   Node.js & npm (only required if you need to rebuild the frontend).

### 1. Frontend Setup (Optional)

The Python server is configured to serve the built frontend files from `InfraVue_webpage/dist`. If you want to modify the UI, you need to rebuild it:

```bash
cd InfraVue_webpage
npm install
npm run build
```

This will generate the static files in `dist/`, which the Python server will serve automatically.

### 2. Python Server Setup

Navigate to the python server directory and set up the environment:

```bash
cd python_server

# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Key Dependencies:**
*   `flask`, `flask-socketio`, `flask-cors`: Web server and websocket handling.
*   `opencv-python-headless`: Image processing.
*   `picamera2` (usually pre-installed on RPi OS) or `libcamera` bindings.

### 3. Running the Application

Ensure your camera is connected and no other processes are using it.

```bash
# From the python_server directory
source venv/bin/activate
python3 app.py
```

The server will start on **port 3000** (default).
Access the interface by opening your browser and navigating to:
`http://<YOUR_RASPBERRY_PI_IP>:3000`

## 📡 API & Features

### Live Streaming
*   **Protocol**: Socket.IO
*   **Event**: `image` (Server emits base64 encoded JPEG frames)
*   The server uses a background thread to capture frames and broadcast them to all connected clients.

### REST API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/capture` | `GET` | Takes a snapshot and saves it to the gallery. |
| `/api/start_recording` | `POST` | Starts recording video to a file. |
| `/api/stop_recording` | `POST` | Stops the current video recording. |
| `/api/filesList` | `GET` | Returns a JSON list of saved images/videos. |
| `/api/downloadFile` | `GET` | Downloads a specific file (param: `fileName`). |
| `/api/deleteFile` | `GET` | Deletes a file (param: `fileName`). |

## 📂 Project Structure

*   `InfraVue_webpage/`: Frontend source code (React).
*   `python_server/`: Main Python backend application.
    *   `app.py`: Server entry point, API routes, and Socket.IO events.
    *   `camera.py`: Camera hardware abstraction layer.
*   `server/`: Alternative Node.js backend (uses ffmpeg/exec).

## 💡 Troubleshooting

*   **Camera Conflicts**: Ensure `libcamera-hello` works in the terminal. If another process (like the Node server) is running, the Python script may fail to access the camera.
*   **Performance**: Streaming is handled in a background thread (`threading` mode) to prevent blocking the Flask server.

