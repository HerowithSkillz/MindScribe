import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        // Piper phonemize WASM files
        {
          src: 'node_modules/piper-wasm/build/piper_phonemize.wasm',
          dest: 'piper'
        },
        {
          src: 'node_modules/piper-wasm/build/piper_phonemize.data',
          dest: 'piper'
        },
        {
          src: 'node_modules/piper-wasm/build/piper_phonemize.js',
          dest: 'piper'
        },
        // Piper worker
        {
          src: 'node_modules/piper-wasm/build/worker/piper_worker.js',
          dest: 'piper'
        },
        // ONNX Runtime files
        {
          src: 'node_modules/piper-wasm/build/worker/dist/*',
          dest: 'piper/dist'
        },
        // espeak-ng data
        {
          src: 'node_modules/piper-wasm/espeak-ng/espeak-ng-data/voices',
          dest: 'piper/espeak-ng-data'
        },
        {
          src: 'node_modules/piper-wasm/espeak-ng/espeak-ng-data/lang',
          dest: 'piper/espeak-ng-data'
        }
      ]
    })
  ],
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
    exclude: ['@mlc-ai/web-llm', '@remotion/whisper-web', 'onnxruntime-web', 'piper-wasm']
  },
  assetsInclude: ['**/*.wasm', '**/*.data']
})
