import React, { useEffect, useState } from 'react';
import SERVER_IP from './common';

import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

import TableRowCard from './TableRowCard';


function FileTable() {
    const [data, setData] = useState(null); // state for the fetched data
    const [loading, setLoading] = useState(true); // state for loading indication
    const [error, setError] = useState(null); // state for error handling

    let items = [];

    // Use a for loop to populate the array
    for (let i = 0; i < 10; i++) {
        items.push(
            <TableRowCard key={i}
                imageSrc="https://via.placeholder.com/30"
                fileName={`File ${i}.txt`}
            />
        );
    }
    // items.push(
    //     <TableRowCard key={items.length}
    //         imageSrc=""
    //         fileName={`File ${items.length}.txt`}
    //     />
    // );

    useEffect(() => {
        const handleUpdate = () => {
            console.log("File list update triggered");
            setTimeout(fetchData, 1000); 
        };

        window.addEventListener('file-list-update', handleUpdate);
        return () => {
            window.removeEventListener('file-list-update', handleUpdate);
        };
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch(`${SERVER_IP}/api/filesList`, {
                method: 'GET', // or 'POST', 'PUT', 'DELETE', etc.
                headers: {
                    'Content-Type': 'application/json',
                    // Add other headers if needed
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const jsonData = await response.json();
            // Reverse the array to show latest files first
            // Note: The filesList API returns files in directory order which is usually not sorted by date.
            // We should sort them by name (which includes timestamp) to be sure.
            jsonData.sort((a, b) => {
                if (a.fileName < b.fileName) return 1;
                if (a.fileName > b.fileName) return -1;
                return 0;
            });
            
            // setData(jsonData); // update state with the fetched data
            items = [];
            for (let i = 0; i < jsonData.length; i++) {
                items.push(
                    <TableRowCard key={items.length}
                        imageSrc={jsonData[i].imageSrc}
                        fileName={jsonData[i].fileName}
                        onRefresh={fetchData}
                    />
                )
            }
            setData(items);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false); // indicate that loading is complete
        }
    };


    // Fetch the JSON data inside useEffect
    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className='m-4 overflow-y-auto border-4 border-white rounded-[20px]' style={{ overflow: 'hidden' }}>
            <SimpleBar style={{ maxHeight: '100%' }}>
                <div>
                    <h1 className="m-4 font-bold text-2xl">Gallery</h1>
                    {/* {data} */}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3">
                    {data}
                </div>
            </SimpleBar>

        </div>
    );
}

export default FileTable;