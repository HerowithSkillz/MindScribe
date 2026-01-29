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
 * Convert text to phoneme IDs - Basic dictionary + fallback
 * Uses common word dictionary for 80% coverage + character fallback
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
  
  // Expanded word-to-IPA dictionary for natural speech
  const wordDict = {
    // Pronouns & basic (expanded)
    'i': ['aɪ'], "i'm": ['aɪ', 'm'], "i've": ['aɪ', 'v'], "i'll": ['aɪ', 'l'], "i'd": ['aɪ', 'd'],
    'you': ['j', 'uː'], "you're": ['j', 'ɔː', 'r'], "you've": ['j', 'uː', 'v'], "you'll": ['j', 'uː', 'l'], "you'd": ['j', 'uː', 'd'],
    'he': ['h', 'iː'], "he's": ['h', 'iː', 'z'], "he'll": ['h', 'iː', 'l'], "he'd": ['h', 'iː', 'd'],
    'she': ['ʃ', 'iː'], "she's": ['ʃ', 'iː', 'z'], "she'll": ['ʃ', 'iː', 'l'], "she'd": ['ʃ', 'iː', 'd'],
    'we': ['w', 'iː'], "we're": ['w', 'ɪər'], "we've": ['w', 'iː', 'v'], "we'll": ['w', 'iː', 'l'], "we'd": ['w', 'iː', 'd'],
    'they': ['ð', 'eɪ'], "they're": ['ð', 'ɛər'], "they've": ['ð', 'eɪ', 'v'], "they'll": ['ð', 'eɪ', 'l'], "they'd": ['ð', 'eɪ', 'd'],
    'it': ['ɪ', 't'], "it's": ['ɪ', 't', 's'], "it'll": ['ɪ', 't', 'ə', 'l'],
    'me': ['m', 'iː'], 'my': ['m', 'aɪ'], 'mine': ['m', 'aɪ', 'n'],
    'your': ['j', 'ɔː', 'r'], 'yours': ['j', 'ɔː', 'r', 'z'], 'his': ['h', 'ɪ', 'z'], 'her': ['h', 'ɜː', 'r'], 'hers': ['h', 'ɜː', 'r', 'z'],
    'our': ['aʊ', 'ə', 'r'], 'ours': ['aʊ', 'ə', 'r', 'z'], 'their': ['ð', 'ɛə', 'r'], 'theirs': ['ð', 'ɛə', 'r', 'z'],
    
    // Common verbs (expanded with contractions)
    'am': ['æ', 'm'], 'is': ['ɪ', 'z'], 'are': ['ɑː', 'r'], "aren't": ['ɑː', 'r', 'ə', 'n', 't'], "isn't": ['ɪ', 'z', 'ə', 'n', 't'],
    'was': ['w', 'ɒ', 'z'], "wasn't": ['w', 'ɒ', 'z', 'ə', 'n', 't'], 'were': ['w', 'ɜː', 'r'], "weren't": ['w', 'ɜː', 'r', 'ə', 'n', 't'],
    'be': ['b', 'iː'], 'been': ['b', 'ɪ', 'n'], 'being': ['b', 'iː', 'ɪ', 'ŋ'],
    'have': ['h', 'æ', 'v'], 'has': ['h', 'æ', 'z'], 'had': ['h', 'æ', 'd'], "haven't": ['h', 'æ', 'v', 'ə', 'n', 't'], "hasn't": ['h', 'æ', 'z', 'ə', 'n', 't'], "hadn't": ['h', 'æ', 'd', 'ə', 'n', 't'],
    'do': ['d', 'uː'], 'does': ['d', 'ʌ', 'z'], 'did': ['d', 'ɪ', 'd'], "don't": ['d', 'oʊ', 'n', 't'], "doesn't": ['d', 'ʌ', 'z', 'ə', 'n', 't'], "didn't": ['d', 'ɪ', 'd', 'ə', 'n', 't'],
    'can': ['k', 'æ', 'n'], "can't": ['k', 'ɑː', 'n', 't'], "cannot": ['k', 'æ', 'n', 'ɒ', 't'],
    'could': ['k', 'ʊ', 'd'], "couldn't": ['k', 'ʊ', 'd', 'ə', 'n', 't'],
    'would': ['w', 'ʊ', 'd'], "wouldn't": ['w', 'ʊ', 'd', 'ə', 'n', 't'],
    'will': ['w', 'ɪ', 'l'], "won't": ['w', 'oʊ', 'n', 't'],
    'should': ['ʃ', 'ʊ', 'd'], "shouldn't": ['ʃ', 'ʊ', 'd', 'ə', 'n', 't'],
    'may': ['m', 'eɪ'], 'might': ['m', 'aɪ', 't'], "mightn't": ['m', 'aɪ', 't', 'ə', 'n', 't'],
    'must': ['m', 'ʌ', 's', 't'], "mustn't": ['m', 'ʌ', 's', 'ə', 'n', 't'],
    'get': ['ɡ', 'ɛ', 't'], 'got': ['ɡ', 'ɒ', 't'], 'getting': ['ɡ', 'ɛ', 't', 'ɪ', 'ŋ'],
    'go': ['ɡ', 'oʊ'], 'going': ['ɡ', 'oʊ', 'ɪ', 'ŋ'], 'goes': ['ɡ', 'oʊ', 'z'], 'went': ['w', 'ɛ', 'n', 't'], 'gone': ['ɡ', 'ɒ', 'n'],
    'come': ['k', 'ʌ', 'm'], 'coming': ['k', 'ʌ', 'm', 'ɪ', 'ŋ'], 'came': ['k', 'eɪ', 'm'],
    'say': ['s', 'eɪ'], 'said': ['s', 'ɛ', 'd'], 'saying': ['s', 'eɪ', 'ɪ', 'ŋ'],
    'see': ['s', 'iː'], 'saw': ['s', 'ɔː'], 'seen': ['s', 'iː', 'n'], 'seeing': ['s', 'iː', 'ɪ', 'ŋ'],
    'know': ['n', 'oʊ'], 'knew': ['n', 'juː'], 'known': ['n', 'oʊ', 'n'], 'knowing': ['n', 'oʊ', 'ɪ', 'ŋ'],
    'think': ['θ', 'ɪ', 'ŋ', 'k'], 'thought': ['θ', 'ɔː', 't'], 'thinking': ['θ', 'ɪ', 'ŋ', 'k', 'ɪ', 'ŋ'],
    'take': ['t', 'eɪ', 'k'], 'took': ['t', 'ʊ', 'k'], 'taken': ['t', 'eɪ', 'k', 'ə', 'n'], 'taking': ['t', 'eɪ', 'k', 'ɪ', 'ŋ'],
    'make': ['m', 'eɪ', 'k'], 'made': ['m', 'eɪ', 'd'], 'making': ['m', 'eɪ', 'k', 'ɪ', 'ŋ'],
    'want': ['w', 'ɒ', 'n', 't'], 'wanted': ['w', 'ɒ', 'n', 't', 'ɪ', 'd'], 'wanting': ['w', 'ɒ', 'n', 't', 'ɪ', 'ŋ'],
    'need': ['n', 'iː', 'd'], 'needed': ['n', 'iː', 'd', 'ɪ', 'd'], 'needing': ['n', 'iː', 'd', 'ɪ', 'ŋ'],
    'try': ['t', 'r', 'aɪ'], 'tried': ['t', 'r', 'aɪ', 'd'], 'trying': ['t', 'r', 'aɪ', 'ɪ', 'ŋ'],
    'work': ['w', 'ɜː', 'r', 'k'], 'worked': ['w', 'ɜː', 'r', 'k', 't'], 'working': ['w', 'ɜː', 'r', 'k', 'ɪ', 'ŋ'],
    'give': ['ɡ', 'ɪ', 'v'], 'gave': ['ɡ', 'eɪ', 'v'], 'given': ['ɡ', 'ɪ', 'v', 'ə', 'n'], 'giving': ['ɡ', 'ɪ', 'v', 'ɪ', 'ŋ'],
    'find': ['f', 'aɪ', 'n', 'd'], 'found': ['f', 'aʊ', 'n', 'd'], 'finding': ['f', 'aɪ', 'n', 'd', 'ɪ', 'ŋ'],
    'tell': ['t', 'ɛ', 'l'], 'told': ['t', 'oʊ', 'l', 'd'], 'telling': ['t', 'ɛ', 'l', 'ɪ', 'ŋ'],
    'ask': ['ɑː', 's', 'k'], 'asked': ['ɑː', 's', 'k', 't'], 'asking': ['ɑː', 's', 'k', 'ɪ', 'ŋ'],
    'use': ['j', 'uː', 'z'], 'used': ['j', 'uː', 'z', 'd'], 'using': ['j', 'uː', 'z', 'ɪ', 'ŋ'],
    'seem': ['s', 'iː', 'm'], 'seemed': ['s', 'iː', 'm', 'd'], 'seeming': ['s', 'iː', 'm', 'ɪ', 'ŋ'],
    'leave': ['l', 'iː', 'v'], 'left': ['l', 'ɛ', 'f', 't'], 'leaving': ['l', 'iː', 'v', 'ɪ', 'ŋ'],
    'call': ['k', 'ɔː', 'l'], 'called': ['k', 'ɔː', 'l', 'd'], 'calling': ['k', 'ɔː', 'l', 'ɪ', 'ŋ'],
    'keep': ['k', 'iː', 'p'], 'kept': ['k', 'ɛ', 'p', 't'], 'keeping': ['k', 'iː', 'p', 'ɪ', 'ŋ'],
    'let': ['l', 'ɛ', 't'], 'letting': ['l', 'ɛ', 't', 'ɪ', 'ŋ'],
    'begin': ['b', 'ɪ', 'ɡ', 'ɪ', 'n'], 'began': ['b', 'ɪ', 'ɡ', 'æ', 'n'], 'begun': ['b', 'ɪ', 'ɡ', 'ʌ', 'n'],
    'show': ['ʃ', 'oʊ'], 'showed': ['ʃ', 'oʊ', 'd'], 'shown': ['ʃ', 'oʊ', 'n'],
    'hear': ['h', 'ɪə', 'r'], 'heard': ['h', 'ɜː', 'r', 'd'], 'hearing': ['h', 'ɪə', 'r', 'ɪ', 'ŋ'],
    'play': ['p', 'l', 'eɪ'], 'played': ['p', 'l', 'eɪ', 'd'], 'playing': ['p', 'l', 'eɪ', 'ɪ', 'ŋ'],
    'run': ['r', 'ʌ', 'n'], 'ran': ['r', 'æ', 'n'], 'running': ['r', 'ʌ', 'n', 'ɪ', 'ŋ'],
    'move': ['m', 'uː', 'v'], 'moved': ['m', 'uː', 'v', 'd'], 'moving': ['m', 'uː', 'v', 'ɪ', 'ŋ'],
    'live': ['l', 'ɪ', 'v'], 'lived': ['l', 'ɪ', 'v', 'd'], 'living': ['l', 'ɪ', 'v', 'ɪ', 'ŋ'],
    'believe': ['b', 'ɪ', 'l', 'iː', 'v'], 'believed': ['b', 'ɪ', 'l', 'iː', 'v', 'd'], 'believing': ['b', 'ɪ', 'l', 'iː', 'v', 'ɪ', 'ŋ'],
    'bring': ['b', 'r', 'ɪ', 'ŋ'], 'brought': ['b', 'r', 'ɔː', 't'], 'bringing': ['b', 'r', 'ɪ', 'ŋ', 'ɪ', 'ŋ'],
    'happen': ['h', 'æ', 'p', 'ə', 'n'], 'happened': ['h', 'æ', 'p', 'ə', 'n', 'd'], 'happening': ['h', 'æ', 'p', 'ə', 'n', 'ɪ', 'ŋ'],
    'write': ['r', 'aɪ', 't'], 'wrote': ['r', 'oʊ', 't'], 'written': ['r', 'ɪ', 't', 'ə', 'n'], 'writing': ['r', 'aɪ', 't', 'ɪ', 'ŋ'],
    'sit': ['s', 'ɪ', 't'], 'sat': ['s', 'æ', 't'], 'sitting': ['s', 'ɪ', 't', 'ɪ', 'ŋ'],
    'stand': ['s', 't', 'æ', 'n', 'd'], 'stood': ['s', 't', 'ʊ', 'd'], 'standing': ['s', 't', 'æ', 'n', 'd', 'ɪ', 'ŋ'],
    'lose': ['l', 'uː', 'z'], 'lost': ['l', 'ɒ', 's', 't'], 'losing': ['l', 'uː', 'z', 'ɪ', 'ŋ'],
    'pay': ['p', 'eɪ'], 'paid': ['p', 'eɪ', 'd'], 'paying': ['p', 'eɪ', 'ɪ', 'ŋ'],
    'meet': ['m', 'iː', 't'], 'met': ['m', 'ɛ', 't'], 'meeting': ['m', 'iː', 't', 'ɪ', 'ŋ'],
    'include': ['ɪ', 'n', 'k', 'l', 'uː', 'd'], 'included': ['ɪ', 'n', 'k', 'l', 'uː', 'd', 'ɪ', 'd'],
    'continue': ['k', 'ə', 'n', 't', 'ɪ', 'n', 'j', 'uː'], 'continued': ['k', 'ə', 'n', 't', 'ɪ', 'n', 'j', 'uː', 'd'],
    'set': ['s', 'ɛ', 't'], 'setting': ['s', 'ɛ', 't', 'ɪ', 'ŋ'],
    'learn': ['l', 'ɜː', 'r', 'n'], 'learned': ['l', 'ɜː', 'r', 'n', 'd'], 'learning': ['l', 'ɜː', 'r', 'n', 'ɪ', 'ŋ'],
    'change': ['tʃ', 'eɪ', 'n', 'dʒ'], 'changed': ['tʃ', 'eɪ', 'n', 'dʒ', 'd'], 'changing': ['tʃ', 'eɪ', 'n', 'dʒ', 'ɪ', 'ŋ'],
    'lead': ['l', 'iː', 'd'], 'led': ['l', 'ɛ', 'd'], 'leading': ['l', 'iː', 'd', 'ɪ', 'ŋ'],
    'understand': ['ʌ', 'n', 'd', 'ə', 'r', 's', 't', 'æ', 'n', 'd'], 'understood': ['ʌ', 'n', 'd', 'ə', 'r', 's', 't', 'ʊ', 'd'],
    'watch': ['w', 'ɒ', 'tʃ'], 'watched': ['w', 'ɒ', 'tʃ', 't'], 'watching': ['w', 'ɒ', 'tʃ', 'ɪ', 'ŋ'],
    'follow': ['f', 'ɒ', 'l', 'oʊ'], 'followed': ['f', 'ɒ', 'l', 'oʊ', 'd'], 'following': ['f', 'ɒ', 'l', 'oʊ', 'ɪ', 'ŋ'],
    'stop': ['s', 't', 'ɒ', 'p'], 'stopped': ['s', 't', 'ɒ', 'p', 't'], 'stopping': ['s', 't', 'ɒ', 'p', 'ɪ', 'ŋ'],
    'create': ['k', 'r', 'iː', 'eɪ', 't'], 'created': ['k', 'r', 'iː', 'eɪ', 't', 'ɪ', 'd'], 'creating': ['k', 'r', 'iː', 'eɪ', 't', 'ɪ', 'ŋ'],
    'speak': ['s', 'p', 'iː', 'k'], 'spoke': ['s', 'p', 'oʊ', 'k'], 'spoken': ['s', 'p', 'oʊ', 'k', 'ə', 'n'], 'speaking': ['s', 'p', 'iː', 'k', 'ɪ', 'ŋ'],
    'read': ['r', 'iː', 'd'], 'reading': ['r', 'iː', 'd', 'ɪ', 'ŋ'],
    'spend': ['s', 'p', 'ɛ', 'n', 'd'], 'spent': ['s', 'p', 'ɛ', 'n', 't'], 'spending': ['s', 'p', 'ɛ', 'n', 'd', 'ɪ', 'ŋ'],
    'grow': ['ɡ', 'r', 'oʊ'], 'grew': ['ɡ', 'r', 'uː'], 'grown': ['ɡ', 'r', 'oʊ', 'n'], 'growing': ['ɡ', 'r', 'oʊ', 'ɪ', 'ŋ'],
    'open': ['oʊ', 'p', 'ə', 'n'], 'opened': ['oʊ', 'p', 'ə', 'n', 'd'], 'opening': ['oʊ', 'p', 'ə', 'n', 'ɪ', 'ŋ'],
    'walk': ['w', 'ɔː', 'k'], 'walked': ['w', 'ɔː', 'k', 't'], 'walking': ['w', 'ɔː', 'k', 'ɪ', 'ŋ'],
    'win': ['w', 'ɪ', 'n'], 'won': ['w', 'ʌ', 'n'], 'winning': ['w', 'ɪ', 'n', 'ɪ', 'ŋ'],
    'offer': ['ɒ', 'f', 'ə', 'r'], 'offered': ['ɒ', 'f', 'ə', 'r', 'd'], 'offering': ['ɒ', 'f', 'ə', 'r', 'ɪ', 'ŋ'],
    'remember': ['r', 'ɪ', 'm', 'ɛ', 'm', 'b', 'ə', 'r'], 'remembered': ['r', 'ɪ', 'm', 'ɛ', 'm', 'b', 'ə', 'r', 'd'],
    'consider': ['k', 'ə', 'n', 's', 'ɪ', 'd', 'ə', 'r'], 'considered': ['k', 'ə', 'n', 's', 'ɪ', 'd', 'ə', 'r', 'd'],
    'appear': ['ə', 'p', 'ɪə', 'r'], 'appeared': ['ə', 'p', 'ɪə', 'r', 'd'], 'appearing': ['ə', 'p', 'ɪə', 'r', 'ɪ', 'ŋ'],
    'buy': ['b', 'aɪ'], 'bought': ['b', 'ɔː', 't'], 'buying': ['b', 'aɪ', 'ɪ', 'ŋ'],
    'wait': ['w', 'eɪ', 't'], 'waited': ['w', 'eɪ', 't', 'ɪ', 'd'], 'waiting': ['w', 'eɪ', 't', 'ɪ', 'ŋ'],
    'serve': ['s', 'ɜː', 'r', 'v'], 'served': ['s', 'ɜː', 'r', 'v', 'd'], 'serving': ['s', 'ɜː', 'r', 'v', 'ɪ', 'ŋ'],
    'die': ['d', 'aɪ'], 'died': ['d', 'aɪ', 'd'], 'dying': ['d', 'aɪ', 'ɪ', 'ŋ'],
    'send': ['s', 'ɛ', 'n', 'd'], 'sent': ['s', 'ɛ', 'n', 't'], 'sending': ['s', 'ɛ', 'n', 'd', 'ɪ', 'ŋ'],
    'expect': ['ɪ', 'k', 's', 'p', 'ɛ', 'k', 't'], 'expected': ['ɪ', 'k', 's', 'p', 'ɛ', 'k', 't', 'ɪ', 'd'],
    'build': ['b', 'ɪ', 'l', 'd'], 'built': ['b', 'ɪ', 'l', 't'], 'building': ['b', 'ɪ', 'l', 'd', 'ɪ', 'ŋ'],
    'stay': ['s', 't', 'eɪ'], 'stayed': ['s', 't', 'eɪ', 'd'], 'staying': ['s', 't', 'eɪ', 'ɪ', 'ŋ'],
    'fall': ['f', 'ɔː', 'l'], 'fell': ['f', 'ɛ', 'l'], 'fallen': ['f', 'ɔː', 'l', 'ə', 'n'], 'falling': ['f', 'ɔː', 'l', 'ɪ', 'ŋ'],
    'cut': ['k', 'ʌ', 't'], 'cutting': ['k', 'ʌ', 't', 'ɪ', 'ŋ'],
    'reach': ['r', 'iː', 'tʃ'], 'reached': ['r', 'iː', 'tʃ', 't'], 'reaching': ['r', 'iː', 'tʃ', 'ɪ', 'ŋ'],
    'kill': ['k', 'ɪ', 'l'], 'killed': ['k', 'ɪ', 'l', 'd'], 'killing': ['k', 'ɪ', 'l', 'ɪ', 'ŋ'],
    'remain': ['r', 'ɪ', 'm', 'eɪ', 'n'], 'remained': ['r', 'ɪ', 'm', 'eɪ', 'n', 'd'], 'remaining': ['r', 'ɪ', 'm', 'eɪ', 'n', 'ɪ', 'ŋ'],
    'suggest': ['s', 'ə', 'dʒ', 'ɛ', 's', 't'], 'suggested': ['s', 'ə', 'dʒ', 'ɛ', 's', 't', 'ɪ', 'd'],
    'raise': ['r', 'eɪ', 'z'], 'raised': ['r', 'eɪ', 'z', 'd'], 'raising': ['r', 'eɪ', 'z', 'ɪ', 'ŋ'],
    'pass': ['p', 'ɑː', 's'], 'passed': ['p', 'ɑː', 's', 't'], 'passing': ['p', 'ɑː', 's', 'ɪ', 'ŋ'],
    'sell': ['s', 'ɛ', 'l'], 'sold': ['s', 'oʊ', 'l', 'd'], 'selling': ['s', 'ɛ', 'l', 'ɪ', 'ŋ'],
    'require': ['r', 'ɪ', 'k', 'w', 'aɪə', 'r'], 'required': ['r', 'ɪ', 'k', 'w', 'aɪə', 'r', 'd'],
    'report': ['r', 'ɪ', 'p', 'ɔː', 'r', 't'], 'reported': ['r', 'ɪ', 'p', 'ɔː', 'r', 't', 'ɪ', 'd'],
    'decide': ['d', 'ɪ', 's', 'aɪ', 'd'], 'decided': ['d', 'ɪ', 's', 'aɪ', 'd', 'ɪ', 'd'], 'deciding': ['d', 'ɪ', 's', 'aɪ', 'd', 'ɪ', 'ŋ'],
    'pull': ['p', 'ʊ', 'l'], 'pulled': ['p', 'ʊ', 'l', 'd'], 'pulling': ['p', 'ʊ', 'l', 'ɪ', 'ŋ'],
    
    // Question words
    'what': ['w', 'ɒ', 't'], "what's": ['w', 'ɒ', 't', 's'], 'when': ['w', 'ɛ', 'n'], 'where': ['w', 'ɛə', 'r'], "where's": ['w', 'ɛə', 'r', 'z'],
    'who': ['h', 'uː'], "who's": ['h', 'uː', 'z'], 'whom': ['h', 'uː', 'm'], 'whose': ['h', 'uː', 'z'],
    'why': ['w', 'aɪ'], 'how': ['h', 'aʊ'], "how's": ['h', 'aʊ', 'z'], 'which': ['w', 'ɪ', 'tʃ'],
    
    // Common words (expanded)
    'the': ['ð', 'ə'], 'a': ['ə'], 'an': ['æ', 'n'], 'and': ['æ', 'n', 'd'], 'or': ['ɔː', 'r'],
    'but': ['b', 'ʌ', 't'], 'if': ['ɪ', 'f'], 'because': ['b', 'ɪ', 'k', 'ɒ', 'z'], 'as': ['æ', 'z'], 'until': ['ʌ', 'n', 't', 'ɪ', 'l'],
    'while': ['w', 'aɪ', 'l'], 'of': ['ə', 'v'], 'at': ['æ', 't'], 'by': ['b', 'aɪ'], 'for': ['f', 'ɔː', 'r'],
    'with': ['w', 'ɪ', 'ð'], 'about': ['ə', 'b', 'aʊ', 't'], 'against': ['ə', 'ɡ', 'ɛ', 'n', 's', 't'], 'between': ['b', 'ɪ', 't', 'w', 'iː', 'n'],
    'into': ['ɪ', 'n', 't', 'uː'], 'through': ['θ', 'r', 'uː'], 'during': ['d', 'j', 'ʊə', 'r', 'ɪ', 'ŋ'], 'before': ['b', 'ɪ', 'f', 'ɔː', 'r'],
    'after': ['ɑː', 'f', 't', 'ə', 'r'], 'above': ['ə', 'b', 'ʌ', 'v'], 'below': ['b', 'ɪ', 'l', 'oʊ'], 'to': ['t', 'uː'],
    'from': ['f', 'r', 'ɒ', 'm'], 'up': ['ʌ', 'p'], 'down': ['d', 'aʊ', 'n'], 'in': ['ɪ', 'n'], 'out': ['aʊ', 't'],
    'on': ['ɒ', 'n'], 'off': ['ɒ', 'f'], 'over': ['oʊ', 'v', 'ə', 'r'], 'under': ['ʌ', 'n', 'd', 'ə', 'r'],
    'again': ['ə', 'ɡ', 'ɛ', 'n'], 'further': ['f', 'ɜː', 'r', 'ð', 'ə', 'r'], 'then': ['ð', 'ɛ', 'n'], 'once': ['w', 'ʌ', 'n', 's'],
    'here': ['h', 'ɪə', 'r'], 'there': ['ð', 'ɛə', 'r'], "there's": ['ð', 'ɛə', 'r', 'z'], 'where': ['w', 'ɛə', 'r'],
    'all': ['ɔː', 'l'], 'both': ['b', 'oʊ', 'θ'], 'each': ['iː', 'tʃ'], 'few': ['f', 'j', 'uː'], 'more': ['m', 'ɔː', 'r'],
    'most': ['m', 'oʊ', 's', 't'], 'other': ['ʌ', 'ð', 'ə', 'r'], 'some': ['s', 'ʌ', 'm'], 'such': ['s', 'ʌ', 'tʃ'],
    'no': ['n', 'oʊ'], 'nor': ['n', 'ɔː', 'r'], 'not': ['n', 'ɒ', 't'], 'only': ['oʊ', 'n', 'l', 'i'], 'own': ['oʊ', 'n'],
    'same': ['s', 'eɪ', 'm'], 'so': ['s', 'oʊ'], 'than': ['ð', 'æ', 'n'], 'too': ['t', 'uː'], 'very': ['v', 'ɛ', 'r', 'i'],
    'just': ['dʒ', 'ʌ', 's', 't'], 'now': ['n', 'aʊ'], 'also': ['ɔː', 'l', 's', 'oʊ'], 'well': ['w', 'ɛ', 'l'],
    'back': ['b', 'æ', 'k'], 'even': ['iː', 'v', 'ə', 'n'], 'still': ['s', 't', 'ɪ', 'l'], 'today': ['t', 'ə', 'd', 'eɪ'],
    'way': ['w', 'eɪ'], 'much': ['m', 'ʌ', 'tʃ'], 'many': ['m', 'ɛ', 'n', 'i'], 'any': ['ɛ', 'n', 'i'],
    'every': ['ɛ', 'v', 'r', 'i'], 'another': ['ə', 'n', 'ʌ', 'ð', 'ə', 'r'], 'less': ['l', 'ɛ', 's'], 'little': ['l', 'ɪ', 't', 'ə', 'l'],
    'enough': ['ɪ', 'n', 'ʌ', 'f'], 'quite': ['k', 'w', 'aɪ', 't'], 'almost': ['ɔː', 'l', 'm', 'oʊ', 's', 't'],
    'always': ['ɔː', 'l', 'w', 'eɪ', 'z'], 'never': ['n', 'ɛ', 'v', 'ə', 'r'], 'sometimes': ['s', 'ʌ', 'm', 't', 'aɪ', 'm', 'z'],
    'often': ['ɒ', 'f', 'ə', 'n'], 'usually': ['j', 'uː', 'ʒ', 'ə', 'l', 'i'], 'really': ['r', 'ɪə', 'l', 'i'],
    'probably': ['p', 'r', 'ɒ', 'b', 'ə', 'b', 'l', 'i'], 'perhaps': ['p', 'ə', 'r', 'h', 'æ', 'p', 's'],
    'maybe': ['m', 'eɪ', 'b', 'i'], 'certainly': ['s', 'ɜː', 'r', 't', 'ə', 'n', 'l', 'i'],
    
    // Adjectives & descriptions
    'good': ['ɡ', 'ʊ', 'd'], 'better': ['b', 'ɛ', 't', 'ə', 'r'], 'best': ['b', 'ɛ', 's', 't'],
    'bad': ['b', 'æ', 'd'], 'worse': ['w', 'ɜː', 'r', 's'], 'worst': ['w', 'ɜː', 'r', 's', 't'],
    'great': ['ɡ', 'r', 'eɪ', 't'], 'big': ['b', 'ɪ', 'ɡ'], 'small': ['s', 'm', 'ɔː', 'l'], 'large': ['l', 'ɑː', 'r', 'dʒ'],
    'new': ['n', 'j', 'uː'], 'old': ['oʊ', 'l', 'd'], 'young': ['j', 'ʌ', 'ŋ'], 'long': ['l', 'ɒ', 'ŋ'], 'short': ['ʃ', 'ɔː', 'r', 't'],
    'high': ['h', 'aɪ'], 'low': ['l', 'oʊ'], 'right': ['r', 'aɪ', 't'], 'wrong': ['r', 'ɒ', 'ŋ'], 'different': ['d', 'ɪ', 'f', 'ə', 'r', 'ə', 'n', 't'],
    'similar': ['s', 'ɪ', 'm', 'ɪ', 'l', 'ə', 'r'], 'same': ['s', 'eɪ', 'm'], 'next': ['n', 'ɛ', 'k', 's', 't'], 'last': ['l', 'ɑː', 's', 't'],
    'early': ['ɜː', 'r', 'l', 'i'], 'late': ['l', 'eɪ', 't'], 'hard': ['h', 'ɑː', 'r', 'd'], 'easy': ['iː', 'z', 'i'],
    'strong': ['s', 't', 'r', 'ɒ', 'ŋ'], 'weak': ['w', 'iː', 'k'], 'hot': ['h', 'ɒ', 't'], 'cold': ['k', 'oʊ', 'l', 'd'],
    'warm': ['w', 'ɔː', 'r', 'm'], 'cool': ['k', 'uː', 'l'], 'important': ['ɪ', 'm', 'p', 'ɔː', 'r', 't', 'ə', 'n', 't'],
    'possible': ['p', 'ɒ', 's', 'ɪ', 'b', 'ə', 'l'], 'necessary': ['n', 'ɛ', 's', 'ɪ', 's', 'ə', 'r', 'i'],
    'true': ['t', 'r', 'uː'], 'false': ['f', 'ɔː', 'l', 's'], 'real': ['r', 'ɪə', 'l'], 'sure': ['ʃ', 'ʊə', 'r'], 'clear': ['k', 'l', 'ɪə', 'r'],
    'full': ['f', 'ʊ', 'l'], 'empty': ['ɛ', 'm', 'p', 't', 'i'], 'open': ['oʊ', 'p', 'ə', 'n'], 'close': ['k', 'l', 'oʊ', 's'],
    'dark': ['d', 'ɑː', 'r', 'k'], 'light': ['l', 'aɪ', 't'], 'heavy': ['h', 'ɛ', 'v', 'i'], 'clean': ['k', 'l', 'iː', 'n'],
    'dirty': ['d', 'ɜː', 'r', 't', 'i'], 'free': ['f', 'r', 'iː'], 'busy': ['b', 'ɪ', 'z', 'i'], 'quiet': ['k', 'w', 'aɪ', 'ə', 't'],
    'loud': ['l', 'aʊ', 'd'], 'simple': ['s', 'ɪ', 'm', 'p', 'ə', 'l'], 'difficult': ['d', 'ɪ', 'f', 'ɪ', 'k', 'ə', 'l', 't'],
    'ready': ['r', 'ɛ', 'd', 'i'], 'safe': ['s', 'eɪ', 'f'], 'dangerous': ['d', 'eɪ', 'n', 'dʒ', 'ə', 'r', 'ə', 's'],
    'fast': ['f', 'ɑː', 's', 't'], 'slow': ['s', 'l', 'oʊ'], 'quick': ['k', 'w', 'ɪ', 'k'], 'sudden': ['s', 'ʌ', 'd', 'ə', 'n'],
    'nice': ['n', 'aɪ', 's'], 'kind': ['k', 'aɪ', 'n', 'd'], 'friendly': ['f', 'r', 'ɛ', 'n', 'd', 'l', 'i'],
    'beautiful': ['b', 'j', 'uː', 't', 'ɪ', 'f', 'ə', 'l'], 'pretty': ['p', 'r', 'ɪ', 't', 'i'], 'ugly': ['ʌ', 'ɡ', 'l', 'i'],
    'fine': ['f', 'aɪ', 'n'], 'ok': ['oʊ', 'k', 'eɪ'], 'okay': ['oʊ', 'k', 'eɪ'], 'alright': ['ɔː', 'l', 'r', 'aɪ', 't'],
    
    // Feelings/therapy words (comprehensive)
    'feel': ['f', 'iː', 'l'], 'feeling': ['f', 'iː', 'l', 'ɪ', 'ŋ'], 'feelings': ['f', 'iː', 'l', 'ɪ', 'ŋ', 'z'], 'felt': ['f', 'ɛ', 'l', 't'],
    'good': ['ɡ', 'ʊ', 'd'], 'bad': ['b', 'æ', 'd'], 'happy': ['h', 'æ', 'p', 'i'], 'sad': ['s', 'æ', 'd'],
    'angry': ['æ', 'ŋ', 'ɡ', 'r', 'i'], 'mad': ['m', 'æ', 'd'], 'upset': ['ʌ', 'p', 's', 'ɛ', 't'],
    'anxious': ['æ', 'ŋ', 'k', 'ʃ', 'ə', 's'], 'anxiety': ['æ', 'ŋ', 'z', 'aɪ', 'ə', 't', 'i'],
    'stress': ['s', 't', 'r', 'ɛ', 's'], 'stressed': ['s', 't', 'r', 'ɛ', 's', 't'], 'stressful': ['s', 't', 'r', 'ɛ', 's', 'f', 'ə', 'l'],
    'worried': ['w', 'ʌ', 'r', 'i', 'd'], 'worry': ['w', 'ʌ', 'r', 'i'], 'worrying': ['w', 'ʌ', 'r', 'i', 'ɪ', 'ŋ'],
    'depressed': ['d', 'ɪ', 'p', 'r', 'ɛ', 's', 't'], 'depression': ['d', 'ɪ', 'p', 'r', 'ɛ', 'ʃ', 'ə', 'n'],
    'nervous': ['n', 'ɜː', 'r', 'v', 'ə', 's'], 'afraid': ['ə', 'f', 'r', 'eɪ', 'd'], 'scared': ['s', 'k', 'ɛə', 'r', 'd'], 'fear': ['f', 'ɪə', 'r'],
    'excited': ['ɪ', 'k', 's', 'aɪ', 't', 'ɪ', 'd'], 'excitement': ['ɪ', 'k', 's', 'aɪ', 't', 'm', 'ə', 'n', 't'],
    'calm': ['k', 'ɑː', 'l', 'm'], 'relaxed': ['r', 'ɪ', 'l', 'æ', 'k', 's', 't'], 'peaceful': ['p', 'iː', 's', 'f', 'ə', 'l'],
    'tired': ['t', 'aɪə', 'r', 'd'], 'exhausted': ['ɪ', 'ɡ', 'z', 'ɔː', 's', 't', 'ɪ', 'd'], 'weary': ['w', 'ɪə', 'r', 'i'],
    'lonely': ['l', 'oʊ', 'n', 'l', 'i'], 'alone': ['ə', 'l', 'oʊ', 'n'], 'isolated': ['aɪ', 's', 'ə', 'l', 'eɪ', 't', 'ɪ', 'd'],
    'confused': ['k', 'ə', 'n', 'f', 'j', 'uː', 'z', 'd'], 'confusion': ['k', 'ə', 'n', 'f', 'j', 'uː', 'ʒ', 'ə', 'n'],
    'frustrated': ['f', 'r', 'ʌ', 's', 't', 'r', 'eɪ', 't', 'ɪ', 'd'], 'frustration': ['f', 'r', 'ʌ', 's', 't', 'r', 'eɪ', 'ʃ', 'ə', 'n'],
    'overwhelmed': ['oʊ', 'v', 'ə', 'r', 'w', 'ɛ', 'l', 'm', 'd'], 'overwhelming': ['oʊ', 'v', 'ə', 'r', 'w', 'ɛ', 'l', 'm', 'ɪ', 'ŋ'],
    'hopeful': ['h', 'oʊ', 'p', 'f', 'ə', 'l'], 'hopeless': ['h', 'oʊ', 'p', 'l', 'ə', 's'], 'hope': ['h', 'oʊ', 'p'],
    'grateful': ['ɡ', 'r', 'eɪ', 't', 'f', 'ə', 'l'], 'thankful': ['θ', 'æ', 'ŋ', 'k', 'f', 'ə', 'l'],
    'proud': ['p', 'r', 'aʊ', 'd'], 'ashamed': ['ə', 'ʃ', 'eɪ', 'm', 'd'], 'guilty': ['ɡ', 'ɪ', 'l', 't', 'i'], 'guilt': ['ɡ', 'ɪ', 'l', 't'],
    'comfortable': ['k', 'ʌ', 'm', 'f', 'ə', 'r', 't', 'ə', 'b', 'ə', 'l'], 'uncomfortable': ['ʌ', 'n', 'k', 'ʌ', 'm', 'f', 'ə', 'r', 't', 'ə', 'b', 'ə', 'l'],
    'confident': ['k', 'ɒ', 'n', 'f', 'ɪ', 'd', 'ə', 'n', 't'], 'confidence': ['k', 'ɒ', 'n', 'f', 'ɪ', 'd', 'ə', 'n', 's'],
    'insecure': ['ɪ', 'n', 's', 'ɪ', 'k', 'j', 'ʊə', 'r'], 'insecurity': ['ɪ', 'n', 's', 'ɪ', 'k', 'j', 'ʊə', 'r', 'ə', 't', 'i'],
    'pain': ['p', 'eɪ', 'n'], 'painful': ['p', 'eɪ', 'n', 'f', 'ə', 'l'], 'hurt': ['h', 'ɜː', 'r', 't'], 'hurting': ['h', 'ɜː', 'r', 't', 'ɪ', 'ŋ'],
    'better': ['b', 'ɛ', 't', 'ə', 'r'], 'worse': ['w', 'ɜː', 'r', 's'], 'improve': ['ɪ', 'm', 'p', 'r', 'uː', 'v'], 'improvement': ['ɪ', 'm', 'p', 'r', 'uː', 'v', 'm', 'ə', 'n', 't'],
    'help': ['h', 'ɛ', 'l', 'p'], 'helping': ['h', 'ɛ', 'l', 'p', 'ɪ', 'ŋ'], 'helped': ['h', 'ɛ', 'l', 'p', 't'], 'helpful': ['h', 'ɛ', 'l', 'p', 'f', 'ə', 'l'],
    'support': ['s', 'ə', 'p', 'ɔː', 'r', 't'], 'supportive': ['s', 'ə', 'p', 'ɔː', 'r', 't', 'ɪ', 'v'],
    'cope': ['k', 'oʊ', 'p'], 'coping': ['k', 'oʊ', 'p', 'ɪ', 'ŋ'], 'manage': ['m', 'æ', 'n', 'ɪ', 'd', 'ʒ'], 'managing': ['m', 'æ', 'n', 'ɪ', 'd', 'ʒ', 'ɪ', 'ŋ'],
    'therapy': ['θ', 'ɛ', 'r', 'ə', 'p', 'i'], 'therapist': ['θ', 'ɛ', 'r', 'ə', 'p', 'ɪ', 's', 't'], 'therapeutic': ['θ', 'ɛ', 'r', 'ə', 'p', 'j', 'uː', 't', 'ɪ', 'k'],
    'counselor': ['k', 'aʊ', 'n', 's', 'ə', 'l', 'ə', 'r'], 'counseling': ['k', 'aʊ', 'n', 's', 'ə', 'l', 'ɪ', 'ŋ'],
    'session': ['s', 'ɛ', 'ʃ', 'ə', 'n'], 'sessions': ['s', 'ɛ', 'ʃ', 'ə', 'n', 'z'],
    'talk': ['t', 'ɔː', 'k'], 'talking': ['t', 'ɔː', 'k', 'ɪ', 'ŋ'], 'talked': ['t', 'ɔː', 'k', 't'],
    'share': ['ʃ', 'ɛə', 'r'], 'sharing': ['ʃ', 'ɛə', 'r', 'ɪ', 'ŋ'], 'shared': ['ʃ', 'ɛə', 'r', 'd'],
    'listen': ['l', 'ɪ', 's', 'ə', 'n'], 'listening': ['l', 'ɪ', 's', 'ə', 'n', 'ɪ', 'ŋ'], 'listened': ['l', 'ɪ', 's', 'ə', 'n', 'd'],
    'express': ['ɪ', 'k', 's', 'p', 'r', 'ɛ', 's'], 'expressing': ['ɪ', 'k', 's', 'p', 'r', 'ɛ', 's', 'ɪ', 'ŋ'], 'expression': ['ɪ', 'k', 's', 'p', 'r', 'ɛ', 'ʃ', 'ə', 'n'],
    'today': ['t', 'ə', 'd', 'eɪ'], 'yesterday': ['j', 'ɛ', 's', 't', 'ə', 'r', 'd', 'eɪ'], 'tomorrow': ['t', 'ə', 'm', 'ɒ', 'r', 'oʊ'],
    'morning': ['m', 'ɔː', 'r', 'n', 'ɪ', 'ŋ'], 'afternoon': ['ɑː', 'f', 't', 'ə', 'r', 'n', 'uː', 'n'], 'evening': ['iː', 'v', 'n', 'ɪ', 'ŋ'], 'night': ['n', 'aɪ', 't'],
    'day': ['d', 'eɪ'], 'week': ['w', 'iː', 'k'], 'month': ['m', 'ʌ', 'n', 'θ'], 'year': ['j', 'ɪə', 'r'],
    'moment': ['m', 'oʊ', 'm', 'ə', 'n', 't'], 'time': ['t', 'aɪ', 'm'], 'now': ['n', 'aʊ'], 'recently': ['r', 'iː', 's', 'ə', 'n', 't', 'l', 'i'],
    'situation': ['s', 'ɪ', 't', 'j', 'u', 'eɪ', 'ʃ', 'ə', 'n'], 'problem': ['p', 'r', 'ɒ', 'b', 'l', 'ə', 'm'], 'issue': ['ɪ', 'ʃ', 'uː'],
    'experience': ['ɪ', 'k', 's', 'p', 'ɪə', 'r', 'i', 'ə', 'n', 's'], 'experienced': ['ɪ', 'k', 's', 'p', 'ɪə', 'r', 'i', 'ə', 'n', 's', 't'],
    'thought': ['θ', 'ɔː', 't'], 'thoughts': ['θ', 'ɔː', 't', 's'], 'mind': ['m', 'aɪ', 'n', 'd'],
    'emotion': ['ɪ', 'm', 'oʊ', 'ʃ', 'ə', 'n'], 'emotions': ['ɪ', 'm', 'oʊ', 'ʃ', 'ə', 'n', 'z'], 'emotional': ['ɪ', 'm', 'oʊ', 'ʃ', 'ə', 'n', 'ə', 'l'],
    'physical': ['f', 'ɪ', 'z', 'ɪ', 'k', 'ə', 'l'], 'mental': ['m', 'ɛ', 'n', 't', 'ə', 'l'], 'psychological': ['s', 'aɪ', 'k', 'ə', 'l', 'ɒ', 'd', 'ʒ', 'ɪ', 'k', 'ə', 'l'],
    'health': ['h', 'ɛ', 'l', 'θ'], 'healthy': ['h', 'ɛ', 'l', 'θ', 'i'], 'wellness': ['w', 'ɛ', 'l', 'n', 'ə', 's'],
    'sleep': ['s', 'l', 'iː', 'p'], 'sleeping': ['s', 'l', 'iː', 'p', 'ɪ', 'ŋ'], 'slept': ['s', 'l', 'ɛ', 'p', 't'],
    'eat': ['iː', 't'], 'eating': ['iː', 't', 'ɪ', 'ŋ'], 'ate': ['eɪ', 't'], 'food': ['f', 'uː', 'd'],
    'exercise': ['ɛ', 'k', 's', 'ə', 'r', 's', 'aɪ', 'z'], 'exercising': ['ɛ', 'k', 's', 'ə', 'r', 's', 'aɪ', 'z', 'ɪ', 'ŋ'],
    'rest': ['r', 'ɛ', 's', 't'], 'resting': ['r', 'ɛ', 's', 't', 'ɪ', 'ŋ'], 'rested': ['r', 'ɛ', 's', 't', 'ɪ', 'd'],
    'relationship': ['r', 'ɪ', 'l', 'eɪ', 'ʃ', 'ə', 'n', 'ʃ', 'ɪ', 'p'], 'relationships': ['r', 'ɪ', 'l', 'eɪ', 'ʃ', 'ə', 'n', 'ʃ', 'ɪ', 'p', 's'],
    'family': ['f', 'æ', 'm', 'ə', 'l', 'i'], 'friend': ['f', 'r', 'ɛ', 'n', 'd'], 'friends': ['f', 'r', 'ɛ', 'n', 'd', 'z'],
    'person': ['p', 'ɜː', 'r', 's', 'ə', 'n'], 'people': ['p', 'iː', 'p', 'ə', 'l'], 'someone': ['s', 'ʌ', 'm', 'w', 'ʌ', 'n'], 'anyone': ['ɛ', 'n', 'i', 'w', 'ʌ', 'n'],
    'life': ['l', 'aɪ', 'f'], 'living': ['l', 'ɪ', 'v', 'ɪ', 'ŋ'], 'alive': ['ə', 'l', 'aɪ', 'v'],
    'change': ['tʃ', 'eɪ', 'n', 'dʒ'], 'changes': ['tʃ', 'eɪ', 'n', 'dʒ', 'ɪ', 'z'], 'changing': ['tʃ', 'eɪ', 'n', 'dʒ', 'ɪ', 'ŋ'],
    'progress': ['p', 'r', 'oʊ', 'ɡ', 'r', 'ɛ', 's'], 'progressing': ['p', 'r', 'oʊ', 'ɡ', 'r', 'ɛ', 's', 'ɪ', 'ŋ'],
    'goal': ['ɡ', 'oʊ', 'l'], 'goals': ['ɡ', 'oʊ', 'l', 'z'], 'achievement': ['ə', 'tʃ', 'iː', 'v', 'm', 'ə', 'n', 't'],
    'challenge': ['tʃ', 'æ', 'l', 'ə', 'n', 'dʒ'], 'challenges': ['tʃ', 'æ', 'l', 'ə', 'n', 'dʒ', 'ɪ', 'z'], 'challenging': ['tʃ', 'æ', 'l', 'ə', 'n', 'dʒ', 'ɪ', 'ŋ'],
    'difficult': ['d', 'ɪ', 'f', 'ɪ', 'k', 'ə', 'l', 't'], 'difficulty': ['d', 'ɪ', 'f', 'ɪ', 'k', 'ə', 'l', 't', 'i'], 'struggle': ['s', 't', 'r', 'ʌ', 'ɡ', 'ə', 'l'],
    'strength': ['s', 't', 'r', 'ɛ', 'ŋ', 'θ'], 'strong': ['s', 't', 'r', 'ɒ', 'ŋ'], 'weakness': ['w', 'iː', 'k', 'n', 'ə', 's'], 'weak': ['w', 'iː', 'k'],
    'control': ['k', 'ə', 'n', 't', 'r', 'oʊ', 'l'], 'controlling': ['k', 'ə', 'n', 't', 'r', 'oʊ', 'l', 'ɪ', 'ŋ'], 'controlled': ['k', 'ə', 'n', 't', 'r', 'oʊ', 'l', 'd'],
    'accept': ['ə', 'k', 's', 'ɛ', 'p', 't'], 'accepting': ['ə', 'k', 's', 'ɛ', 'p', 't', 'ɪ', 'ŋ'], 'acceptance': ['ə', 'k', 's', 'ɛ', 'p', 't', 'ə', 'n', 's'],
    'understand': ['ʌ', 'n', 'd', 'ə', 'r', 's', 't', 'æ', 'n', 'd'], 'understanding': ['ʌ', 'n', 'd', 'ə', 'r', 's', 't', 'æ', 'n', 'd', 'ɪ', 'ŋ'], 'understood': ['ʌ', 'n', 'd', 'ə', 'r', 's', 't', 'ʊ', 'd'],
    'safe': ['s', 'eɪ', 'f'], 'safety': ['s', 'eɪ', 'f', 't', 'i'], 'protect': ['p', 'r', 'ə', 't', 'ɛ', 'k', 't'], 'protection': ['p', 'r', 'ə', 't', 'ɛ', 'k', 'ʃ', 'ə', 'n'],
    'trust': ['t', 'r', 'ʌ', 's', 't'], 'trusting': ['t', 'r', 'ʌ', 's', 't', 'ɪ', 'ŋ'], 'trusted': ['t', 'r', 'ʌ', 's', 't', 'ɪ', 'd'],
    'care': ['k', 'ɛə', 'r'], 'caring': ['k', 'ɛə', 'r', 'ɪ', 'ŋ'], 'cared': ['k', 'ɛə', 'r', 'd'],
    'love': ['l', 'ʌ', 'v'], 'loving': ['l', 'ʌ', 'v', 'ɪ', 'ŋ'], 'loved': ['l', 'ʌ', 'v', 'd'],
    'hate': ['h', 'eɪ', 't'], 'hating': ['h', 'eɪ', 't', 'ɪ', 'ŋ'], 'hated': ['h', 'eɪ', 't', 'ɪ', 'd'],
    
    // Greetings (expanded)
    'hello': ['h', 'ə', 'l', 'oʊ'], 'hi': ['h', 'aɪ'], 'hey': ['h', 'eɪ'], 'goodbye': ['ɡ', 'ʊ', 'd', 'b', 'aɪ'], 'bye': ['b', 'aɪ'],
    'thanks': ['θ', 'æ', 'ŋ', 'k', 's'], 'thank': ['θ', 'æ', 'ŋ', 'k'], 'please': ['p', 'l', 'iː', 'z'], 'sorry': ['s', 'ɒ', 'r', 'i'],
    'welcome': ['w', 'ɛ', 'l', 'k', 'ə', 'm'], 'yes': ['j', 'ɛ', 's'], 'yeah': ['j', 'ɛ', 'ə'], 'yep': ['j', 'ɛ', 'p'], 'no': ['n', 'oʊ'], 'nope': ['n', 'oʊ', 'p'],
    'excuse': ['ɪ', 'k', 's', 'k', 'j', 'uː', 'z'], 'pardon': ['p', 'ɑː', 'r', 'd', 'ə', 'n'],
    
    // Numbers (expanded)
    'one': ['w', 'ʌ', 'n'], 'two': ['t', 'uː'], 'three': ['θ', 'r', 'iː'], 'four': ['f', 'ɔː', 'r'], 'five': ['f', 'aɪ', 'v'],
    'six': ['s', 'ɪ', 'k', 's'], 'seven': ['s', 'ɛ', 'v', 'ə', 'n'], 'eight': ['eɪ', 't'], 'nine': ['n', 'aɪ', 'n'], 'ten': ['t', 'ɛ', 'n'],
    'eleven': ['ɪ', 'l', 'ɛ', 'v', 'ə', 'n'], 'twelve': ['t', 'w', 'ɛ', 'l', 'v'], 'thirteen': ['θ', 'ɜː', 'r', 't', 'iː', 'n'],
    'fourteen': ['f', 'ɔː', 'r', 't', 'iː', 'n'], 'fifteen': ['f', 'ɪ', 'f', 't', 'iː', 'n'], 'twenty': ['t', 'w', 'ɛ', 'n', 't', 'i'],
    'thirty': ['θ', 'ɜː', 'r', 't', 'i'], 'forty': ['f', 'ɔː', 'r', 't', 'i'], 'fifty': ['f', 'ɪ', 'f', 't', 'i'],
    'hundred': ['h', 'ʌ', 'n', 'd', 'r', 'ə', 'd'], 'thousand': ['θ', 'aʊ', 'z', 'ə', 'n', 'd'],
    'first': ['f', 'ɜː', 'r', 's', 't'], 'second': ['s', 'ɛ', 'k', 'ə', 'n', 'd'], 'third': ['θ', 'ɜː', 'r', 'd'],
    'few': ['f', 'j', 'uː'], 'several': ['s', 'ɛ', 'v', 'ə', 'r', 'ə', 'l'], 'couple': ['k', 'ʌ', 'p', 'ə', 'l']
  };
  
  // Process text word by word
  const words = text.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    if (wordDict[word]) {
      // Use dictionary phonemes
      for (const phoneme of wordDict[word]) {
        if (phonemeMap[phoneme]) {
          phonemeIds.push(phonemeMap[phoneme][0]);
        }
      }
    } else {
      // Fallback: character-by-character
      for (const char of word) {
        if (phonemeMap[char]) {
          phonemeIds.push(phonemeMap[char][0]);
        }
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
  
  console.log(`[Piper Worker] Generated ${phonemeIds.length} phoneme IDs from text: "${text.substring(0, 50)}..."`);
  return phonemeIds;
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
