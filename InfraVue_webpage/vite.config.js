import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,  // This will make the server listen on 0.0.0.0
    port: 3000,  // Specify the port, optional
  },
})
