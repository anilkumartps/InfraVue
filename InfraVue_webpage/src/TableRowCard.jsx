import React, { useState, useEffect } from 'react';
import { IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { bgcolor } from '@mui/system';
import SERVER_IP from './common';


function TableRowCard({ imageSrc, fileName, onRefresh }) {

  const imgPath = ((imageSrc == "" || imageSrc == undefined) ? "/imgIcon.jpg" : imageSrc);
  const [image, setImage] = useState('');
  //setCameraImage(`data:image/jpeg;base64,${image}`);

  useEffect(() => {

    const fetchImage = () => {
      fetch(`${SERVER_IP}/api/image_preview?fileName=${fileName}`, {
        method: 'GET',
      })
        .then((response) => {
          if (response.status === 200) {
            return response.blob(); // Convert the response to a blob
          } else {
            throw new Error('Failed to fetch image');
          }
        })
        .then((blob) => {
          const imageUrl = URL.createObjectURL(blob); // Create a URL from the blob
          setImage(imageUrl); // Set the image URL in state
        })
        .catch((error) => {
          console.error('Error fetching the image:', error);
          setImage('/imgIcon.jpg'); // Fallback to a default image on error
        });
      
      }
      fetchImage();
  }, []);

  const downloadButtonHandler = (fileName) => {
    fetch(`${SERVER_IP}/api/downloadFile?fileName=${fileName}`, {
      method: 'GET',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.blob(); // Convert response to Blob
      })
      .then(blob => {
        // Create a URL for the Blob and download it
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName; // The name to save the file as
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url); // Clean up
      })
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
      });
  }

  const deleteButtonHandler = (fileName) => {
    if (fileName) {
      fetch(`${SERVER_IP}/api/deleteFile?fileName=${fileName}`, {
        method: 'GET',
      }).then((response) => {
        if (response.status == 200) {
          console.log("file Deleted");
          if (onRefresh) onRefresh();
        }
      })
    }
  }

  return (
    <>
      {/* <div className="flex items-center p-2 bg-slate-500 rounded-[50px] shadow-md mb-2 m-4">
      <img 
        src={imgPath} 
        alt={fileName} 
        className="w-8 h-8 rounded-full mr-4"
      />
      <Typography variant="body1" className="flex-1">
        {fileName}
      </Typography>
      <div className="ml-auto flex gap-2">
        <IconButton aria-label="download" onClick={()=>{ console.log("donwload button pressed",fileName); downloadButtonHandler(fileName);}}>
          <DownloadIcon />
        </IconButton>
        <IconButton aria-label="delete" onClick={()=>{ console.log("delete button pressed",fileName); deleteButtonHandler(fileName);}}>
          <DeleteIcon />
        </IconButton> 
      </div>
    </div> */}

      <div className="m-2 rounded-[20px] border border-gray-300 shadow-lg">
        <div className="rounded-t-[20px] overflow-hidden">
          <img
            src={image}
            alt="Preview Image"
            className="w-full h-[200px] object-cover"
          />
        </div>
        <div className="p-2 text-center">
          <h1 className="text-[10px] font-semibold">{fileName}</h1>
        </div>
        <div className="flex justify-center gap-4 p-2">
          <IconButton
            aria-label="download"
            onClick={() => {
              console.log("download button pressed", fileName);
              downloadButtonHandler(fileName);
            }}
          >
            <DownloadIcon />
          </IconButton>
          <IconButton
            aria-label="delete"
            onClick={() => {
              console.log("delete button pressed", fileName);
              deleteButtonHandler(fileName);
            }}
          >
            <DeleteIcon />
          </IconButton>
        </div>
      </div>

    </>
  );
}

export default TableRowCard;
