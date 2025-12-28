# InfraVue Python Server

This is a Python-based server for the InfraVue project, replacing the original Node.js implementation. It uses Flask, Flask-SocketIO, and OpenCV.

## Requirements

- Python 3.7+
- Raspberry Pi with Camera (Libcamera/V4L2 compatible)

## Installation

1. Install system dependencies:
   ```bash
   sudo apt update
   sudo apt install python3-opencv libatlas-base-dev
   ```

2. Install Python dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```
   (Ideally, use a virtual environment).

## Running the Server

1. Navigate to the `python_server` directory:
   ```bash
   cd python_server
   ```

2. Run the application:
   ```bash
   python3 app.py
   ```

The server runs on port 3000 by default.

## Features

- **Streaming**: Streams camera feed via Socket.IO to connected clients.
- **Recording**: Records video to `~/rpi_captures`.
- **Snapshots**: Captures images to `~/rpi_captures`.
- **File Management**: Lists, downloads, previews, and deletes captured files.
- **Frontend Integration**: Serves the built React frontend from `../InfraVue_webpage/dist`.

## Configuration

- **Camera**: Defaults to device 0 (`/dev/video0`). configuration can be adjusted in `camera.py`.
- **Storage**: Files are saved to `~/rpi_captures`.



