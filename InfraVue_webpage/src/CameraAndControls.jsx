import React from 'react';
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client';

import Button from '@mui/material/Button';
import SERVER_IP from './common';

const socket = io(SERVER_IP);

function CameraAndControls() {

    const [cameraImage, setCameraImage] = useState('');
    const [isRecording, setIsRecording] = useState(false);

    const captureButtonHandler = () =>{
        console.log("capture button click handler");

        fetch(`${SERVER_IP}/api/capture`, {
            method: 'GET', // or 'POST', 'PUT', 'DELETE', etc.
            headers: {
              'Content-Type': 'application/json',
              // Add other headers if needed
            },
          }).then(response =>{
            console.log(response);
            window.dispatchEvent(new Event('file-list-update'));
          }).catch(error => {
            console.log(error);
          });
    };

    const recordingButtonHandler = () =>{
        console.log("recording button clicked");

        fetch(`${SERVER_IP}/api/${isRecording?'stop_recording':'start_recording'}`, {
            method: 'POST', // or 'POST', 'PUT', 'DELETE', etc.
            headers: {
              'Content-Type': 'application/json',
              // Add other headers if needed
            },
          })
          .then(response => {
            // Parse the JSON response
            return response.json();
          })
          .then(data => {
            // Process the parsed JSON data
            if (data.isRecording === true) {
              setIsRecording(true);
            } else {
              setIsRecording(false);
              // Trigger update when recording stops
              window.dispatchEvent(new Event('file-list-update'));
            }
          }).catch(error => {
            console.log(error);
            setIsRecording(false);
          });
    }

    useEffect(() => {

        // Listen for the image event and update the src of the video element
        socket.on('image', (image) => {
            // console.log("received data");
            setCameraImage(`data:image/jpeg;base64,${image}`);
        });

        // Handle socket connection
        socket.on('connect', () => {
            console.log('Connected to server');
        });

        return () => {
            socket.off('welcome');  // Cleanup listener on component unmount
        };
    }, []);

    return (
        <div className="w-full h-auto">

            <div className={`border-4 ${(isRecording? 'border-red-600':'border-blue-600')} rounded-[20px] m-4`}>
                <img
                    src={cameraImage}
                    alt={"Image"}
                    className="w-full h-auto rounded-[16px]"
                />
            </div>

            <div className='h-auto'>
                <div className='grid sm:grid-cols-2 gap-4 m-4'>
                    <Button variant="contained"
                        sx={{
                            color: 'white', // Text color
                            fontSize: '16px', // Font size
                            fontWeight: 'bold', // Font weight
                            textTransform: 'none', // Disable uppercase transformation
                            // border: '30px',
                            borderRadius: "30px",
                        }}
                        onClick={() => {captureButtonHandler();}}
                    >
                        Capture
                    </Button>

                    <Button variant="contained"
                        sx={{
                            color: 'white', // Text color
                            backgroundColor: isRecording ? 'red' : 'green',
                            ":hover": { // Hover styles
                                backgroundColor: isRecording ? 'red' : 'green', // Hover background color
                              },
                            fontSize: '16px', // Font size
                            fontWeight: 'bold', // Font weight
                            textTransform: 'none', // Disable uppercase transformation
                            // border: '30px',
                            borderRadius: "30px",
                        }}
                        onClick={() => {recordingButtonHandler()}}
                    >
                        {isRecording ? "Stop Recording" : "Start Recording"}
                    </Button>
                </div>
            </div>

        </div>
    );
}

export default CameraAndControls;