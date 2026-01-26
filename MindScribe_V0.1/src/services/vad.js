/**
 * Voice Activity Detection Service
 * 
 * Uses Silero-VAD ONNX model for accurate voice activity detection
 * Reference: https://github.com/snakers4/silero-vad
 * 
 * Key Features:
 * - Real-time voice activity detection
 * - Low latency (~10ms per chunk)
 * - High accuracy (95%+ on clean audio)
 * - ONNX Runtime Web for browser execution
 */

import * as ort from 'onnxruntime-web';

class VoiceActivityDetector {
  constructor() {
    this.session = null;
    this.isInitialized = false;
    
    // VAD model configuration (using raw GitHub release for reliability)
    // Silero VAD v5.0 - smaller and faster than v6
    this.modelUrl = 'https://github.com/snakers4/silero-vad/raw/v5.0/files/silero_vad.onnx';
    this.modelCacheName = 'mindscribe-vad-models';
    
    // Audio processing configuration
    this.sampleRate = 16000; // Required by Silero-VAD
    this.frameSamples = 512; // Number of samples per frame (32ms at 16kHz)
    
    // VAD state
    this.h = null; // Hidden state
    this.c = null; // Cell state
    this.lastSampleRate = 16000;
    
    // Detection thresholds
    this.config = {
      positiveSpeechThreshold: 0.5, // Probability threshold for speech detection
      negativeSpeechThreshold: 0.35, // Threshold for silence detection
      redemptionFrames: 8, // Number of frames to wait before declaring silence
      preSpeechPadFrames: 1, // Frames to include before speech starts
      minSpeechFrames: 3 // Minimum consecutive frames to confirm speech
    };
    
    // Detection state
    this.consecutiveSpeechFrames = 0;
    this.consecutiveSilenceFrames = 0;
    this.isSpeaking = false;
    this.speechStarted = false;
  }

