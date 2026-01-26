import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    headers: {
      // Required for SharedArrayBuffer support in @remotion/whisper-web
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  optimizeDeps: {
    // Exclude packages that use WASM/SharedArrayBuffer
    exclude: ['@mlc-ai/web-llm', '@remotion/whisper-web', 'onnxruntime-web']
  },
  assetsInclude: ['**/*.wasm']
})
