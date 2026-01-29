/**
 * Voice Pipeline Service - End-to-End Voice-to-Voice Processing
 * 
 * Orchestrates the complete voice therapy conversation flow:
 * 1. User speaks → Audio Recording
 * 2. Audio → Whisper WebGPU STT → Text (6-8x faster with GPU!)
 * 3. Text → WebLLM → AI Response
 * 4. AI Response → Piper TTS → Audio
 * 5. Audio → Speaker Playback
 * 
 * Manages state and coordinates between all voice services
 * 
 * Updated: Now uses WebGPU-accelerated Whisper for faster transcription
 */

import whisperWebGPU from './whisperWebGPU.js';
import piperService from './piper.js';
import webLLMService from './webllm.js';
import audioRecorder from './audioRecorder.js';
import { getVADInstance } from './vad.js';
import { trimSilence, normalizeAudio } from '../utils/vadHelpers.js';

class VoicePipeline {
  constructor() {
    this.isProcessing = false;
    this.conversationHistory = [];
    this.audioContext = null;
    this.currentAudioSource = null;
    this.vadInstance = null;
    this.useVAD = true; // Enable VAD by default
    
    // Streaming audio queue for real-time playback
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
    this.scheduledSources = [];
    
    // Performance tracking
    this.lastProcessingTime = {
      stt: 0,
      llm: 0,
      tts: 0,
      vad: 0,
      total: 0
    };
  }

  /**
   * Initialize voice pipeline
   * @param {Object} options - Initialization options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    try {
      console.log('[VoicePipeline] Initializing...');

      // Initialize audio context for playback  
      // Let browser use default sample rate and resample Piper's 22050Hz audio
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Initialize VAD if enabled
      this.useVAD = options.useVAD !== false;
      if (this.useVAD) {
        try {
          console.log('[VoicePipeline] Initializing VAD...');
          this.vadInstance = getVADInstance();
          await this.vadInstance.init();
          console.log('✅ VAD initialized');
        } catch (error) {
          console.warn('⚠️ VAD initialization failed, continuing without VAD:', error);
          this.useVAD = false;
          this.vadInstance = null;
        }
      }

      console.log('✅ Voice pipeline initialized');
    } catch (error) {
      console.error('❌ Failed to initialize voice pipeline:', error);
      throw error;
    }
  }

  /**
   * Process voice input through complete pipeline
   * @param {F0: Voice Activity Detection & Audio Preprocessing
      let processedAudio = audioData;
      if (this.useVAD && this.vadInstance) {
        console.log('🎙️ Step 0: Running VAD and preprocessing...');
        const vadStart = performance.now();
        
        try {
          // Reset VAD state for new audio
          this.vadInstance.resetStates();
          
          // Detect speech segments
          const segments = await this.vadInstance.detectSpeechSegments(audioData);
          console.log(`📊 VAD detected ${segments.length} speech segment(s)`);
          
          if (segments.length === 0) {
            console.warn('⚠️ No speech detected by VAD');
            throw new Error('No speech detected');
          }
          
          // Trim silence from audio
          processedAudio = trimSilence(audioData);
          
          // Normalize audio levels
          processedAudio = normalizeAudio(processedAudio);
          
          this.lastProcessingTime.vad = performance.now() - vadStart;
          console.log(`✅ VAD & preprocessing complete (${this.lastProcessingTime.vad.toFixed(0)}ms)`);
        } catch (vadError) {
          console.warn('⚠️ VAD processing failed, using raw audio:', vadError);
          this.lastProcessingTime.vad = performance.now() - vadStart;
        }
      }
  /**
   * Process voice input through complete pipeline
   * @param {Float32Array} audioData - Raw audio data
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processing result
   */
  async processVoiceInput(audioData, options = {}) {
    if (this.isProcessing) {
      console.warn('⚠️ Already processing voice input');
      return null;
    }

    const startTime = performance.now();
    this.isProcessing = true;

    try {
      console.log('🎯 [VoicePipeline] Starting voice-to-voice processing...');

      // Step 1: Speech-to-Text (Whisper WebGPU - 6-8x faster!)
      console.log('🎤 Step 1: Transcribing speech with WebGPU...');
      const sttStart = performance.now();
      const transcript = await whisperWebGPU.transcribe(audioData, {
        language: options.language || 'en'
      });
      this.lastProcessingTime.stt = performance.now() - sttStart;
      console.log(`✅ Transcription: "${transcript}" (${this.lastProcessingTime.stt.toFixed(0)}ms)`);
      
      // Log WebGPU acceleration status
      const whisperInfo = whisperWebGPU.getModelInfo();
      console.log(`📊 Whisper using: ${whisperInfo.device.toUpperCase()}`);

      if (!transcript || transcript.trim().length === 0) {
        throw new Error('No speech detected');
      }

      // Step 2 & 3: Generate AI Response with TRUE STREAMING TTS
      // Audio plays immediately as each sentence is synthesized!
      console.log('🤖 Step 2: Generating AI response with real-time streaming TTS...');
      const llmStart = performance.now();
      
      // Get conversation history for context (last 3 exchanges)
      const contextHistory = this.conversationHistory.slice(-6);
      
      let aiResponse = '';
      const audioChunks = [];
      
      // Reset streaming audio state
      this.resetStreamingAudio();
      
      // Use streaming generation with immediate audio playback
      aiResponse = await webLLMService.generateStreamingResponse(
        transcript,
        contextHistory,
        // onSentence callback - synthesize and IMMEDIATELY queue for playback
        async (sentence) => {
          console.log(`🗣️ Synthesizing: "${sentence}"`);
          const ttsStart = performance.now();
          
          try {
            const audioOutput = await piperService.synthesize(sentence, {
              speed: options.speed || 1.0
            });
            
            const ttsDuration = performance.now() - ttsStart;
            console.log(`✅ Synthesized (${ttsDuration.toFixed(0)}ms) - Queueing for immediate playback`);
            
            audioChunks.push(audioOutput.audioData);
            
            // Queue audio for immediate streaming playback
            // This plays audio AS SOON AS it's synthesized, not after everything is done
            this.queueStreamingAudio(audioOutput.audioData);
            
          } catch (ttsError) {
            console.error('TTS error for sentence:', ttsError);
          }
        },
        // onToken callback - for real-time text updates
        options.onToken || null
      );
      
      this.lastProcessingTime.llm = performance.now() - llmStart;
      console.log(`✅ AI Response: "${aiResponse}" (${this.lastProcessingTime.llm.toFixed(0)}ms)`);

      // Wait for any remaining audio to finish playing
      console.log('🔊 Step 3: Waiting for streaming audio to complete...');
      const playStart = performance.now();
      await this.waitForStreamingAudioComplete();
      
      this.lastProcessingTime.tts = performance.now() - playStart;
      console.log(`✅ Streaming audio complete (${this.lastProcessingTime.tts.toFixed(0)}ms)`);

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: transcript },
        { role: 'assistant', content: aiResponse }
      );

