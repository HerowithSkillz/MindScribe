/**
 * Voice Activity Detection Utilities
 * 
 * Helper functions for VAD processing and audio manipulation
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
 */

/**
 * Split audio into fixed-size frames for VAD processing
 * 
 * @param {Float32Array} audioData - Audio samples
 * @param {number} frameSize - Number of samples per frame (default: 512 for 32ms at 16kHz)
 * @param {number} hopSize - Number of samples to advance (default: frameSize for no overlap)
 * @returns {Array<Float32Array>} Array of audio frames
 */
export function splitIntoFrames(audioData, frameSize = 512, hopSize = null) {
  if (!hopSize) hopSize = frameSize;
  
  const frames = [];
  const numFrames = Math.floor((audioData.length - frameSize) / hopSize) + 1;
  
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    const end = start + frameSize;
    
    if (end <= audioData.length) {
      frames.push(audioData.slice(start, end));
    } else {
      // Pad last frame if needed
      const paddedFrame = new Float32Array(frameSize);
      paddedFrame.set(audioData.slice(start));
      frames.push(paddedFrame);
    }
  }
  
  return frames;
}

/**
 * Merge speech segments that are close together
 * Reduces fragmentation of continuous speech
 * 
 * @param {Array} segments - Array of {start, end, confidence} objects
 * @param {number} maxGap - Maximum gap between segments to merge (in seconds)
 * @returns {Array} Merged segments
 */
export function mergeSpeechSegments(segments, maxGap = 0.3) {
  if (segments.length === 0) return [];
  
  const merged = [];
  let current = { ...segments[0] };
  
  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];
    const gap = next.start - current.end;
    
    if (gap <= maxGap) {
      // Merge segments
      current.end = next.end;
      current.confidence = Math.max(current.confidence, next.confidence);
    } else {
      // Save current and start new segment
      merged.push(current);
      current = { ...next };
    }
  }
  
  // Add final segment
  merged.push(current);
  
  return merged;
}

/**
 * Filter out short speech segments (likely noise)
 * 
 * @param {Array} segments - Array of {start, end, confidence} objects
 * @param {number} minDuration - Minimum duration in seconds (default: 0.3s)
 * @returns {Array} Filtered segments
 */
export function filterShortSegments(segments, minDuration = 0.3) {
  return segments.filter(segment => {
    const duration = segment.end - segment.start;
    return duration >= minDuration;
  });
}

/**
 * Extract audio segment from buffer
 * 
 * @param {Float32Array} audioData - Full audio buffer
 * @param {number} sampleRate - Sample rate (Hz)
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @returns {Float32Array} Extracted audio segment
 */
export function extractSegment(audioData, sampleRate, startTime, endTime) {
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  
  return audioData.slice(startSample, endSample);
}

/**
 * Calculate energy (RMS) of audio frame
 * Useful for simple energy-based VAD as fallback
 * 
 * @param {Float32Array} audioFrame - Audio samples
 * @returns {number} RMS energy
 */
export function calculateEnergy(audioFrame) {
  let sumSquares = 0;
  
  for (let i = 0; i < audioFrame.length; i++) {
    sumSquares += audioFrame[i] * audioFrame[i];
  }
  
  return Math.sqrt(sumSquares / audioFrame.length);
}

/**
 * Simple energy-based VAD (fallback when Silero-VAD unavailable)
 * 
 * @param {Float32Array} audioFrame - Audio samples
 * @param {number} threshold - Energy threshold (default: 0.02)
 * @returns {boolean} Whether speech is detected
 */
export function energyBasedVAD(audioFrame, threshold = 0.02) {
  const energy = calculateEnergy(audioFrame);
  return energy > threshold;
}

/**
 * Calculate zero-crossing rate
 * Higher ZCR typically indicates unvoiced speech or noise
 * 
 * @param {Float32Array} audioFrame - Audio samples
 * @returns {number} Zero-crossing rate (0-1)
 */
export function calculateZeroCrossingRate(audioFrame) {
  let crossings = 0;
  
  for (let i = 1; i < audioFrame.length; i++) {
    if ((audioFrame[i] >= 0 && audioFrame[i - 1] < 0) ||
        (audioFrame[i] < 0 && audioFrame[i - 1] >= 0)) {
      crossings++;
    }
  }
  
  return crossings / (audioFrame.length - 1);
}

/**
 * Apply pre-emphasis filter to enhance high frequencies
 * Improves VAD performance for speech
 * 
 * @param {Float32Array} audioData - Audio samples
 * @param {number} coefficient - Pre-emphasis coefficient (default: 0.97)
 * @returns {Float32Array} Filtered audio
 */
export function applyPreEmphasis(audioData, coefficient = 0.97) {
  const filtered = new Float32Array(audioData.length);
  filtered[0] = audioData[0];
  
  for (let i = 1; i < audioData.length; i++) {
    filtered[i] = audioData[i] - coefficient * audioData[i - 1];
  }
  
  return filtered;
}

/**
 * Normalize audio to range [-1, 1]
 * 
 * @param {Float32Array} audioData - Audio samples
 * @returns {Float32Array} Normalized audio
 */
export function normalizeAudio(audioData) {
  const maxAbs = Math.max(...audioData.map(Math.abs));
  
  if (maxAbs === 0) return audioData;
  
  const normalized = new Float32Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    normalized[i] = audioData[i] / maxAbs;
  }
  
  return normalized;
}

/**
 * Apply Hamming window to audio frame
 * Reduces spectral leakage in frequency analysis
 * 
 * @param {Float32Array} audioFrame - Audio samples
 * @returns {Float32Array} Windowed audio
 */
