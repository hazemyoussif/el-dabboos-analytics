import { resolveBuildNumber } from './build-number.ts';
import { validateApiBase } from './src/api/api-location.ts';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
    validateApiBase(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL);
    return { define: { 'import.meta.env.VITE_BUILD_NUMBER': JSON.stringify(resolveBuildNumber(process.env.VITE_BUILD_NUMBER)) }, plugins: [react()], server: { proxy: { '/api': 'http://127.0.0.1:3001', '/health': 'http://127.0.0.1:3001' } } };
});
