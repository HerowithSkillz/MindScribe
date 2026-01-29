/**
 * Piper TTS Service - Text-to-Speech using ONNX Runtime Web
 * 
 * Based on Piper TTS system:
 * https://github.com/rhasspy/piper
 * https://github.com/OHF-Voice/piper1-gpl (active fork)
 * 
 * Provides offline neural text-to-speech using ONNX models in browser.
 */

class PiperService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.currentVoice = null;
    this.session = null;
    
    // Available Piper voice models from HuggingFace
    this.availableVoices = [
      {
        id: 'en_US-lessac-medium',
        name: 'Lessac (Female, US)',
        language: 'en-US',
        gender: 'female',
        size: '30MB',
        quality: 'high',
        speed: '1.5x realtime',
        description: 'Natural, empathetic tone - ideal for therapy conversations',
        modelUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
        configUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json'
      },
      {
        id: 'en_US-ryan-medium',
        name: 'Ryan (Male, US)',
        language: 'en-US',
        gender: 'male',
        size: '28MB',
        quality: 'high',
        speed: '1.5x realtime',
        description: 'Clear, professional tone',
        modelUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/medium/en_US-ryan-medium.onnx',
        configUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/medium/en_US-ryan-medium.onnx.json'
      }
    ];
    
    this.selectedVoice = 'en_US-lessac-medium'; // Default to female voice
  }

  /**
   * Load Piper TTS voice model
   * @param {string} voiceId - Voice ID to load
   * @returns {Promise<void>}
   */
  async loadModel(voiceId = 'en_US-lessac-medium') {
    if (this.isLoading) {
      throw new Error('Voice model is already loading');
    }

    if (this.isInitialized && this.currentVoice === voiceId) {
      console.log(`✅ Piper voice ${voiceId} already loaded`);
      return;
    }

    try {
      this.isLoading = true;
      this.selectedVoice = voiceId;
      
      const voiceInfo = this.availableVoices.find(v => v.id === voiceId);
      if (!voiceInfo) {
        throw new Error(`Invalid voice ID: ${voiceId}`);
      }

      console.log(`📥 Loading Piper voice: ${voiceInfo.name} (${voiceInfo.size})`);

      // Use local model path
      const modelPath = `/models/piper/${voiceId}.onnx`;

      // Initialize worker with model path
      await this.initializeWorker(modelPath, voiceId);

      this.currentVoice = voiceId;
      this.isInitialized = true;
      console.log(`✅ Piper voice ${voiceId} loaded successfully`);

    } catch (error) {
      console.error('❌ Failed to load Piper voice:', error);
      this.isInitialized = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if voice model/config exists in browser cache
   * @param {string} voiceId - Voice ID to check
   * @param {string} type - 'model' or 'config'
   * @returns {Promise<ArrayBuffer|Object|null>}
   */
  async checkCache(voiceId, type) {
    try {
      const cacheName = 'mindscribe-piper-voices';
      const cache = await caches.open(cacheName);
      const cacheKey = `piper-${type}-${voiceId}`;
      const cached = await cache.match(cacheKey);
      
      if (cached) {
        if (type === 'config') {
          return await cached.json();
        } else {
          return await cached.arrayBuffer();
        }
      }
      return null;
    } catch (error) {
      console.warn('Cache check failed:', error);
      return null;
    }
  }

  /**
   * Download model or config from URL with progress tracking
   * @param {string} url - Model/config URL
   * @param {string} voiceId - Voice ID for caching
   * @param {string} type - 'model' or 'config'
   * @returns {Promise<ArrayBuffer|Object>}
   */
  async downloadModel(url, voiceId, type) {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    if (type === 'config') {
      const configData = await response.json();
      await this.cacheModel(voiceId, configData, type);
      return configData;
    } else {
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
        console.log(`📊 Download progress (${type}): ${progress.toFixed(1)}%`);
        
        // Emit progress event
        this.emitProgress({ loaded, total, progress, type });
      }

      // Combine chunks into single ArrayBuffer
      const modelData = new Uint8Array(loaded);
      let position = 0;
      for (const chunk of chunks) {
        modelData.set(chunk, position);
        position += chunk.length;
      }

      // Cache the model
      await this.cacheModel(voiceId, modelData.buffer, type);

      return modelData.buffer;
    }
  }

  /**
   * Cache model/config in browser Cache API
   * @param {string} voiceId - Voice ID
   * @param {ArrayBuffer|Object} data - Model data or config object
   * @param {string} type - 'model' or 'config'
   */
  async cacheModel(voiceId, data, type) {
    try {
      const cacheName = 'mindscribe-piper-voices';
      const cache = await caches.open(cacheName);
      const cacheKey = `piper-${type}-${voiceId}`;
      
      let response;
      if (type === 'config') {
        response = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        response = new Response(data, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': data.byteLength.toString()
          }
        });
      }
      
      await cache.put(cacheKey, response);
      const size = type === 'config' 
        ? `${JSON.stringify(data).length} bytes`
        : `${(data.byteLength / 1024 / 1024).toFixed(1)} MB`;
      console.log(`💾 Cached Piper ${type}: ${voiceId} (${size})`);
    } catch (error) {
      console.warn(`Failed to cache ${type}:`, error);
    }
  }

  /**
   * Initialize Piper worker with model path
   * @param {string} modelPath - Path to ONNX model
   * @param {string} voiceId - Voice ID
   */
  async initializeWorker(modelPath, voiceId) {
    // Terminate existing worker if any
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Create new worker
    this.worker = new Worker(new URL('../workers/piper.worker.js', import.meta.url), {
      type: 'module'
    });

    // Setup message handler
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 120000); // 120 second timeout

      this.worker.onmessage = (event) => {
        const { type, error } = event.data;

        if (type === 'initialized') {
          clearTimeout(timeout);
          console.log('✅ Piper worker initialized');
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

      // Send model path to worker
      this.worker.postMessage({
        type: 'init',
        modelPath,
        voiceId
      });
    });
  }

  /**
   * Synthesize speech from text using Piper TTS
   * @param {string} text - Text to synthesize
   * @param {Object} options - Synthesis options
   * @returns {Promise<Object>} - {audioData: Float32Array, sampleRate: number}
   */
  async synthesize(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Piper TTS not initialized. Call loadModel() first.');
    }

    // Defensive type checking: ensure text is a string
    if (!text) {
      throw new Error('No text provided');
    }
    if (typeof text !== 'string') {
      console.error('[Piper] Invalid text type:', typeof text, text);
      throw new Error(`Text must be a string, got ${typeof text}`);
    }
    if (text.trim().length === 0) {
      throw new Error('No text provided');
    }

    // Limit text length to prevent memory issues
    if (text.length > 500) {
      console.warn('⚠️ Text too long, truncating to 500 characters');
      text = text.substring(0, 500);
    }

    console.log(`🗣️ Synthesizing speech: "${text.substring(0, 50)}..."`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Speech synthesis timeout'));
      }, 30000); // 30 second timeout

      const messageHandler = (event) => {
        const { type, audioData, sampleRate, error } = event.data;

        if (type === 'synthesis') {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', messageHandler);
          const duration = (audioData.length / sampleRate).toFixed(1);
          console.log(`✅ Synthesis complete: ${audioData.length} samples (${duration}s at ${sampleRate}Hz)`);
          resolve({ audioData: new Float32Array(audioData), sampleRate });
        } else if (type === 'error') {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', messageHandler);
          reject(new Error(error));
        }
      };

      this.worker.addEventListener('message', messageHandler);

      // Send text to worker
      this.worker.postMessage({
        type: 'synthesize',
        text
      });
    });
  }

  /**
   * Unload Piper TTS and cleanup
   */
  async unloadModel() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.isInitialized = false;
    this.currentVoice = null;
    this.session = null;
    console.log('🗑️ Piper TTS unloaded');
  }

  /**
   * Get available voices
   * @returns {Array} - List of available voices
   */
  getAvailableVoices() {
    return this.availableVoices;
  }

  /**
   * Get current voice ID
   * @returns {string|null} - Current voice ID
   */
  getCurrentVoice() {
    return this.currentVoice;
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
const piperService = new PiperService();
export default piperService;
