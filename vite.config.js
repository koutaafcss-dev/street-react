import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'localhost',
      '.ngrok-free.dev',
      '.ngrok-free.app',
      'all',
    ],
  },
  build: {
    // バンドル最適化・遅延ロード
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Firebase を独立チャンク化
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          // maplibre-gl を遅延ロード用チャンク化
          if (id.includes('node_modules/maplibre-gl')) {
            return 'maplibre';
          }
          // ベンダーコード
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // 最小化設定
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    // チャンクサイズ警告
    chunkSizeWarningLimit: 1000,
    // ソースマップ無効化（本番）
    sourcemap: false,
    // CSS コード分割
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/firestore', 'firebase/auth'],
  },
})
