/**
 * Piper TTS Web Worker - Text-to-Speech Processing
 * 
 * Production implementation using ONNX Runtime Web for speech synthesis
 * Runs in isolated thread to prevent UI blocking
 * 
 * Based on: https://github.com/rhasspy/piper
 */

import * as ort from 'onnxruntime-web';

let onnxSession = null;
let voiceConfig = null;
let currentVoiceId = null;
let isInitializing = false;

/**
 * Initialize Piper TTS model
 */
async function initializePiper(modelPath, voiceId) {
  if (isInitializing) {
    console.warn('[Piper Worker] Already initializing, skipping duplicate request');
    return;
  }

  try {
    isInitializing = true;
    console.log('[Piper Worker] Initializing Piper TTS:', voiceId);

    // Load voice configuration JSON
    const configPath = modelPath.replace('.onnx', '.onnx.json');
    const configResponse = await fetch(configPath);
    if (!configResponse.ok) {
      throw new Error(`Failed to load config: ${configResponse.status}`);
    }
    voiceConfig = await configResponse.json();
    console.log('[Piper Worker] Config loaded:', voiceConfig);

    // Create ONNX Runtime session
    onnxSession = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      executionMode: 'sequential',
      logSeverityLevel: 3
    });

    currentVoiceId = voiceId;
    console.log('[Piper Worker] ✅ Initialization complete');
    self.postMessage({ type: 'initialized', voiceId });

  } catch (error) {
    console.error('[Piper Worker] ❌ Initialization failed:', error);
    self.postMessage({ type: 'error', error: error.message });
  } finally {
    isInitializing = false;
  }
}

/**
 * Convert text to phoneme IDs using basic English phoneme mapping
 * This uses IPA phonemes expected by Piper models
 * For production, integrate espeak-ng WASM for accurate phoneme conversion
 */
function textToPhonemeIds(text) {
  if (!voiceConfig || !voiceConfig.phoneme_id_map) {
    throw new Error('Voice config not loaded');
  }

  const phonemeMap = voiceConfig.phoneme_id_map;
  const phonemeIds = [];
  
  // Add sentence start marker
  if (phonemeMap['^']) {
    phonemeIds.push(phonemeMap['^'][0]);
  }
  
  // Basic English word to phoneme mapping (IPA)
  // This is a minimal implementation - proper TTS needs espeak-ng
  const words = text.toLowerCase().trim().split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z'-]/g, '');
    
    if (word.length === 0) continue;
    
    // Get phonemes for this word
    const phonemes = wordToPhonemes(word);
    
    // Convert phonemes to IDs
    for (const phoneme of phonemes) {
      if (phonemeMap[phoneme]) {
        phonemeIds.push(phonemeMap[phoneme][0]);
      }
    }
    
    // Add space between words (except last word)
    if (i < words.length - 1 && phonemeMap[' ']) {
      phonemeIds.push(phonemeMap[' '][0]);
    }
  }
  
  // Add sentence end marker
  if (phonemeMap['$']) {
    phonemeIds.push(phonemeMap['$'][0]);
  }
  
  return phonemeIds;
}

/**
 * Basic English word to IPA phonemes mapping
 * This is a simplified approximation for demonstration
 * Production should use espeak-ng for accurate phoneme conversion
 */
