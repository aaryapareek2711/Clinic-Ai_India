import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = (env.VITE_API_PROXY_TARGET || 'http://localhost:8000').trim()

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          // Render free tier can cold-start; avoid premature proxy timeouts
          timeout: 120_000,
        },
        '/health': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          timeout: 120_000,
        },
        '/webhooks': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          timeout: 120_000,
        },
      },
    },
  }
})
