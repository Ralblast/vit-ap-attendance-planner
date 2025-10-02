import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allows network access
    port: 5174, // your local port
    allowedHosts: ['outrageously-thoroughpaced-raye.ngrok-free.dev'] 
    // or use allowedHosts: 'all' to allow any host
  }
});
