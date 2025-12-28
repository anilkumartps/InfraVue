import React, { useEffect, useState, useCallback } from 'react';
import SERVER_IP from './common';

import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

import TableRowCard from './TableRowCard';


function FileTable() {
    const [files, setFiles] = useState([]); // state for the fetched file objects
    const [loading, setLoading] = useState(true); // state for loading indication
    const [error, setError] = useState(null); // state for error handling

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(`${SERVER_IP}/api/filesList`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const jsonData = await response.json();
            
            // Sort by filename descending (newest first assuming timestamp in name)
            jsonData.sort((a, b) => {
                if (a.fileName < b.fileName) return 1;
                if (a.fileName > b.fileName) return -1;
                return 0;
            });
            
            setFiles(jsonData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchData();

        // Listener for updates (e.g. from capture/recording)
        const handleUpdate = () => {
            console.log("File list update triggered");
            // Small delay to ensure file system has updated
            setTimeout(fetchData, 1000); 
        };

        window.addEventListener('file-list-update', handleUpdate);
        return () => {
            window.removeEventListener('file-list-update', handleUpdate);
        };
    }, [fetchData]);

    if (loading && files.length === 0) {
        return <div>Loading...</div>;
    }

    if (error && files.length === 0) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className='m-4 overflow-y-auto border-4 border-white rounded-[20px]' style={{ overflow: 'hidden' }}>
            <SimpleBar style={{ maxHeight: '100%' }}>
                <div>
                    <h1 className="m-4 font-bold text-2xl">Gallery</h1>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3">
                    {files.map((file, index) => (
                        <TableRowCard 
                            key={file.fileName} // Use fileName as key if unique, otherwise index
                            imageSrc={file.imageSrc}
                            fileName={file.fileName}
                            onRefresh={fetchData}
                        />
                    ))}
                </div>
            </SimpleBar>

        </div>
    );
}

export default FileTable;
