const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors')
const bodyParser = require('body-parser')
const common = require('./common')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process');


const APP_PORT = 3000;
const SOCKET_PORT = 4000;

const app = express();
const port = process.env.PORT || APP_PORT;
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Replace with your Vite development server URL
    methods: ['GET', 'POST']
  }
});

var isRecording = false;
let ffmpegProcess = null;
let videoPath = null;

// Set ffmpeg path (it will be found in system PATH)
ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
ffmpeg.setFfprobePath('/usr/bin/ffprobe');

// Serve static files (HTML, JS, CSS)
// Prefer the frontend build in ../InfraVue_webpage/dist when available,
// otherwise fall back to the server `public` folder.
const frontendDist = path.join(__dirname, '../InfraVue_webpage/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
} else {
  app.use(express.static('public'));
}

app.use(cors({
  origin: '*', // Update this to match your React app URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

// If a built frontend exists, serve its index.html for the root and any
// client-side routes (SPA fallback). Otherwise keep existing behavior.
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });

  // SPA fallback: return index.html for unknown GET routes (so React Router works)
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    const accept = req.headers.accept || '';
    if (accept.indexOf('text/html') !== -1) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
} else {
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "../InfraVue_webpage/index.html"))
  });
}

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });




app.get("/api/capture", (req, res) => {
  console.log("capture request recieved")
  try {
    captureImage();
    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
})

app.post("/api/start_recording", (req, res) => {
  console.log("Start recording request received");
  if (!isRecording) {
    try {
      videoPath = path.join(common.SAVE_DIR, generateFileName("mp4"));
      isRecording = true;

      // Use ffmpeg to capture from /dev/video0 (default camera)
      ffmpegProcess = ffmpeg('/dev/video0')
        .inputOptions('-f v4l2')
        .inputOptions('-video_size 640x480')
        .inputOptions('-framerate 20')
        .output(videoPath)
        .outputOptions('-c:v libx264')
        .outputOptions('-preset fast')
        .on('start', () => {
          console.log(`Recording started. Saving to ${videoPath}`);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          isRecording = false;
        })
        .run();

      res.status(200).json({ isRecording: true });
    } catch (error) {
      console.error("Error starting recording:", error);
      isRecording = false;
      res.status(500).json({ error: "Failed to start recording" });
    }
  } else {
    res.status(200).json({ isRecording: true });
  }
});

app.post('/api/stop_recording', (req, res) => {
  if (isRecording && ffmpegProcess) {
    try {
      ffmpegProcess.kill();
      console.log("Recording stopped.");
      isRecording = false;
      ffmpegProcess = null;
      res.status(200).json({ isRecording: false });
    } catch (error) {
      console.error("Error stopping recording:", error);
      res.status(500).json({ error: "Failed to stop recording" });
    }
  } else {
    res.status(200).json({ isRecording: false });
  }
});


app.get('/api/filesList', (req, res) => {
  console.log("fileList api request received")
  // Read the folder and get the list of files
  fs.readdir(common.SAVE_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to scan directory' });
    }

    // Create the JSON array in the desired format
    const fileList = files.map((fileName) => {
      return {
        imageSrc: "", // Assuming the files are served from /images
        fileName: fileName,
      };
    });

    // Send the JSON response
    res.json(fileList);
  });
});


app.get('/api/downloadFile', (req, res) => {
  console.log("download file api request received")
  // Read the folder and get the list of files
  const fileName = req.query.fileName;

  if (!fileName) {
    return res.status(400).send('File name is required');
  }

  // Construct the full file path
  const filePath = path.join(common.SAVE_DIR, fileName);
  if (fs.existsSync(filePath)) {
    // Check if the file exists
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        return res.status(404).send('File not found');
      }
      console.log('File downloaded successfully:', fileName);
    });
  } else {
    res.status(404).send('File not found');
  }

});

app.get('/api/deleteFile', (req, res) => {
  console.log("delete file api request received")
  // Read the folder and get the list of files
  const fileName = req.query.fileName;

  if (!fileName) {
    return res.status(400).send('File name is required');
  }

  // Construct the full file path
  const filePath = path.join(common.SAVE_DIR, fileName);
  if (fs.existsSync(filePath)) {
    // Check if the file exists
    try {
      fs.rmSync(filePath);
      res.status(200).send("File Deleted")
    } catch {
      console.error('Error deleting file:', err);
      return res.status(404).send('File not found');
    }
  } else {
    res.status(404).send('File not found');
  }

});

