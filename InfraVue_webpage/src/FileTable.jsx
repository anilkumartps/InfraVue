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
            setData(jsonData); // update state with the fetched data
            items = [];
            for (let i = 0; i < jsonData.length; i++) {
                items.push(
                    <TableRowCard key={items.length}
                        imageSrc={jsonData[i].imageSrc}
                        fileName={jsonData[i].fileName}
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