import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = (env.VITE_DEV_ALLOWED_HOSTS || '')
    .split(',')
    .map(host => host.trim())
    .filter(Boolean);

  return {
    envPrefix: [
      'VITE_FIREBASE_',
      'VITE_ADMIN_EMAIL',
      'VITE_CAT1_',
      'VITE_CAT2_',
      'VITE_FAT_',
    ],
    plugins: [react()],
    server: {
      host: true,
      port: 5174,
      ...(allowedHosts.length ? { allowedHosts } : {}),
    },
  };
});
