/**
 * Whisper.cpp Service - Speech-to-Text using WebAssembly
 * 
 * Based on official Whisper.cpp WASM implementation:
 * https://github.com/ggml-org/whisper.cpp/tree/master/examples/whisper.wasm
 * 
 * Provides offline speech recognition using Whisper models running in browser.
 */

class WhisperService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.currentModel = null;
    this.instance = null;
    
    // Available Whisper models from HuggingFace
    this.availableModels = [
      {
        id: 'tiny.en',
        name: 'Tiny English',
        size: '75MB',
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
        ramUsage: '273MB',
        speed: '32x realtime',
        description: 'Fastest model, best for development and testing'
      },
      {
        id: 'base.en',
        name: 'Base English',
        size: '142MB',
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
        ramUsage: '388MB',
        speed: '16x realtime',
        description: 'Balanced performance, recommended for production'
      },
      {
        id: 'small.en',
        name: 'Small English',
        size: '466MB',
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
        ramUsage: '852MB',
        speed: '6x realtime',
        description: 'High quality, slower performance'
      }
    ];
    
    this.selectedModel = 'base.en'; // Default to base model
  }

  /**
   * Load Whisper model - downloads and caches in browser Cache API
   * @param {string} modelId - Model ID to load (tiny.en, base.en, small.en)
   * @returns {Promise<void>}
   */
  async loadModel(modelId = 'base.en') {
    if (this.isLoading) {
      throw new Error('Model is already loading');
    }

    if (this.isInitialized && this.currentModel === modelId) {
      console.log(`✅ Whisper model ${modelId} already loaded`);
      return;
    }

    try {
      this.isLoading = true;
      this.selectedModel = modelId;
      
      const modelInfo = this.availableModels.find(m => m.id === modelId);
      if (!modelInfo) {
        throw new Error(`Invalid model ID: ${modelId}`);
      }

      console.log(`📥 Loading Whisper model: ${modelInfo.name} (${modelInfo.size})`);

      // Check cache first
      const cached = await this.checkCache(modelId);
      let modelData;

      if (cached) {
        console.log(`✅ Found cached Whisper model: ${modelId}`);
        modelData = cached;
      } else {
        console.log(`⬇️ Downloading Whisper model from ${modelInfo.url}`);
        modelData = await this.downloadModel(modelInfo.url, modelId);
      }

      // Initialize worker with model
      await this.initializeWorker(modelData, modelId);

      this.currentModel = modelId;
      this.isInitialized = true;
      console.log(`✅ Whisper model ${modelId} loaded successfully`);

    } catch (error) {
      console.error('❌ Failed to load Whisper model:', error);
      this.isInitialized = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if model exists in browser cache
   * @param {string} modelId - Model ID to check
   * @returns {Promise<ArrayBuffer|null>}
   */
  async checkCache(modelId) {
    try {
      const cacheName = 'mindscribe-whisper-models';
      const cache = await caches.open(cacheName);
      const cacheKey = `whisper-model-${modelId}`;
      const cached = await cache.match(cacheKey);
      
      if (cached) {
        return await cached.arrayBuffer();
      }
      return null;
    } catch (error) {
      console.warn('Cache check failed:', error);
      return null;
    }
  }

  /**
   * Download model from URL with progress tracking
   * @param {string} url - Model URL
   * @param {string} modelId - Model ID for caching
   * @returns {Promise<ArrayBuffer>}
   */
  async downloadModel(url, modelId) {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    let loaded = 0;

    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      loaded += value.length;

      const progress = (loaded / total) * 100;
      console.log(`📊 Download progress: ${progress.toFixed(1)}%`);
      
      // Emit progress event (can be used by UI)
      this.emitProgress({ loaded, total, progress });
    }

    // Combine chunks into single ArrayBuffer
    const modelData = new Uint8Array(loaded);
    let position = 0;
    for (const chunk of chunks) {
      modelData.set(chunk, position);
      position += chunk.length;
    }

    // Cache the model
    await this.cacheModel(modelId, modelData.buffer);

    return modelData.buffer;
  }

  /**
   * Cache model in browser Cache API
   * @param {string} modelId - Model ID
   * @param {ArrayBuffer} data - Model data
   */
  async cacheModel(modelId, data) {
    try {
      const cacheName = 'mindscribe-whisper-models';
      const cache = await caches.open(cacheName);
      const cacheKey = `whisper-model-${modelId}`;
      
      const response = new Response(data, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': data.byteLength.toString()
        }
      });
      
      await cache.put(cacheKey, response);
      console.log(`💾 Cached Whisper model: ${modelId} (${(data.byteLength / 1024 / 1024).toFixed(1)} MB)`);
    } catch (error) {
      console.warn('Failed to cache model:', error);
    }
  }

  /**
   * Initialize Whisper worker with model data
   * @param {ArrayBuffer} modelData - Model binary data
   * @param {string} modelId - Model ID
   */
  async initializeWorker(modelData, modelId) {
    // Terminate existing worker if any
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Create new worker
    this.worker = new Worker(new URL('../workers/whisper.worker.js', import.meta.url), {
      type: 'module'
    });

    // Setup message handler
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 60000); // 60 second timeout

      this.worker.onmessage = (event) => {
        const { type, data, error } = event.data;

        if (type === 'initialized') {
          clearTimeout(timeout);
          console.log('✅ Whisper worker initialized');
          resolve();
        } else if (type === 'error') {
          clearTimeout(timeout);
          reject(new Error(error));
        }
      };

      this.worker.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      // Send model to worker
      this.worker.postMessage({
        type: 'init',
        modelData,
        modelId
      });
    });
  }

  /**
   * Transcribe audio using Whisper
   * @param {Float32Array} audioData - Audio samples (16kHz, mono, float32)
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribe(audioData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Whisper model not initialized. Call loadModel() first.');
    }

    if (!audioData || audioData.length === 0) {
      throw new Error('No audio data provided');
    }

    console.log(`🎤 Transcribing audio (${audioData.length} samples, ${(audioData.length / 16000).toFixed(1)}s)`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Transcription timeout'));
      }, 30000); // 30 second timeout

      const messageHandler = (event) => {
        const { type, text, error } = event.data;

        if (type === 'transcription') {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', messageHandler);
          console.log('✅ Transcription complete:', text);
          resolve(text);
        } else if (type === 'error') {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', messageHandler);
          reject(new Error(error));
        }
      };

      this.worker.addEventListener('message', messageHandler);

      // Send audio to worker
      this.worker.postMessage({
        type: 'transcribe',
        audioData,
        language: options.language || 'en',
        translate: options.translate || false
      });
    });
  }

  /**
   * Unload Whisper model and cleanup
   */
  async unloadModel() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.isInitialized = false;
    this.currentModel = null;
    this.instance = null;
    console.log('🗑️ Whisper model unloaded');
  }

  /**
   * Get available models
   * @returns {Array} - List of available models
   */
  getAvailableModels() {
    return this.availableModels;
  }

  /**
   * Get current model ID
   * @returns {string|null} - Current model ID
   */
  getCurrentModel() {
    return this.currentModel;
  }

  /**
   * Emit progress event (can be overridden)
   */
  emitProgress(progress) {
    // Override this method to handle progress updates
    // Example: this.onProgress && this.onProgress(progress);
  }
}

// Export singleton instance
const whisperService = new WhisperService();
export default whisperService;
