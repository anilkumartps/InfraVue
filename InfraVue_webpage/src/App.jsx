import { useState } from 'react'

import CameraAndControls from './CameraAndControls';
import FileTable from './FileTable';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <div className="w-screen h-screen bg-slate-700 text-white text-center
        grid lg:grid-cols-2 md:grid-cols-1 " >

          <CameraAndControls>

          </CameraAndControls>

          <FileTable>

          </FileTable>

        </div>
      </div>

    </>
  )
}

export default App