export function applyHammingWindow(audioFrame) {
  const windowed = new Float32Array(audioFrame.length);
  const N = audioFrame.length;
  
  for (let n = 0; n < N; n++) {
    const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
    windowed[n] = audioFrame[n] * window;
  }
  
  return windowed;
}

/**
 * Detect speech in audio using multiple features
 * Combines energy, ZCR, and optional VAD model
 * 
 * @param {Float32Array} audioFrame - Audio samples
 * @param {Object} options - Detection options
 * @returns {Object} Detection result
 */
export function multiFeatureVAD(audioFrame, options = {}) {
  const {
    energyThreshold = 0.02,
    zcrThreshold = 0.3,
    useZCR = true
  } = options;
  
  // Calculate features
  const energy = calculateEnergy(audioFrame);
  const isSpeechEnergy = energy > energyThreshold;
  
  if (!useZCR) {
    return {
      isSpeech: isSpeechEnergy,
      energy,
      zcr: null
    };
  }
  
  const zcr = calculateZeroCrossingRate(audioFrame);
  const isSpeechZCR = zcr < zcrThreshold; // Low ZCR for voiced speech
  
  // Combine features (both must indicate speech)
  const isSpeech = isSpeechEnergy && isSpeechZCR;
  
  return {
    isSpeech,
    energy,
    zcr
  };
}

/**
 * Format speech segment for display
 * 
 * @param {Object} segment - Speech segment {start, end, confidence}
 * @returns {string} Formatted string
 */
export function formatSegment(segment) {
  const duration = segment.end - segment.start;
  return `[${segment.start.toFixed(2)}s - ${segment.end.toFixed(2)}s] (${duration.toFixed(2)}s, conf: ${(segment.confidence * 100).toFixed(1)}%)`;
}

/**
 * Convert audio buffer to mono if stereo
 * 
 * @param {Float32Array} audioData - Audio samples
 * @param {number} channels - Number of channels
 * @returns {Float32Array} Mono audio
 */
export function convertToMono(audioData, channels) {
  if (channels === 1) return audioData;
  
  const monoLength = Math.floor(audioData.length / channels);
  const mono = new Float32Array(monoLength);
  
  for (let i = 0; i < monoLength; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      sum += audioData[i * channels + ch];
    }
    mono[i] = sum / channels;
  }
  
  return mono;
}

/**
 * Resample audio to target sample rate
 * Simple linear interpolation
 * 
 * @param {Float32Array} audioData - Audio samples
 * @param {number} fromRate - Source sample rate
 * @param {number} toRate - Target sample rate
 * @returns {Float32Array} Resampled audio
 */
export function resampleAudio(audioData, fromRate, toRate) {
  if (fromRate === toRate) return audioData;
  
  const ratio = fromRate / toRate;
  const newLength = Math.round(audioData.length / ratio);
  const resampled = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    
    // Linear interpolation
    resampled[i] = audioData[srcIndexFloor] * (1 - fraction) +
                   audioData[srcIndexCeil] * fraction;
  }
  
  return resampled;
}

/**
 * Create visualization data from audio
 * Returns array of amplitude values for waveform display
 * 
 * @param {Float32Array} audioData - Audio samples
 * @param {number} numBars - Number of bars to display (default: 20)
 * @returns {Array<number>} Amplitude values (0-1)
 */
export function createVisualizationData(audioData, numBars = 20) {
  const samplesPerBar = Math.floor(audioData.length / numBars);
  const amplitudes = [];
  
  for (let i = 0; i < numBars; i++) {
    const start = i * samplesPerBar;
    const end = Math.min(start + samplesPerBar, audioData.length);
    const segment = audioData.slice(start, end);
    
    // Calculate RMS for this segment
    const rms = calculateEnergy(segment);
    amplitudes.push(Math.min(rms * 10, 1)); // Scale and clamp to [0, 1]
  }
  
  return amplitudes;
}

/**
 * Detect silence in audio buffer
 * 
 * @param {Float32Array} audioData - Audio samples
 * @param {number} threshold - Energy threshold for silence (default: 0.01)
 * @returns {boolean} Whether audio is silent
 */
export function isSilent(audioData, threshold = 0.01) {
  const energy = calculateEnergy(audioData);
  return energy < threshold;
}

/**
 * Trim silence from start and end of audio
 * 
 * @param {Float32Array} audioData - Audio samples
 * @param {number} threshold - Energy threshold (default: 0.01)
 * @param {number} frameSize - Frame size for detection (default: 512)
 * @returns {Float32Array} Trimmed audio
 */
export function trimSilence(audioData, threshold = 0.01, frameSize = 512) {
  const frames = splitIntoFrames(audioData, frameSize);
  
  // Find first non-silent frame
  let startFrame = 0;
  for (let i = 0; i < frames.length; i++) {
    if (!isSilent(frames[i], threshold)) {
      startFrame = i;
      break;
    }
  }
  
  // Find last non-silent frame
  let endFrame = frames.length - 1;
  for (let i = frames.length - 1; i >= 0; i--) {
    if (!isSilent(frames[i], threshold)) {
      endFrame = i;
      break;
    }
  }
  
  // Extract trimmed audio
  const startSample = startFrame * frameSize;
  const endSample = (endFrame + 1) * frameSize;
  
  return audioData.slice(startSample, Math.min(endSample, audioData.length));
}

export default {
  splitIntoFrames,
  mergeSpeechSegments,
  filterShortSegments,
  extractSegment,
  calculateEnergy,
  energyBasedVAD,
  calculateZeroCrossingRate,
  applyPreEmphasis,
  normalizeAudio,
  applyHammingWindow,
  multiFeatureVAD,
  formatSegment,
  convertToMono,
  resampleAudio,
  createVisualizationData,
  isSilent,
  trimSilence
};
