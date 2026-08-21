import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
// GitHub Pages 项目页需要以仓库名作为 base；本地开发保持根路径
const base = process.env.BASE_URL || '/';
export default defineConfig({
    plugins: [react()],
    base,
});