      // Calculate total processing time
      this.lastProcessingTime.total = performance.now() - startTime;
      console.log(`✅ [VoicePipeline] Complete! Total: ${this.lastProcessingTime.total.toFixed(0)}ms`);
      console.log(`📊 Breakdown: STT=${this.lastProcessingTime.stt.toFixed(0)}ms, LLM+TTS=${this.lastProcessingTime.llm.toFixed(0)}ms`);

      return {
        transcript,
        aiResponse,
        audioChunks,
        processingTime: this.lastProcessingTime
      };

    } catch (error) {
      console.error('❌ Voice pipeline error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Concatenate multiple audio chunks into a single Float32Array
   * @param {Float32Array[]} chunks - Array of audio chunks
   * @returns {Float32Array} - Combined audio data
   */
  concatenateAudioChunks(chunks) {
    if (chunks.length === 0) return new Float32Array(0);
    if (chunks.length === 1) return chunks[0];
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Float32Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  /**
   * Play audio through speakers using Web Audio API
   * @param {Float32Array} audioData - Audio samples (22.05kHz, mono)
   * @returns {Promise<void>}
   */
  async playAudio(audioData) {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing audio
        if (this.currentAudioSource) {
          try {
            this.currentAudioSource.stop();
          } catch (e) {
            // Ignore if already stopped
          }
        }

        // Resume audio context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }

        // Create audio buffer at Piper's native sample rate
        // NO playbackRate modification - preserves natural voice pitch
        const audioBuffer = this.audioContext.createBuffer(
          1, // mono
          audioData.length,
          22050 // Piper native sample rate
        );

        // Copy audio data to buffer
        audioBuffer.getChannelData(0).set(audioData);

        // Create buffer source - natural playback, no pitch modification
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        // playbackRate stays at default 1.0 for natural voice quality
        source.connect(this.audioContext.destination);

        // Handle playback end
        source.onended = () => {
          console.log('🔇 Audio playback complete');
          this.currentAudioSource = null;
          resolve();
        };

        // Start playback
        source.start(0);
        this.currentAudioSource = source;
        
        const duration = audioData.length / 22050;
        console.log(`🔊 Playing ${duration.toFixed(1)}s of natural audio`);

      } catch (error) {
        console.error('❌ Failed to play audio:', error);
        reject(error);
      }
    });
  }

  /**
   * Reset streaming audio state for new response
   * @private
   */
  resetStreamingAudio() {
    // Stop any currently playing audio
    this.stopAllStreamingAudio();
    
    // Reset state
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
    this.scheduledSources = [];
  }

  /**
   * Queue audio chunk for immediate streaming playback
   * Uses Web Audio API scheduling for seamless playback
   * @param {Float32Array} audioData - Audio samples to queue
   */
  queueStreamingAudio(audioData) {
    if (!this.audioContext) {
      console.error('[VoicePipeline] Audio context not initialized');
      return;
    }

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Create audio buffer at Piper's native sample rate
      // NO playbackRate modification - preserves natural voice pitch and quality
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono
        audioData.length,
        22050 // Piper native sample rate - play as-is for natural voice
      );
      audioBuffer.getChannelData(0).set(audioData);

      // Create buffer source - NO playbackRate change to preserve natural pitch
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      // playbackRate = 1.0 (default) - natural voice without pitch distortion
      source.connect(this.audioContext.destination);

      // Calculate when to start this chunk
      const currentTime = this.audioContext.currentTime;
      const audioDuration = audioData.length / 22050; // Natural duration
      
      // If this is the first chunk or we've fallen behind, start immediately
      if (!this.isPlaying || this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.05; // Small buffer for smooth start
        this.isPlaying = true;
      }

      // Schedule this chunk to play right after the previous one
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioDuration;
      
      // Track scheduled sources for cleanup
      this.scheduledSources.push(source);
      
      // Cleanup when this source finishes
      source.onended = () => {
        const index = this.scheduledSources.indexOf(source);
        if (index > -1) {
          this.scheduledSources.splice(index, 1);
        }
        // If no more sources, reset playing state
        if (this.scheduledSources.length === 0) {
          this.isPlaying = false;
        }
      };

      console.log(`🎵 Queued ${audioDuration.toFixed(2)}s audio, playing at ${this.nextPlayTime.toFixed(2)}s`);

    } catch (error) {
      console.error('[VoicePipeline] Failed to queue streaming audio:', error);
    }
  }

  /**
   * Wait for all streaming audio to finish playing
   * @returns {Promise<void>}
   */
  async waitForStreamingAudioComplete() {
    if (!this.isPlaying && this.scheduledSources.length === 0) {
      return; // Nothing playing
    }

    return new Promise((resolve) => {
      const checkComplete = () => {
        if (this.scheduledSources.length === 0 && !this.isPlaying) {
          console.log('🔇 All streaming audio complete');
          resolve();
        } else {
          // Check again in 100ms
          setTimeout(checkComplete, 100);
        }
      };
      checkComplete();
    });
  }

  /**
   * Stop all scheduled/playing streaming audio
   */
  stopAllStreamingAudio() {
    for (const source of this.scheduledSources) {
      try {
        source.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    }
    this.scheduledSources = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }

  /**
   * Stop currently playing audio
   */
  stopAudio() {
    // Stop legacy single-source audio
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource = null;
        console.log('⏹️ Audio playback stopped');
      } catch (error) {
        console.warn('Failed to stop audio:', error);
      }
    }
    
    // Stop all streaming audio
    this.stopAllStreamingAudio();
  }

  /**
   * Start a voice conversation session
   * Initializes recorder and starts listening
   * @param {Function} onTranscript - Callback when user speaks
   * @param {Function} onResponse - Callback when AI responds
   * @returns {Promise<void>}
   */
  async startSession(onTranscript, onResponse) {
    console.log('[VoicePipeline] Starting voice therapy session...');

    // Initialize recorder
    await audioRecorder.initialize();

    // Clear conversation history for new session
    this.conversationHistory = [];

    console.log('✅ Voice therapy session started');
  }

  /**
   * End voice conversation session
   */
  async endSession() {
    console.log('[VoicePipeline] Ending voice therapy session...');

    // Stop any playing audio
    this.stopAudio();

    // Cleanup recorder
    await audioRecorder.cleanup();

    // Return conversation history for storage
    const session = {
      transcript: this.conversationHistory,
      duration: this.getTotalSessionDuration(),
      timestamp: new Date().toISOString()
    };

    console.log('✅ Voice therapy session ended');
    return session;
  }

  /**
   * Get conversation history
   * @returns {Array} - Conversation messages
   */
  getConversationHistory() {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    console.log('🗑️ Conversation history cleared');
  }

  /**
   * Get last processing time metrics
   * @returns {Object} - Processing time breakdown
   */
  getProcessingMetrics() {
    return { ...this.lastProcessingTime };
  }

  /**
   * Calculate total session duration
   * @returns {number} - Duration in seconds
   */
  getTotalSessionDuration() {
    // Estimate based on conversation length
    // Each exchange takes roughly 5-10 seconds
    return this.conversationHistory.length * 7.5 / 2; // Divide by 2 for user+AI pairs
  }

  /**
   * Check if pipeline is currently processing
   * @returns {boolean}
   */
  isCurrentlyProcessing() {
    return this.isProcessing;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.stopAudio();
    
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // Cleanup VAD
    if (this.vadInstance) {
      await this.vadInstance.dispose();
      this.vadInstance = null;
    }

    await audioRecorder.cleanup();
    
    this.conversationHistory = [];
    this.isProcessing = false;
    console.log('🗑️ Voice pipeline cleaned up');
  }

  /**
   * Toggle VAD on/off
   * @param {boolean} enabled - Enable or disable VAD
   */
  setVADEnabled(enabled) {
    this.useVAD = enabled && this.vadInstance !== null;
    console.log(`[VoicePipeline] VAD ${this.useVAD ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get VAD state
   * @returns {Object|null} - VAD state or null if disabled
   */
  getVADState() {
    if (this.vadInstance) {
      return this.vadInstance.getState();
    }
    return null;
  }
}

// Export singleton instance
const voicePipeline = new VoicePipeline();
export default voicePipeline;