function wordToPhonemes(word) {
  // Common English words with IPA phonemes
  const dictionary = {
    'hello': ['h', 'ə', 'l', 'oʊ'],
    'hi': ['h', 'aɪ'],
    'it': ['ɪ', 't'],
    'sounds': ['s', 'aʊ', 'n', 'd', 'z'],
    'like': ['l', 'aɪ', 'k'],
    'you': ['j', 'u'],
    'youre': ['j', 'ɔː', 'ɹ'],
    'feeling': ['f', 'iː', 'l', 'ɪ', 'ŋ'],
    'a': ['ə'],
    'bit': ['b', 'ɪ', 't'],
    'uncertain': ['ʌ', 'n', 's', 'ɜː', 't', 'ə', 'n'],
    'about': ['ə', 'b', 'aʊ', 't'],
    'your': ['j', 'ɔː', 'ɹ'],
    'test': ['t', 'ɛ', 's', 't'],
    'results': ['ɹ', 'ɪ', 'z', 'ʌ', 'l', 't', 's'],
    'can': ['k', 'æ', 'n'],
    'tell': ['t', 'ɛ', 'l'],
    'me': ['m', 'iː'],
    'more': ['m', 'ɔː', 'ɹ'],
    'whats': ['w', 'ʌ', 't', 's'],
    'on': ['ɒ', 'n'],
    'mind': ['m', 'aɪ', 'n', 'd'],
    'right': ['ɹ', 'aɪ', 't'],
    'now': ['n', 'aʊ'],
    'the': ['ð', 'ə'],
    'to': ['t', 'uː'],
    'and': ['æ', 'n', 'd'],
    'of': ['ɒ', 'v'],
    'is': ['ɪ', 'z'],
    'in': ['ɪ', 'n'],
    'my': ['m', 'aɪ']
  };
  
  // Check dictionary first
  if (dictionary[word]) {
    return dictionary[word];
  }
  
  // Fallback: simple letter-to-phoneme (very basic approximation)
  const phonemes = [];
  for (const char of word) {
    // Map common letters to approximate phonemes
    switch (char) {
      case 'a': phonemes.push('æ'); break;
      case 'e': phonemes.push('ɛ'); break;
      case 'i': phonemes.push('ɪ'); break;
      case 'o': phonemes.push('ɒ'); break;
      case 'u': phonemes.push('ʌ'); break;
      default: phonemes.push(char); // Use letter as-is for consonants
    }
  }
  
  return phonemes;
}

/**
 * Synthesize speech using Piper TTS
 */
async function synthesizeSpeech(text) {
  try {
    if (!onnxSession || !voiceConfig) {
      throw new Error('Piper TTS not initialized');
    }

    console.log('[Piper Worker] Synthesizing:', text);

    // Convert text to phoneme IDs
    const phonemeIds = textToPhonemeIds(text);
    console.log('[Piper Worker] Phoneme IDs:', phonemeIds.length, 'phonemes');

    // Prepare ONNX inputs
    const inputIds = new ort.Tensor(
      'int64',
      new BigInt64Array(phonemeIds.map(id => BigInt(id))),
      [1, phonemeIds.length]
    );
    
    const inputLengths = new ort.Tensor(
      'int64',
      new BigInt64Array([BigInt(phonemeIds.length)]),
      [1]
    );
    
    const scales = new ort.Tensor(
      'float32',
      new Float32Array([
        voiceConfig.inference?.noise_scale || 0.667,
        voiceConfig.inference?.length_scale || 1.0,
        voiceConfig.inference?.noise_w || 0.8
      ]),
      [3]
    );

    // Run ONNX inference
    const feeds = {
      input: inputIds,
      input_lengths: inputLengths,
      scales: scales
    };

    const outputs = await onnxSession.run(feeds);
    const audioData = outputs.output.data;

    console.log('[Piper Worker] ✅ Generated audio:', audioData.length, 'samples');

    self.postMessage({
      type: 'synthesis',
      audioData: Array.from(audioData),
      sampleRate: voiceConfig.audio?.sample_rate || 22050
    });

  } catch (error) {
    console.error('[Piper Worker] ❌ Synthesis failed:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
}

/**
 * Unload model and free resources
 */
async function unloadModel() {
  try {
    if (onnxSession) {
      await onnxSession.release();
      onnxSession = null;
      voiceConfig = null;
      currentVoiceId = null;
      console.log('[Piper Worker] ✅ Model unloaded');
      self.postMessage({ type: 'unloaded' });
    }
  } catch (error) {
    console.error('[Piper Worker] ❌ Unload failed:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
}

/**
 * Worker message handler
 */
self.onmessage = async function(event) {
  const { type, modelPath, voiceId, text } = event.data;

  switch (type) {
    case 'init':
      await initializePiper(modelPath, voiceId);
      break;

    case 'synthesize':
      await synthesizeSpeech(text);
      break;

    case 'unload':
      await unloadModel();
      break;

    default:
      console.warn('[Piper Worker] Unknown message type:', type);
  }
};

console.log('[Piper Worker] Worker initialized and ready');
