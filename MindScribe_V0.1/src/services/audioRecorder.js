/**
 * Audio Recorder Service - Microphone Audio Capture
 * 
 * Handles recording audio from microphone using Web Audio API
 * Converts audio to format required by Whisper (16kHz, mono, Float32)
 * 
 * Based on Web Audio API:
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
 */

class AudioRecorder {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.recordingStartTime = null;
    
    // Configuration
    this.targetSampleRate = 16000; // Whisper requires 16kHz
    this.maxRecordingTime = 120; // 120 seconds max
    this.silenceThreshold = 0.01; // Threshold for silence detection
    this.silenceDuration = 0; // Track silence duration
  }

  /**
   * Request microphone permission and initialize audio context
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.targetSampleRate
        }
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.targetSampleRate
      });

      console.log('✅ Audio recorder initialized');
      console.log(`📊 Sample rate: ${this.audioContext.sampleRate}Hz`);
      
    } catch (error) {
      console.error('❌ Failed to initialize audio recorder:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone.');
      } else {
        throw new Error(`Failed to access microphone: ${error.message}`);
      }
    }
  }

  /**
   * Start recording audio from microphone
   * @param {Object} options - Recording options
   * @returns {Promise<void>}
   */
  async startRecording(options = {}) {
    if (this.isRecording) {
      console.warn('⚠️ Already recording');
      return;
    }

    if (!this.mediaStream) {
      await this.initialize();
    }

    try {
      this.audioChunks = [];
      this.recordingStartTime = Date.now();
      this.silenceDuration = 0;

      // Create MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        console.log('📼 Recording stopped');
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

      console.log('🎤 Recording started');

      // Auto-stop after max recording time
      setTimeout(() => {
        if (this.isRecording) {
          console.log('⏰ Max recording time reached');
          this.stopRecording();
        }
      }, this.maxRecordingTime * 1000);

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return audio data
   * @returns {Promise<Float32Array>} - Audio samples (16kHz, mono, float32)
   */
  async stopRecording() {
    if (!this.isRecording) {
      console.warn('⚠️ Not recording');
      return null;
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        try {
          this.isRecording = false;
          const duration = (Date.now() - this.recordingStartTime) / 1000;
          console.log(`📊 Recording duration: ${duration.toFixed(1)}s`);

          // Create blob from chunks
          const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });
          console.log(`📦 Audio blob size: ${(audioBlob.size / 1024).toFixed(1)} KB`);

          // Convert to audio buffer
          const audioBuffer = await this.blobToAudioBuffer(audioBlob);
          
          // Resample to 16kHz if needed and convert to mono Float32Array
          const audioData = await this.processAudioBuffer(audioBuffer);

          console.log(`✅ Processed ${audioData.length} samples (${(audioData.length / 16000).toFixed(1)}s)`);
          resolve(audioData);

        } catch (error) {
          console.error('❌ Failed to process recording:', error);
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Convert Blob to AudioBuffer
   * @param {Blob} blob - Audio blob
   * @returns {Promise<AudioBuffer>}
   */
  async blobToAudioBuffer(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Process audio buffer - resample to 16kHz and convert to mono Float32Array
   * @param {AudioBuffer} audioBuffer - Input audio buffer
   * @returns {Promise<Float32Array>} - Processed audio samples
   */
  async processAudioBuffer(audioBuffer) {
    const targetSampleRate = this.targetSampleRate;
    const sourceSampleRate = audioBuffer.sampleRate;

    // Get mono channel data
    let channelData;
    if (audioBuffer.numberOfChannels === 1) {
      channelData = audioBuffer.getChannelData(0);
    } else {
      // Mix down to mono
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      channelData = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        channelData[i] = (left[i] + right[i]) / 2;
      }
    }

    // Resample if needed
    if (sourceSampleRate !== targetSampleRate) {
      console.log(`🔄 Resampling from ${sourceSampleRate}Hz to ${targetSampleRate}Hz`);
      return this.resample(channelData, sourceSampleRate, targetSampleRate);
    }

    return channelData;
  }

  /**
   * Resample audio to target sample rate
   * @param {Float32Array} audioData - Input audio samples
   * @param {number} sourceSampleRate - Source sample rate
   * @param {number} targetSampleRate - Target sample rate
   * @returns {Float32Array} - Resampled audio samples
   */
  resample(audioData, sourceSampleRate, targetSampleRate) {
    if (sourceSampleRate === targetSampleRate) {
      return audioData;
    }

    const ratio = sourceSampleRate / targetSampleRate;
    const newLength = Math.floor(audioData.length / ratio);
    const result = new Float32Array(newLength);

    // Simple linear interpolation resampling
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
      const t = srcIndex - srcIndexFloor;

      result[i] = audioData[srcIndexFloor] * (1 - t) + audioData[srcIndexCeil] * t;
    }

    return result;
  }

  /**
   * Get supported MIME type for MediaRecorder
   * @returns {string} - MIME type
   */
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`✅ Using MIME type: ${type}`);
        return type;
      }
    }

    console.warn('⚠️ No supported MIME type found, using default');
    return '';
  }

  /**
   * Check if microphone is available
   * @returns {Promise<boolean>}
   */
  static async checkMicrophoneAvailability() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudioInput = devices.some(device => device.kind === 'audioinput');
      return hasAudioInput;
    } catch (error) {
      console.error('Failed to check microphone availability:', error);
      return false;
    }
  }

  /**
   * Get recording status
   * @returns {boolean}
   */
  getIsRecording() {
    return this.isRecording;
  }

  /**
   * Get recording duration
   * @returns {number} - Duration in seconds
   */
  getRecordingDuration() {
    if (!this.isRecording || !this.recordingStartTime) {
      return 0;
    }
    return (Date.now() - this.recordingStartTime) / 1000;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isRecording = false;
    this.audioChunks = [];
    console.log('🗑️ Audio recorder cleaned up');
  }
}

// Export singleton instance
const audioRecorder = new AudioRecorder();
export default audioRecorder;
