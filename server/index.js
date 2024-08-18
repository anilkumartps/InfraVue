const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cv = require('opencv4nodejs');
const cors = require('cors')
const bodyParser = require('body-parser')
const common = require('./common')
const path = require('path')
const fs = require('fs')


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
let videoWriter = null;

// Serve static files (HTML, JS, CSS)
app.use(express.static('public'));

app.use(cors({
  origin: '*', // Update this to match your React app URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "../InfraVue_webpage/index.html"))
});

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
      const filePath = path.join(common.SAVE_DIR, generateFileName("avi"));

      // Define the codec and create a VideoWriter
      videoWriter = new cv.VideoWriter(
        filePath,
        cv.VideoWriter.fourcc('XVID'), // Codec
        20, // FPS
        new cv.Size(640, 480) // Frame size
      );
      console.log(`Recording started. Saving to ${filePath}`);
      isRecording = true;
      captureAndWriteFrames();
      res.status(200).json({ isRecording: true });
    } catch (error) {
      console.error("Error starting recording:", error);
      res.status(500).json({ error: "Failed to start recording" });
    }
  } else {
    res.status(200).json({ isRecording: true });
  }
});

app.post('/api/stop_recording', (req, res) => {
  if (isRecording) {
    try {
      videoWriter.release(); // Stop the recording
      console.log("Recording stopped.");
      isRecording = false;
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
  // Read the folder and get the list of files
  const fileName = req.query.fileName;
  // console.log("fileName:", fileName)
  const filePath = path.join(common.SAVE_DIR, fileName);
  // console.log("filePath:", filePath)

  const extension = path.extname(filePath);
  // console.log("extension:",extension);
  if (extension == ".PNG") {
    // console.log("file Path is PNG")
    // Load the image
    const image = cv.imread(filePath);

    // Scale down the image while maintaining the aspect ratio
    const maxDim = 300;  // Set the maximum dimension for the scaled-down image
    const aspectRatio = image.rows / image.cols;
    let newWidth, newHeight;

    if (image.cols > image.rows) {
      newWidth = maxDim;
      newHeight = Math.round(maxDim * aspectRatio);
    } else {
      newHeight = maxDim;
      newWidth = Math.round(maxDim / aspectRatio);
    }

    const resizedImage = image.resize(newHeight, newWidth);

    // Encode the image to buffer and send it
    const imageBuffer = cv.imencode('.jpg', resizedImage);

    res.set('Content-Type', 'image/jpeg');
    res.send(imageBuffer);
  } else if (extension == ".avi") {
    // console.log("extension is avi");
    // Open the video file
    const cap = new cv.VideoCapture(filePath);

    // Read the first frame (or any specific frame)
    let frame = cap.read();

    if (frame.empty) {
      return res.status(404).send('Could not read video file');
    }

    // Resize the frame
    const maxDim = 300;
    const aspectRatio = frame.rows / frame.cols;
    let newWidth, newHeight;

    if (frame.cols > frame.rows) {
      newWidth = maxDim;
      newHeight = Math.round(maxDim * aspectRatio);
    } else {
      newHeight = maxDim;
      newWidth = Math.round(maxDim / aspectRatio);
    }

    const resizedFrame = frame.resize(newHeight, newWidth);

    // Encode the frame to buffer and send it
    const frameBuffer = cv.imencode('.jpg', resizedFrame);

    res.set('Content-Type', 'image/jpeg');
    res.send(frameBuffer);
  }else{
    res.sendStatus(404, "File extension don't match")
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

// Initialize the camera (0 is usually the default camera)
const webcam = new cv.VideoCapture(0);
webcam.set(cv.CAP_PROP_FRAME_WIDTH, 640);
webcam.set(cv.CAP_PROP_FRAME_HEIGHT, 480);

function captureAndWriteFrames() {
  // Assume `capture` is an instance of cv.VideoCapture or similar
  if (isRecording) {
    // console.log("capture and write called");
    const frame = webcam.read(); // Capture a frame from the camera or source
    if (!frame.empty) {
      // console.log("frame not empty called");
      videoWriter.write(frame); // Write the frame to the video file
    }

    // Set a delay to match the desired FPS (e.g., 50 ms for 20 FPS)
    setTimeout(captureAndWriteFrames, 50);
  }
}

const captureImage = () => {
  try {
    // Capture a frame from the webcam
    const frame = webcam.read();

    console.log(common.SAVE_DIR);
    // Save the captured image to the output folder
    const filePath = path.join(common.SAVE_DIR, generateFileName("PNG"));
    console.log(filePath);
    cv.imwrite(filePath, frame);

    console.log(`Image saved to ${filePath}`);
  } catch (error) {
    console.error('Error capturing image:', error);
  }
};


server.listen(APP_PORT, () => {
  console.log("server running on:" + APP_PORT)
});
// Emit frames to the client
setInterval(() => {
  const frame = webcam.read();
  const image = cv.imencode('.jpg', frame).toString('base64');
  io.emit('image', image);
  // console.log("emitting data");
}, 100); // Sends frames at about 10 FPS



// Handle socket connections
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});