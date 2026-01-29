/**
 * Whisper WebGPU Service - High-Performance Speech-to-Text
 * 
 * Uses @huggingface/transformers with WebGPU acceleration for
 * 6-8x faster transcription compared to WASM-based Whisper.
 * 
 * Falls back to WASM if WebGPU is not available.
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js for optimal performance
env.useBrowserCache = true;  // Enable browser cache for models
env.allowLocalModels = false; // Models will be downloaded from HuggingFace Hub
env.cacheDir = './.cache/transformers'; // Persistent cache directory

// Log cache status on load
console.log('[WhisperWebGPU] Browser cache enabled for model persistence');

class WhisperWebGPU {
  constructor() {
    this.transcriber = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.currentModel = null;
    this.device = 'webgpu'; // Will fallback to 'wasm' if needed
    this.hasWebGPU = false;
    
    // Available models - optimized for speed
    this.availableModels = [
      {
        id: 'whisper-tiny.en',
        hfId: 'onnx-community/whisper-tiny.en',
        name: 'Whisper Tiny English',
        size: '39MB',
        expectedSpeed: '1-2s for 3s audio',
        description: 'Ultra-fast, good for real-time'
      },
      {
        id: 'distil-whisper-small.en',
        hfId: 'distil-whisper/distil-small.en',
        name: 'Distil Whisper Small',
        size: '166MB',
        expectedSpeed: '2-4s for 3s audio',
        description: 'Best speed/quality balance (RECOMMENDED)'
      },
      {
        id: 'whisper-small.en',
        hfId: 'onnx-community/whisper-small.en',
        name: 'Whisper Small English',
        size: '244MB',
        expectedSpeed: '3-5s for 3s audio',
        description: 'Higher accuracy, moderate speed'
      }
    ];
    
    this.selectedModel = 'whisper-tiny.en'; // Start with fastest for testing
  }

  /**
   * Check if WebGPU is available
   */
  async checkWebGPU() {
    try {
      if (!navigator.gpu) {
        console.log('[WhisperWebGPU] WebGPU not supported in this browser');
        return false;
      }
      
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.log('[WhisperWebGPU] No WebGPU adapter found');
        return false;
      }
      
      const device = await adapter.requestDevice();
      if (!device) {
        console.log('[WhisperWebGPU] Failed to get WebGPU device');
        return false;
      }
      
      console.log('[WhisperWebGPU] ✅ WebGPU is available');
      return true;
    } catch (error) {
      console.log('[WhisperWebGPU] WebGPU check failed:', error);
      return false;
    }
  }

  /**
   * Initialize Whisper model with WebGPU acceleration
   * @param {string} modelId - Model ID to load
   * @param {Function} onProgress - Progress callback
   */
  async initialize(modelId = 'whisper-tiny.en', onProgress = null) {
    if (this.isLoading) {
      console.log('[WhisperWebGPU] Already loading, please wait...');
      return false;
    }

    if (this.isInitialized && this.currentModel === modelId) {
      console.log(`[WhisperWebGPU] ✅ Model ${modelId} already loaded`);
      return true;
    }

    this.isLoading = true;

    try {
      // Check WebGPU availability
      this.hasWebGPU = await this.checkWebGPU();
      
      // TEMPORARY: Force WASM mode due to WebGPU ONNX Runtime issues
      // WebGPU fails with error code 77513400 (ONNX execution provider issue)
      // TODO: Re-enable WebGPU once transformers.js fixes ONNX WebGPU support
      this.device = 'wasm'; // Force WASM for stability
      console.log(`[WhisperWebGPU] WebGPU available: ${this.hasWebGPU}, using device: ${this.device}`);
      
      // Find model config
      const modelConfig = this.availableModels.find(m => m.id === modelId);
      if (!modelConfig) {
        throw new Error(`Unknown model: ${modelId}`);
      }

      console.log(`[WhisperWebGPU] Loading ${modelConfig.name} (${modelConfig.size}) with ${this.device.toUpperCase()}...`);
      onProgress?.({ text: `Loading ${modelConfig.name}...`, progress: 10 });

      // Add timeout wrapper to prevent hanging
      const INIT_TIMEOUT = 180000; // 3 minutes timeout (models can be large)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model initialization timeout - download took too long')), INIT_TIMEOUT);
      });

      // Track progress for better debugging
      let lastProgress = 0;
      let progressStalls = 0;
      let lastUpdateTime = Date.now();
      
      // Create transcription pipeline with timeout protection
      const pipelinePromise = pipeline(
        'automatic-speech-recognition',
        modelConfig.hfId,
        {
          device: this.device,
          dtype: 'q8', // Use quantized int8 for WASM stability
          progress_callback: (progress) => {
            const now = Date.now();
            
            if (progress.status === 'progress' && progress.progress !== undefined) {
              const pct = Math.round(progress.progress);
              const fileName = progress.file ? progress.file.split('/').pop() : 'model';
              
              // Only log significant progress changes
              if (pct !== lastProgress || now - lastUpdateTime > 5000) {
                console.log(`[WhisperWebGPU] ${fileName}: ${pct}%`);
                lastProgress = pct;
                lastUpdateTime = now;
                
                onProgress?.({ 
                  text: `Downloading ${fileName}: ${pct}%`, 
                  progress: 10 + (pct * 0.8)
                });
              }
            } else if (progress.status === 'done') {
              const fileName = progress.file ? progress.file.split('/').pop() : 'component';
              console.log(`[WhisperWebGPU] ✓ ${fileName} ready`);
              onProgress?.({ text: 'Loading model components...', progress: 92 });
            } else if (progress.status === 'initiate') {
              const fileName = progress.file ? progress.file.split('/').pop() : 'file';
              console.log(`[WhisperWebGPU] ↓ Downloading ${fileName}...`);
            }
          }
        }
      );

      // Race between pipeline initialization and timeout
      this.transcriber = await Promise.race([pipelinePromise, timeoutPromise]);

      this.currentModel = modelId;
      this.isInitialized = true;
      
      console.log(`[WhisperWebGPU] ✅ Initialized with ${this.device.toUpperCase()}`);
      onProgress?.({ text: 'Ready!', progress: 100 });
      
      return true;
    } catch (error) {
      console.error('[WhisperWebGPU] ❌ Initialization failed:', error);
      this.isInitialized = false;
      
      // Handle different error types
      const errorMessage = error?.message || String(error);
      
      // Check for timeout errors
      if (errorMessage.includes('timeout')) {
        console.error('[WhisperWebGPU] Initialization timed out. Network may be slow.');
        throw new Error('Whisper initialization timed out. Please check your internet connection or try again.');
      }
      
      // Check for ONNX Runtime errors (numeric error codes)
      if (typeof error === 'number' || /^\d+$/.test(errorMessage)) {
        console.error('[WhisperWebGPU] ONNX Runtime error code:', error);
        throw new Error(`Failed to load Whisper model. Your device may not support WebGPU or ran out of memory. Error code: ${error}`);
      }
      
      // Check for out of memory errors
      if (errorMessage.toLowerCase().includes('memory') || errorMessage.toLowerCase().includes('oom')) {
        throw new Error('Not enough memory to load Whisper model. Please close some tabs and try again.');
      }
      
      // Generic error
      throw new Error(`Failed to initialize Whisper: ${errorMessage}`);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Transcribe audio data to text
   * @param {Float32Array} audioData - Raw audio samples at 16kHz
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribe(audioData, options = {}) {
    if (!this.isInitialized || !this.transcriber) {
      throw new Error('Whisper not initialized. Call initialize() first.');
    }

    const startTime = performance.now();
    
    try {
      console.log(`[WhisperWebGPU] Transcribing ${audioData.length} samples...`);
      
      // Convert Float32Array to proper format if needed
      const audioInput = audioData instanceof Float32Array ? audioData : new Float32Array(audioData);
      
      // Run transcription
      // Note: whisper-tiny.en is English-only, so don't specify language/task
      const result = await this.transcriber(audioInput, {
        return_timestamps: false,
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      const duration = performance.now() - startTime;
      const audioDuration = audioData.length / 16000; // Assuming 16kHz
      const speedFactor = (audioDuration / (duration / 1000)).toFixed(1);
      
      console.log(`[WhisperWebGPU] ✅ Transcribed in ${duration.toFixed(0)}ms (${speedFactor}x realtime)`);
      console.log(`[WhisperWebGPU] Result: "${result.text}"`);
      
      return result.text.trim();
    } catch (error) {
      console.error('[WhisperWebGPU] ❌ Transcription failed:', error);
      throw error;
    }
  }

  /**
   * Get current model info
   */
  getModelInfo() {
    return {
      model: this.currentModel,
      device: this.device,
      hasWebGPU: this.hasWebGPU,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Unload model and free memory
   */
  async unload() {
    if (this.transcriber) {
      // Transformers.js handles cleanup internally
      this.transcriber = null;
    }
    this.isInitialized = false;
    this.currentModel = null;
    console.log('[WhisperWebGPU] Model unloaded');
  }

  /**
   * Dispose of all resources
   */
  async dispose() {
    await this.unload();
  }
}

// Export singleton instance
const whisperWebGPU = new WhisperWebGPU();
export default whisperWebGPU;
