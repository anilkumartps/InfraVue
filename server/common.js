const fs = require('fs');
const os = require('os');
const path = require('path');



function createFolderIfNotExists(folderPath) {
    // Resolve the full path
    const resolvedPath = path.resolve(folderPath);
  
    // Check if the folder already exists
    if (!fs.existsSync(resolvedPath)) {
      // Create the folder (recursive to create parent directories if needed)
      fs.mkdirSync(resolvedPath, { recursive: true });
      console.log(`Folder created: ${resolvedPath}`);
    } else {
      console.log(`Folder already exists: ${resolvedPath}`);
    }
}

createFolderIfNotExists(path.join(os.homedir(), "rpi_captures"));

const SAVE_DIR = path.join(os.homedir(), "rpi_captures");

exports.SAVE_DIR = SAVE_DIR;