/**
 * Whisper.cpp Web Worker - Speech-to-Text Processing
 * 
 * This worker handles Whisper model loading and audio transcription using @remotion/whisper-web
 * Runs in isolated thread to prevent UI blocking
 * 
 * Using production-ready implementation from: https://github.com/remotion-dev/whisper-webgpu
 */

import { transcribe, downloadWhisperModel } from '@remotion/whisper-web';

let currentModelId = null;
let isInitializing = false;

/**
 * Initialize Whisper model (pre-download if needed)
 */
async function initializeWhisper(modelId) {
  if (isInitializing) {
    console.warn('[Whisper Worker] Already initializing, skipping duplicate request');
    return;
  }

  try {
    isInitializing = true;
    console.log('[Whisper Worker] Initializing Whisper model:', modelId);

    // Map our model IDs to Whisper model names
    const modelMap = {
      'tiny.en': 'tiny.en',
      'base.en': 'base.en',
      'small.en': 'small.en'
    };

    const whisperModelName = modelMap[modelId] || 'base.en';
    
    // Pre-download the model if not cached
    // The transcribe function will use the cached model automatically
    await downloadWhisperModel({
      model: whisperModelName,
      onProgress: (progress) => {
        self.postMessage({ 
          type: 'progress', 
          progress: progress.progress,
          loaded: progress.loaded,
          total: progress.total
        });
      }
    });

    currentModelId = whisperModelName;
    console.log('[Whisper Worker] ✅ Initialization complete');
    self.postMessage({ type: 'initialized', modelId: whisperModelName });

  } catch (error) {
    console.error('[Whisper Worker] ❌ Initialization failed:', error);
    self.postMessage({ type: 'error', error: error.message });
  } finally {
    isInitializing = false;
  }
}

/**
 * Transcribe audio using Whisper
 */
async function transcribeAudio(audioData, language = 'en', translate = false) {
  try {
    if (!currentModelId) {
      throw new Error('Whisper not initialized');
    }

    console.log(`[Whisper Worker] Transcribing ${audioData.length} audio samples`);

    // Ensure audioData is Float32Array (16kHz mono audio expected)
    const channelWaveform = audioData instanceof Float32Array 
      ? audioData 
      : new Float32Array(audioData);
    
    // Transcribe using @remotion/whisper-web
    const result = await transcribe({
      channelWaveform,
      model: currentModelId,
      language: language === 'en' ? 'en' : 'auto',
      onProgress: (progress) => {
        self.postMessage({ type: 'transcribe-progress', progress });
      }
    });

    // Extract text from result
    const transcription = result.chunks.map(chunk => chunk.text).join(' ').trim();
    
    console.log('[Whisper Worker] ✅ Transcription complete:', transcription);
    self.postMessage({ 
      type: 'transcription', 
      text: transcription,
      chunks: result.chunks 
    });

  } catch (error) {
    console.error('[Whisper Worker] ❌ Transcription failed:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
}

/**
 * Unload model and free resources
 */
async function unloadModel() {
  try {
    // The transcribe function manages model lifecycle automatically
    // Just clear our reference
    currentModelId = null;
    console.log('[Whisper Worker] ✅ Model unloaded');
    self.postMessage({ type: 'unloaded' });
  } catch (error) {
    console.error('[Whisper Worker] ❌ Unload failed:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
}

/**
 * Worker message handler
 */
self.onmessage = async function(event) {
  const { type, modelId, audioData, language, translate } = event.data;

  switch (type) {
    case 'init':
      await initializeWhisper(modelId);
      break;

    case 'transcribe':
      await transcribeAudio(audioData, language, translate);
      break;

    case 'unload':
      await unloadModel();
      break;

    default:
      console.warn('[Whisper Worker] Unknown message type:', type);
  }
};

console.log('[Whisper Worker] Worker initialized and ready');

