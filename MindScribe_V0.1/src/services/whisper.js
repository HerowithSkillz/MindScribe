/**
 * Whisper.cpp Service - Speech-to-Text using WebAssembly
 * 
 * Uses @remotion/whisper-web for production-ready speech recognition
 * Provides offline speech recognition using Whisper models running in browser.
 * 
 * Note: Runs in main thread (not worker) as @remotion/whisper-web requires window object
 */

import { transcribe, downloadWhisperModel } from '@remotion/whisper-web';

class WhisperService {
  constructor() {
    this.isInitialized = false;
    this.isLoading = false;
    this.currentModel = null;
    
    // Available Whisper models
    this.availableModels = [
      {
        id: 'tiny.en',
        name: 'Tiny English',
        size: '75MB',
        ramUsage: '273MB',
        speed: '32x realtime',
        description: 'Fastest model, best for development and testing'
      },
      {
        id: 'base.en',
        name: 'Base English',
        size: '142MB',
        ramUsage: '388MB',
        speed: '16x realtime',
        description: 'Balanced performance, recommended for production'
      },
      {
        id: 'small.en',
        name: 'Small English',
        size: '466MB',
        ramUsage: '852MB',
        speed: '6x realtime',
        description: 'High quality, slower performance'
      }
    ];
    
    this.selectedModel = 'tiny.en'; // Default to tiny for 10x faster speed
  }

  /**
   * Load Whisper model
   * @param {string} modelId - Model ID to load (tiny.en, base.en, small.en)
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<void>}
   */
  async loadModel(modelId = 'tiny.en', onProgress = null) {
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

      // Download model using @remotion/whisper-web
      // Runs in main thread (package requires window object)
      await downloadWhisperModel({
        model: modelId,
        onProgress: ({ progress, loaded, total }) => {
          console.log(`[Whisper] Download progress: ${Math.round(progress * 100)}%`);
          if (onProgress) {
            onProgress({ progress, loaded, total });
          }
        }
      });

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

  // Worker methods removed - @remotion/whisper-web runs in main thread

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

    const {
      language = 'en',
      onProgress = null
    } = options;

    try {
      console.log(`[Whisper] Transcribing ${audioData.length} audio samples`);

      // Ensure audioData is Float32Array
      const channelWaveform = audioData instanceof Float32Array 
        ? audioData 
        : new Float32Array(audioData);

      // Transcribe using @remotion/whisper-web (runs in main thread)
      const result = await transcribe({
        channelWaveform,
        model: this.currentModel,
        language: language === 'en' ? 'en' : 'auto',
        onProgress: (progress) => {
          console.log(`[Whisper] Transcription progress: ${Math.round(progress * 100)}%`);
          if (onProgress) {
            onProgress(progress);
          }
        }
      });

      // Extract text from result (handle different response formats)
      let transcription = '';
      if (result.chunks && Array.isArray(result.chunks)) {
        transcription = result.chunks.map(chunk => chunk.text).join(' ').trim();
      } else if (result.transcription && Array.isArray(result.transcription)) {
        transcription = result.transcription.map(item => item.text).join(' ').trim();
      } else if (typeof result === 'string') {
        transcription = result.trim();
      } else if (result.text) {
        transcription = result.text.trim();
      } else {
        console.error('[Whisper] Unexpected result format:', result);
        throw new Error('Unexpected transcription result format');
      }
      
      console.log('[Whisper] ✅ Transcription complete:', transcription);
      return transcription;

    } catch (error) {
      console.error('[Whisper] ❌ Transcription failed:', error);
      throw error;
    }
  }

  /**
   * Unload Whisper model and cleanup
   */
  async unloadModel() {
    // No worker to terminate - model stays cached in browser
    this.isInitialized = false;
    this.currentModel = null;
    console.log('✅ Whisper unloaded (model remains cached)');
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
