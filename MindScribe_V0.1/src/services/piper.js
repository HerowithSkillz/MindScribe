/**
 * Piper TTS Service - Text-to-Speech using piper-wasm
 * 
 * Uses the full piper-wasm package with proper espeak-ng phonemizer
 * for accurate text-to-phoneme conversion. This eliminates the
 * "gibberish speech" issue caused by limited dictionary fallback.
 * 
 * Based on: https://github.com/DavidCks/piper-wasm
 */

import { piperGenerate, HF_BASE } from 'piper-wasm';

class PiperService {
  constructor() {
    this.isInitialized = false;
    this.isLoading = false;
    this.currentVoice = null;
    
    // Speech rate control (1.0 = normal, 1.3 = 30% faster, etc.)
    // Default to 1.25 for ASMR - slightly faster but still soothing
    this.speechRate = 1.25;
    
    // Base paths for piper-wasm assets (copied by vite-plugin-static-copy)
    this.piperBasePath = '/piper';
    
    // Available Piper voice models from HuggingFace
    // Curated for therapeutic ASMR-like soothing voices
    this.availableVoices = [
      // === FEMALE VOICES (Therapeutic/ASMR) ===
      {
        id: 'en_US-amy-medium',
        name: 'Amy',
        language: 'en-US',
        gender: 'female',
        size: '30MB',
        quality: 'high',
        category: 'asmr',
        icon: '🌸',
        description: 'Soft, gentle whisper-like voice - Perfect for ASMR therapy',
        modelPath: 'en/en_US/amy/medium/en_US-amy-medium.onnx',
        recommended: true
      },
      {
        id: 'en_GB-jenny_dioco-medium',
        name: 'Jenny',
        language: 'en-GB',
        gender: 'female',
        size: '28MB',
        quality: 'high',
        category: 'asmr',
        icon: '🌺',
        description: 'Calm, soothing British voice - Relaxing and gentle',
        modelPath: 'en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx',
        recommended: true
      },
      {
        id: 'en_US-lessac-medium',
        name: 'Lessac',
        language: 'en-US',
        gender: 'female',
        size: '30MB',
        quality: 'high',
        category: 'natural',
        icon: '💜',
        description: 'Natural, empathetic tone - Warm and conversational',
        modelPath: 'en/en_US/lessac/medium/en_US-lessac-medium.onnx',
        recommended: false
      },
      // === MALE VOICES (Therapeutic/ASMR) ===
      {
        id: 'en_US-joe-medium',
        name: 'Joe',
        language: 'en-US',
        gender: 'male',
        size: '28MB',
        quality: 'high',
        category: 'asmr',
        icon: '🌿',
        description: 'Deep, calming voice - Soothing baritone for relaxation',
        modelPath: 'en/en_US/joe/medium/en_US-joe-medium.onnx',
        recommended: true
      },
      {
        id: 'en_GB-alan-medium',
        name: 'Alan',
        language: 'en-GB',
        gender: 'male',
        size: '28MB',
        quality: 'high',
        category: 'asmr',
        icon: '🍃',
        description: 'Gentle British male - Soft-spoken and reassuring',
        modelPath: 'en/en_GB/alan/medium/en_GB-alan-medium.onnx',
        recommended: true
      },
      {
        id: 'en_US-ryan-high',
        name: 'Ryan',
        language: 'en-US',
        gender: 'male',
        size: '32MB',
        quality: 'high',
        category: 'natural',
        icon: '💙',
        description: 'Clear, professional tone - Natural conversation',
        modelPath: 'en/en_US/ryan/high/en_US-ryan-high.onnx',
        recommended: false
      }
    ];
    
    // Default to Amy (soft female ASMR voice) for therapeutic experience
    this.selectedVoice = 'en_US-amy-medium';
    this.onProgressCallback = null;
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
      console.log(`[Piper] Using proper espeak-ng phonemizer via piper-wasm`);

      // Pre-initialize by doing a small test synthesis
      // This pre-loads the WASM and model files
      await this._warmupSynthesis(voiceInfo);

      this.currentVoice = voiceId;
      this.isInitialized = true;
      console.log(`✅ Piper voice ${voiceId} loaded successfully with espeak-ng phonemizer`);

    } catch (error) {
      console.error('❌ Failed to load Piper voice:', error);
      this.isInitialized = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Warmup synthesis to pre-load WASM and model
   * @private
   */
  async _warmupSynthesis(voiceInfo) {
    console.log('[Piper] Warming up synthesis engine...');
    try {
      // Small test to pre-load everything
      await this._synthesizeWithPiperWasm('test', voiceInfo, true);
      console.log('[Piper] Warmup complete');
    } catch (error) {
      console.warn('[Piper] Warmup failed, will try on first real synthesis:', error.message);
      // Don't throw - let first real synthesis attempt handle it
    }
  }

  /**
   * Internal synthesis using piper-wasm
   * @private
   */
  async _synthesizeWithPiperWasm(text, voiceInfo, isWarmup = false) {
    // Paths to piper-wasm assets
    const piperPhonemizeJsUrl = `${this.piperBasePath}/piper_phonemize.js`;
    const piperPhonemizeWasmUrl = `${this.piperBasePath}/piper_phonemize.wasm`;
    const piperPhonemizeDataUrl = `${this.piperBasePath}/piper_phonemize.data`;
    const workerUrl = `${this.piperBasePath}/piper_worker.js`;
    
    // Model URLs from HuggingFace
    const modelUrl = `${HF_BASE}${voiceInfo.modelPath}`;
    const modelConfigUrl = `${HF_BASE}${voiceInfo.modelPath}.json`;

    if (!isWarmup) {
      console.log(`[Piper] Synthesizing: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    }

    const result = await piperGenerate(
      piperPhonemizeJsUrl,
      piperPhonemizeWasmUrl,
      piperPhonemizeDataUrl,
      workerUrl,
      modelUrl,
      modelConfigUrl,
      null, // speakerId (null for single-speaker models)
      text,
      (progress) => {
        if (!isWarmup && this.onProgressCallback) {
          this.onProgressCallback(progress);
        }
      },
      null, // phonemeIds (let piper-wasm generate them using espeak-ng)
      false // inferEmotion
    );

    return result;
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

    console.log(`🗣️ Synthesizing speech with espeak-ng phonemizer: "${text.substring(0, 50)}..."`);

    try {
      const voiceInfo = this.availableVoices.find(v => v.id === this.currentVoice);
      
      if (!voiceInfo) {
        throw new Error(`Voice not found: ${this.currentVoice}`);
      }

      // Use piper-wasm for synthesis
      const result = await this._synthesizeWithPiperWasm(text, voiceInfo);

      // Convert blob URL to audio data
      const audioData = await this._blobUrlToAudioData(result.file);
      
      const adjustedDuration = result.duration / this.speechRate;
      console.log(`✅ Synthesis complete: ${audioData.audioData.length} samples (${result.duration.toFixed(1)}s → ${adjustedDuration.toFixed(1)}s at ${this.speechRate}x speed)`);
      console.log(`[Piper] Phonemes used: ${result.phonemes?.join(' ') || 'N/A'}`);

      return {
        audioData: audioData.audioData,
        sampleRate: audioData.sampleRate,
        speechRate: this.speechRate
      };

    } catch (error) {
      console.error('❌ Synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Convert blob URL to Float32Array audio data
   * @private
   */
  async _blobUrlToAudioData(blobUrl) {
    try {
      // Fetch the blob
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // Decode using AudioContext
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get mono channel data
      const audioData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      // Cleanup
      await audioContext.close();
      URL.revokeObjectURL(blobUrl);

      return {
        audioData: new Float32Array(audioData),
        sampleRate
      };
    } catch (error) {
      console.error('[Piper] Failed to convert audio:', error);
      throw error;
    }
  }

  /**
   * Set progress callback
   * @param {Function} callback - Progress callback function
   */
  setProgressCallback(callback) {
    this.onProgressCallback = callback;
  }

  /**
   * Unload Piper TTS and cleanup
   */
  async unloadModel() {
    this.isInitialized = false;
    this.currentVoice = null;
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
   * Set speech rate (playback speed)
   * @param {number} rate - Speed multiplier (0.5 = half speed, 1.0 = normal, 1.5 = 50% faster)
   */
  setSpeechRate(rate) {
    if (rate < 0.5 || rate > 2.0) {
      console.warn('[Piper] Speech rate should be between 0.5 and 2.0, got:', rate);
      rate = Math.max(0.5, Math.min(2.0, rate));
    }
    this.speechRate = rate;
    console.log(`[Piper] Speech rate set to ${rate}x`);
  }

  /**
   * Get current speech rate
   * @returns {number} - Current speech rate multiplier
   */
  getSpeechRate() {
    return this.speechRate;
  }

  /**
   * Emit progress event (can be overridden)
   */
  emitProgress(progress) {
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
  }
}

// Export singleton instance
const piperService = new PiperService();
export default piperService;