app.get('/api/image_preview', (req, res) => {
  console.log("preview -image file api request received")
  const fileName = req.query.fileName;
  const filePath = path.join(common.SAVE_DIR, fileName);
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".png" || extension === ".jpg" || extension === ".jpeg") {
    // For image files, just send them directly
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Image file not found');
    }
  } else if (extension === ".mp4" || extension === ".avi" || extension === ".mov") {
    // Generate thumbnail from video using ffmpeg
    const thumbnailPath = path.join(common.SAVE_DIR, `thumb_${path.basename(fileName, path.extname(fileName))}.jpg`);
    
    if (fs.existsSync(thumbnailPath)) {
      res.sendFile(thumbnailPath);
    } else {
      // Generate thumbnail
      ffmpeg(filePath)
        .screenshot({
          timestamps: ['00:00:00.500'],
          filename: `thumb_${path.basename(fileName, path.extname(fileName))}.jpg`,
          folder: common.SAVE_DIR,
          size: '300x300'
        })
        .on('end', () => {
          res.sendFile(thumbnailPath);
        })
        .on('error', (err) => {
          console.error('Error generating thumbnail:', err);
          res.status(500).send('Could not generate thumbnail');
        });
    }
  } else {
    res.status(404).send("File extension not supported");
  }
});

app.post('/api/start_stream', (req, res) => {
  try {
    startCameraStream();
    res.status(200).json({ streaming: true });
  } catch (err) {
    console.error('Error starting stream:', err);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

app.post('/api/stop_stream', (req, res) => {
  try {
    stopCameraStream();
    res.status(200).json({ streaming: false });
  } catch (err) {
    console.error('Error stopping stream:', err);
    res.status(500).json({ error: 'Failed to stop stream' });
  }
});

/**
 * Generates a file name based on the current date and time.
 * @param {string} extension - The file extension (e.g., 'jpg', 'mp4').
 * @returns {string} - The generated file name with date and time.
 */
function generateFileName(extension) {
  function formatDate(date) {
    const padToTwoDigits = (num) => num.toString().padStart(2, '0');
  
    const day = padToTwoDigits(date.getDate());
    const month = padToTwoDigits(date.getMonth() + 1); // Months are zero-based, so we add 1
    const year = padToTwoDigits(date.getFullYear() % 100); // Get the last two digits of the year
    const hours = padToTwoDigits(date.getHours());
    const minutes = padToTwoDigits(date.getMinutes());
    const seconds = padToTwoDigits(date.getSeconds());
  
    return `${day}${month}${year}${hours}${minutes}${seconds}`;
  }

  // Get the current date and time
  let now = new Date();
  now = formatDate(now);
  // Format the date and time to YYYY-MM-DD_HH-MM-SS
  const formattedDate = now

  // Generate the file name with extension
  const fileName = `file_${formattedDate}.${extension}`;

  return fileName;
}

// Capture a snapshot from the camera using ffmpeg
// Capture a snapshot from the camera using Picamera2 via Python helper
const captureImage = () => {
  try {
    const filePath = path.join(common.SAVE_DIR, generateFileName("jpg"));
    const script = path.join(__dirname, 'tools', 'capture_image.py');
    exec(`python3 "${script}" "${filePath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error capturing image:', error, stderr);
      } else {
        console.log(`Image saved to ${filePath}`);
      }
    });
  } catch (error) {
    console.error('Error capturing image:', error);
  }
};

// Stream camera feed to clients using ffmpeg
let streamProcess = null;
let streamCapturing = false;
let streamInterval = null;

const startCameraStream = () => {
  // Capture frames periodically using the Python helper and emit base64 JPEGs
  const script = path.join(__dirname, 'tools', 'capture_image.py');
  const streamFile = path.join(common.SAVE_DIR, '_stream.jpg');
  if (streamInterval) return;
  streamInterval = setInterval(() => {
    if (streamCapturing) return;
    streamCapturing = true;
    exec(`python3 "${script}" "${streamFile}"`, (error) => {
      streamCapturing = false;
      if (error) {
        console.error('Stream capture error:', error);
        return;
      }
      fs.readFile(streamFile, (err, data) => {
        if (err) return;
        io.emit('image', data.toString('base64'));
      });
    });
  }, 200); // ~5 FPS to reduce CPU
};

const stopCameraStream = () => {
  if (streamInterval) {
    clearInterval(streamInterval);
    streamInterval = null;
  }
};

server.listen(APP_PORT, () => {
  console.log("server running on:" + APP_PORT);
  // Do not start automatic streaming by default to avoid camera conflicts.
  // startCameraStream();
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
