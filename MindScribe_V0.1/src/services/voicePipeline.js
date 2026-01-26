/**
 * Voice Pipeline Service - End-to-End Voice-to-Voice Processing
 * 
 * Orchestrates the complete voice therapy conversation flow:
 * 1. User speaks → Audio Recording
 * 2. Audio → Whisper STT → Text
 * 3. Text → WebLLM → AI Response
 * 4. AI Response → Piper TTS → Audio
 * 5. Audio → Speaker Playback
 * 
 * Manages state and coordinates between all voice services
 */

import whisperService from './whisper.js';
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
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 22050 // Piper TTS outputs 22.05kHz
      });

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

      // Step 1: Speech-to-Text (Whisper)
      console.log('🎤 Step 1: Transcribing speech...');
      const sttStart = performance.now();
      const transcript = await whisperService.transcribe(audioData, {
        language: options.language || 'en'
      });
      this.lastProcessingTime.stt = performance.now() - sttStart;
      console.log(`✅ Transcription: "${transcript}" (${this.lastProcessingTime.stt.toFixed(0)}ms)`);

      if (!transcript || transcript.trim().length === 0) {
        throw new Error('No speech detected');
      }

      // Step 2: Generate AI Response (WebLLM)
      console.log('🤖 Step 2: Generating AI response...');
      const llmStart = performance.now();
      
      // Get conversation history for context (last 3 exchanges)
      const contextHistory = this.conversationHistory.slice(-6); // 3 user + 3 AI messages
      
      const llmResult = await webLLMService.chat(
        transcript,
        contextHistory,
        null,
        {
          maxTokens: 150, // Short responses for voice
          temperature: 0.8 // Slightly more conversational
        }
      );
      
      // Extract text content from WebLLM response object
      const aiResponse = typeof llmResult === 'string' ? llmResult : llmResult.content;
      this.lastProcessingTime.llm = performance.now() - llmStart;
      console.log(`✅ AI Response: "${aiResponse}" (${this.lastProcessingTime.llm.toFixed(0)}ms)`);

      // Step 3: Text-to-Speech (Piper)
      console.log('🗣️ Step 3: Synthesizing speech...');
      const ttsStart = performance.now();
      const audioOutput = await piperService.synthesize(aiResponse, {
        speed: options.speed || 1.0
      });
      this.lastProcessingTime.tts = performance.now() - ttsStart;
      console.log(`✅ Speech synthesized (${this.lastProcessingTime.tts.toFixed(0)}ms)`);

      // Step 4: Play audio
      console.log('🔊 Step 4: Playing audio response...');
      await this.playAudio(audioOutput.audioData);

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: transcript },
        { role: 'assistant', content: aiResponse }
      );

      // Calculate total processing time
      this.lastProcessingTime.total = performance.now() - startTime;
      console.log(`✅ [VoicePipeline] Complete! Total: ${this.lastProcessingTime.total.toFixed(0)}ms`);
      console.log(`📊 Breakdown: STT=${this.lastProcessingTime.stt.toFixed(0)}ms, LLM=${this.lastProcessingTime.llm.toFixed(0)}ms, TTS=${this.lastProcessingTime.tts.toFixed(0)}ms`);

      return {
        transcript,
        aiResponse,
        audioOutput,
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

        // Create audio buffer
        const audioBuffer = this.audioContext.createBuffer(
          1, // mono
          audioData.length,
          22050 // Piper sample rate
        );

        // Copy audio data to buffer
        audioBuffer.getChannelData(0).set(audioData);

        // Create buffer source
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
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

        console.log(`🔊 Playing ${(audioData.length / 22050).toFixed(1)}s of audio`);

      } catch (error) {
        console.error('❌ Failed to play audio:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop currently playing audio
   */
  stopAudio() {
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource = null;
        console.log('⏹️ Audio playback stopped');
      } catch (error) {
        console.warn('Failed to stop audio:', error);
      }
    }
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