  /**
   * Initialize VAD model
   * Downloads and loads Silero-VAD ONNX model
   */
  async init() {
    if (this.isInitialized) {
      console.log('[VAD] Already initialized');
      return;
    }

    try {
      console.log('[VAD] Initializing Voice Activity Detector...');
      
      // Check cache first
      const cachedModel = await this.loadFromCache();
      let modelBuffer;
      
      if (cachedModel) {
        console.log('[VAD] Loading model from cache');
        modelBuffer = cachedModel;
      } else {
        console.log('[VAD] Downloading model from:', this.modelUrl);
        const response = await fetch(this.modelUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to download VAD model: ${response.status}`);
        }
        
        modelBuffer = await response.arrayBuffer();
        
        // Cache the model
        await this.saveToCache(modelBuffer);
        console.log('[VAD] Model cached successfully');
      }

      // Create ONNX Runtime session
      console.log('[VAD] Creating ONNX Runtime session...');
      this.session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        executionMode: 'sequential',
        logSeverityLevel: 3 // Warning level
      });

      // Initialize state tensors
      this.resetStates();
      
      this.isInitialized = true;
      console.log('[VAD] Initialized successfully');
      console.log('[VAD] Model size:', (modelBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB');
      
    } catch (error) {
      console.error('[VAD] Initialization failed:', error);
      throw new Error(`VAD initialization failed: ${error.message}`);
    }
  }

  /**
   * Reset LSTM states
   * Required at the start of each new audio stream
   */
  resetStates() {
    // Initialize hidden state (h) and cell state (c) for LSTM
    // Shape: [2, 1, 64] as per Silero-VAD specification
    const stateSize = 2 * 1 * 64;
    this.h = new ort.Tensor('float32', new Float32Array(stateSize), [2, 1, 64]);
    this.c = new ort.Tensor('float32', new Float32Array(stateSize), [2, 1, 64]);
    
    // Reset detection state
    this.consecutiveSpeechFrames = 0;
    this.consecutiveSilenceFrames = 0;
    this.isSpeaking = false;
    this.speechStarted = false;
    
    console.log('[VAD] States reset');
  }

  /**
   * Process audio frame and detect voice activity
   * 
   * @param {Float32Array} audioFrame - Audio samples (512 samples at 16kHz = 32ms)
   * @returns {Promise<Object>} Detection result { isSpeech, probability, isSpeaking }
   */
  async processFrame(audioFrame) {
    if (!this.isInitialized) {
      throw new Error('VAD not initialized. Call init() first.');
    }

    try {
      // Validate frame size
      if (audioFrame.length !== this.frameSamples) {
        console.warn(`[VAD] Invalid frame size: ${audioFrame.length}, expected ${this.frameSamples}`);
        // Pad or truncate to correct size
        const paddedFrame = new Float32Array(this.frameSamples);
        paddedFrame.set(audioFrame.slice(0, this.frameSamples));
        audioFrame = paddedFrame;
      }

      // Prepare input tensors
      const inputTensor = new ort.Tensor('float32', audioFrame, [1, audioFrame.length]);
      const srTensor = new ort.Tensor('int64', new BigInt64Array([BigInt(this.sampleRate)]), [1]);

      // Run inference
      const feeds = {
        input: inputTensor,
        sr: srTensor,
        h: this.h,
        c: this.c
      };

      const results = await this.session.run(feeds);

      // Update states for next frame
      this.h = results.hn;
      this.c = results.cn;

      // Get speech probability
      const probability = results.output.data[0];
      
      // Apply threshold logic with hysteresis
      const isSpeech = this.applyThreshold(probability);
      
      return {
        isSpeech,
        probability,
        isSpeaking: this.isSpeaking,
        speechStarted: this.speechStarted
      };
      
    } catch (error) {
      console.error('[VAD] Frame processing failed:', error);
      return {
        isSpeech: false,
        probability: 0,
        isSpeaking: this.isSpeaking,
        speechStarted: false
      };
    }
  }

  /**
   * Apply threshold logic with hysteresis to reduce false positives
   * 
   * @param {number} probability - Speech probability from model (0-1)
   * @returns {boolean} Whether speech is detected
   */
  applyThreshold(probability) {
    // Check if probability exceeds positive threshold
    if (probability >= this.config.positiveSpeechThreshold) {
      this.consecutiveSpeechFrames++;
      this.consecutiveSilenceFrames = 0;
      
      // Confirm speech after minimum consecutive frames
      if (this.consecutiveSpeechFrames >= this.config.minSpeechFrames) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.speechStarted = true;
          console.log('[VAD] Speech started (probability:', probability.toFixed(3), ')');
        }
        return true;
      }
    }
    // Check if probability falls below negative threshold
    else if (probability < this.config.negativeSpeechThreshold) {
      this.consecutiveSilenceFrames++;
      this.consecutiveSpeechFrames = 0;
      
      // Confirm silence after redemption frames
      if (this.consecutiveSilenceFrames >= this.config.redemptionFrames) {
        if (this.isSpeaking) {
          this.isSpeaking = false;
          console.log('[VAD] Speech ended (probability:', probability.toFixed(3), ')');
        }
        this.speechStarted = false;
        return false;
      }
    }
    
    // Maintain current state during intermediate probabilities
    return this.isSpeaking;
  }

  /**
   * Process continuous audio stream
   * Splits audio into frames and processes each frame
   * 
   * @param {Float32Array} audioData - Audio samples
   * @returns {Promise<Array>} Array of detection results per frame
   */
  async processAudioStream(audioData) {
    const results = [];
    const numFrames = Math.floor(audioData.length / this.frameSamples);
    
    for (let i = 0; i < numFrames; i++) {
      const frameStart = i * this.frameSamples;
      const frameEnd = frameStart + this.frameSamples;
      const frame = audioData.slice(frameStart, frameEnd);
      
      const result = await this.processFrame(frame);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Detect speech segments in audio
   * Returns start/end timestamps of speech segments
   * 
   * @param {Float32Array} audioData - Audio samples
   * @returns {Promise<Array>} Array of {start, end, confidence} objects
   */
  async detectSpeechSegments(audioData) {
    this.resetStates();
    
    const segments = [];
    const results = await this.processAudioStream(audioData);
    
    let currentSegment = null;
    const frameDuration = this.frameSamples / this.sampleRate; // 32ms
    
    results.forEach((result, frameIndex) => {
      const timestamp = frameIndex * frameDuration;
      
      if (result.speechStarted && !currentSegment) {
        // Start new segment
        currentSegment = {
          start: timestamp,
          end: timestamp + frameDuration,
          confidence: result.probability
        };
      } else if (currentSegment && result.isSpeaking) {
        // Continue current segment
        currentSegment.end = timestamp + frameDuration;
        currentSegment.confidence = Math.max(currentSegment.confidence, result.probability);
      } else if (currentSegment && !result.isSpeaking) {
        // End current segment
        segments.push({ ...currentSegment });
        currentSegment = null;
      }
    });
    
    // Add final segment if still active
    if (currentSegment) {
      segments.push(currentSegment);
    }
    
    return segments;
  }

  /**
   * Update VAD configuration
   * 
   * @param {Object} config - Configuration options
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    console.log('[VAD] Configuration updated:', this.config);
  }

  /**
   * Load model from browser cache
   */
  async loadFromCache() {
    try {
      const cache = await caches.open(this.modelCacheName);
      const response = await cache.match(this.modelUrl);
      
      if (response) {
        return await response.arrayBuffer();
      }
      return null;
    } catch (error) {
      console.warn('[VAD] Cache read failed:', error);
      return null;
    }
  }

  /**
   * Save model to browser cache
   */
  async saveToCache(modelBuffer) {
    try {
      const cache = await caches.open(this.modelCacheName);
      const response = new Response(modelBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'max-age=31536000' // 1 year
        }
      });
      await cache.put(this.modelUrl, response);
      console.log('[VAD] Model cached');
    } catch (error) {
      console.warn('[VAD] Cache write failed:', error);
    }
  }

  /**
   * Clean up resources
   */
  async dispose() {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    this.h = null;
    this.c = null;
    this.isInitialized = false;
    console.log('[VAD] Disposed');
  }

  /**
   * Get current VAD state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      isSpeaking: this.isSpeaking,
      consecutiveSpeechFrames: this.consecutiveSpeechFrames,
      consecutiveSilenceFrames: this.consecutiveSilenceFrames,
      config: this.config
    };
  }
}

// Singleton instance
let vadInstance = null;

/**
 * Get VAD singleton instance
 */
export function getVADInstance() {
  if (!vadInstance) {
    vadInstance = new VoiceActivityDetector();
  }
  return vadInstance;
}

export default VoiceActivityDetector;
