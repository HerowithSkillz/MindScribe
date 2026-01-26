# Voice Therapy Integration Guide
**Production-Ready Voice I/O Implementation**

This guide walks you through replacing placeholder workers with actual Whisper.cpp and Piper implementations.

---

## ⚠️ Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- 10GB free disk space (for models)
- Git installed
- Basic understanding of WebAssembly

---

## Part 1: Whisper.cpp Integration

### Step 1: Download Whisper.cpp WASM Binary

**Option A: Pre-built WASM (Recommended)**
```bash
# Navigate to project root
cd e:\Work\Web development\personal_git_maintained_proj\MindScribe_V0.1

# Create public/wasm directory
mkdir -p public/wasm

# Download pre-built whisper.wasm from whisper.cpp releases
# Visit: https://github.com/ggerg-org/whisper.cpp/releases
# Download: whisper.wasm (or build from source)

# For now, we'll use whisper-web demo files
# Clone whisper-web (lightweight browser demo)
git clone https://github.com/ggerganov/whisper.cpp.git temp/whisper
cd temp/whisper/examples/whisper.wasm

# Copy WASM files to public
cp whisper.js ../../../public/wasm/
cp whisper.wasm ../../../public/wasm/

cd ../../../..
rm -rf temp
```

**Option B: Build from Source**
```bash
# Requires Emscripten SDK
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

# Build whisper.wasm
cd ../examples/whisper.wasm
bash build.sh

# Copy to MindScribe
cp bin/whisper.js e:/Work/Web\ development/personal_git_maintained_proj/MindScribe_V0.1/public/wasm/
cp bin/whisper.wasm e:/Work/Web\ development/personal_git_maintained_proj/MindScribe_V0.1/public/wasm/
```

### Step 2: Download Whisper Model

```bash
# Download base.en model (142MB, 16x realtime)
cd public/models/whisper

# Option A: Direct download
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" -o base.en.bin

# Option B: Using huggingface-cli
pip install huggingface-hub
huggingface-cli download ggerganov/whisper.cpp ggml-base.en.bin --local-dir .

# Verify download (should be ~142MB)
ls -lh base.en.bin
```

### Step 3: Update whisper.worker.js

Replace the placeholder with this implementation:

```javascript
// src/workers/whisper.worker.js
let whisper = null;
let modelLoaded = false;
let ctx = null;

/**
 * Load Whisper WASM module
 */
async function loadWhisperWasm() {
  // Import Whisper WASM from public/wasm
  importScripts('/wasm/whisper.js');
  
  // Wait for Module to be ready
  whisper = await createWhisperModule({
    // Locate WASM binary
    locateFile: (path) => {
      if (path.endsWith('.wasm')) {
        return '/wasm/whisper.wasm';
      }
      return path;
    },
    // Callbacks
    print: (text) => console.log('[Whisper]', text),
    printErr: (text) => console.error('[Whisper Error]', text),
  });
  
  return whisper;
}

/**
 * Initialize Whisper model
 */
async function initializeModel(modelName) {
  try {
    console.log('[Whisper Worker] Loading model:', modelName);
    
    // Load WASM if not already loaded
    if (!whisper) {
      await loadWhisperWasm();
    }
    
    // Download model file
    const modelUrl = `/models/whisper/${modelName}.bin`;
    const response = await fetch(modelUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download model: ${response.status}`);
    }
    
    const modelBuffer = await response.arrayBuffer();
    console.log('[Whisper Worker] Model downloaded:', modelBuffer.byteLength, 'bytes');
    
    // Allocate memory in WASM heap
    const modelPtr = whisper._malloc(modelBuffer.byteLength);
    whisper.HEAPU8.set(new Uint8Array(modelBuffer), modelPtr);
    
    // Initialize Whisper context
    ctx = whisper._whisper_init_from_buffer(modelPtr, modelBuffer.byteLength);
    
    // Free temporary buffer
    whisper._free(modelPtr);
    
    if (ctx === 0) {
      throw new Error('Failed to initialize Whisper context');
    }
    
    modelLoaded = true;
    console.log('[Whisper Worker] Model initialized successfully');
    
    return { success: true };
    
  } catch (error) {
    console.error('[Whisper Worker] Initialization failed:', error);
    throw error;
  }
}

/**
 * Transcribe audio
 */
async function transcribe(audioData) {
  if (!modelLoaded || !ctx) {
    throw new Error('Model not loaded');
  }
  
  try {
    console.log('[Whisper Worker] Transcribing audio:', audioData.length, 'samples');
    
    // Allocate memory for audio samples
    const samplesPtr = whisper._malloc(audioData.length * 4); // 4 bytes per float
    whisper.HEAPF32.set(audioData, samplesPtr / 4);
    
    // Set up whisper parameters
    const params = whisper._whisper_full_default_params(0); // WHISPER_SAMPLING_GREEDY
    
    // Run transcription
    const result = whisper._whisper_full(
      ctx,
      params,
      samplesPtr,
      audioData.length
    );
    
    if (result !== 0) {
      whisper._free(samplesPtr);
      throw new Error('Transcription failed');
    }
    
    // Get transcription results
    const numSegments = whisper._whisper_full_n_segments(ctx);
    let fullText = '';
    
    for (let i = 0; i < numSegments; i++) {
      const textPtr = whisper._whisper_full_get_segment_text(ctx, i);
      const text = whisper.UTF8ToString(textPtr);
      fullText += text + ' ';
    }
    
    // Free audio buffer
    whisper._free(samplesPtr);
    
    console.log('[Whisper Worker] Transcription:', fullText.trim());
    
    return {
      text: fullText.trim(),
      segments: numSegments
    };
    
  } catch (error) {
    console.error('[Whisper Worker] Transcription failed:', error);
    throw error;
  }
}

/**
 * Message handler
 */
self.onmessage = async (event) => {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'init':
        const result = await initializeModel(data.modelName);
        self.postMessage({ type: 'init', success: true, data: result });
        break;
        
      case 'transcribe':
        const transcription = await transcribe(data.audioData);
        self.postMessage({ type: 'transcribe', success: true, data: transcription });
        break;
        
      case 'unload':
        if (ctx) {
          whisper._whisper_free(ctx);
          ctx = null;
        }
        modelLoaded = false;
        self.postMessage({ type: 'unload', success: true });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: type,
      success: false,
      error: error.message
    });
  }
};

console.log('[Whisper Worker] Worker initialized and ready');
```

---

## Part 2: Piper TTS Integration

### Step 1: Install espeak-ng WASM

```bash
cd public/wasm

# Download espeak-ng WASM from piper-phonemize releases
# Visit: https://github.com/rhasspy/piper-phonemize/releases

# Download espeak-ng-data.tar.gz and extract
curl -L "https://github.com/rhasspy/espeak-ng/releases/download/2023.12.11/espeak-ng-data.tar.gz" -o espeak-ng-data.tar.gz
tar -xzf espeak-ng-data.tar.gz

# Download piper-phonemize WASM
curl -L "https://github.com/rhasspy/piper-phonemize/releases/download/v1.1.0/piper_phonemize.wasm" -o piper_phonemize.wasm
curl -L "https://github.com/rhasspy/piper-phonemize/releases/download/v1.1.0/piper_phonemize.js" -o piper_phonemize.js
```

### Step 2: Update piper.worker.js

Replace with this implementation:

```javascript
// src/workers/piper.worker.js
import * as ort from 'onnxruntime-web';

let onnxSession = null;
let voiceConfig = null;
let piperPhonemize = null;

/**
 * Load piper-phonemize WASM
 */
async function loadPhonemize() {
  // Load piper_phonemize WASM module
  importScripts('/wasm/piper_phonemize.js');
  
  piperPhonemize = await createPiperPhonemize({
    locateFile: (path) => {
      if (path.endsWith('.wasm')) {
        return '/wasm/piper_phonemize.wasm';
      }
      if (path.endsWith('.data')) {
        return '/wasm/espeak-ng-data';
      }
      return path;
    }
  });
  
  return piperPhonemize;
}

/**
 * Initialize Piper TTS
 */
async function initializePiper(modelData, configData, voiceId) {
  try {
    console.log('[Piper Worker] Initializing:', voiceId);
    
    // Store config
    voiceConfig = configData;
    
    // Load phonemize WASM
    if (!piperPhonemize) {
      await loadPhonemize();
    }
    
    // Create ONNX Runtime session
    onnxSession = await ort.InferenceSession.create(modelData, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      executionMode: 'sequential',
      logSeverityLevel: 3
    });
    
    console.log('[Piper Worker] Initialization complete');
    return { success: true };
    
  } catch (error) {
    console.error('[Piper Worker] Initialization failed:', error);
    throw error;
  }
}

/**
 * Convert text to phonemes using espeak-ng
 */
function textToPhonemes(text) {
  if (!piperPhonemize) {
    throw new Error('Phonemize not initialized');
  }
  
  // Call espeak-ng to get phonemes
  const phonemes = piperPhonemize.textToPhonemes(
    text,
    voiceConfig.espeak_voice || 'en-us'
  );
  
  return phonemes;
}

/**
 * Convert phonemes to phoneme IDs
 */
function phonemesToIds(phonemes) {
  const phonemeIdMap = voiceConfig.phoneme_id_map;
  const ids = [];
  
  for (const phoneme of phonemes) {
    if (phoneme in phonemeIdMap) {
      ids.push(phonemeIdMap[phoneme]);
    } else {
      // Use <unk> token for unknown phonemes
      ids.push(phonemeIdMap['<unk>'] || 0);
    }
  }
  
  return ids;
}

/**
 * Synthesize speech
 */
async function synthesize(text) {
  if (!onnxSession || !voiceConfig) {
    throw new Error('Model not initialized');
  }
  
  try {
    console.log('[Piper Worker] Synthesizing:', text);
    
    // Step 1: Text → Phonemes
    const phonemes = textToPhonemes(text);
    console.log('[Piper Worker] Phonemes:', phonemes);
    
    // Step 2: Phonemes → IDs
    const phonemeIds = phonemesToIds(phonemes);
    console.log('[Piper Worker] Phoneme IDs:', phonemeIds);
    
    // Step 3: Prepare ONNX inputs
    const inputIds = new ort.Tensor('int64', new BigInt64Array(phonemeIds.map(id => BigInt(id))), [1, phonemeIds.length]);
    const inputLengths = new ort.Tensor('int64', new BigInt64Array([BigInt(phonemeIds.length)]), [1]);
    const scales = new ort.Tensor('float32', new Float32Array([
      voiceConfig.noise_scale || 0.667,
      voiceConfig.length_scale || 1.0,
      voiceConfig.noise_w || 0.8
    ]), [3]);
    
    // Step 4: Run ONNX inference
    const feeds = {
      input: inputIds,
      input_lengths: inputLengths,
      scales: scales
    };
    
    const outputs = await onnxSession.run(feeds);
    
    // Step 5: Extract audio
    const audioData = outputs.output.data; // Float32Array
    
    console.log('[Piper Worker] Generated audio:', audioData.length, 'samples');
    
    return {
      audioData: Array.from(audioData), // Convert to regular array for postMessage
      sampleRate: voiceConfig.sample_rate || 22050
    };
    
  } catch (error) {
    console.error('[Piper Worker] Synthesis failed:', error);
    throw error;
  }
}

/**
 * Message handler
 */
self.onmessage = async (event) => {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'init':
        const result = await initializePiper(
          data.modelData,
          data.configData,
          data.voiceId
        );
        self.postMessage({ type: 'init', success: true, data: result });
        break;
        
      case 'synthesize':
        const audio = await synthesize(data.text);
        self.postMessage({ type: 'synthesize', success: true, data: audio });
        break;
        
      case 'unload':
        if (onnxSession) {
          await onnxSession.release();
          onnxSession = null;
        }
        voiceConfig = null;
        piperPhonemize = null;
        self.postMessage({ type: 'unload', success: true });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: type,
      success: false,
      error: error.message
    });
  }
};

console.log('[Piper Worker] Worker initialized and ready');
```

---

## Part 3: Testing the Integration

### Test Whisper Transcription

```javascript
// Create test script: test-whisper.js
import whisperService from './src/services/whisper.js';

async function testWhisper() {
  // Load model
  await whisperService.loadModel('base.en');
  
  // Generate test audio (1 second of 440Hz tone)
  const sampleRate = 16000;
  const duration = 1.0;
  const frequency = 440;
  const testAudio = new Float32Array(sampleRate * duration);
  
  for (let i = 0; i < testAudio.length; i++) {
    testAudio[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }
  
  // Transcribe
  const result = await whisperService.transcribe(testAudio);
  console.log('Transcription:', result);
}

testWhisper();
```

### Test Piper Synthesis

```javascript
// Create test script: test-piper.js
import piperService from './src/services/piper.js';

async function testPiper() {
  // Load voice
  await piperService.loadModel('en_US-lessac-medium');
  
  // Synthesize
  const audio = await piperService.synthesize('Hello, how are you today?');
  console.log('Generated audio:', audio.length, 'samples');
  
  // Play audio (in browser)
  const audioContext = new AudioContext();
  const buffer = audioContext.createBuffer(1, audio.length, 22050);
  buffer.getChannelData(0).set(audio);
  
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
}

testPiper();
```

---

## Part 4: Troubleshooting

### Common Issues

**1. "Cannot find module 'whisper.wasm'"**
- Ensure whisper.wasm is in `public/wasm/`
- Check importScripts path in worker
- Verify Vite serves files from `public/`

**2. "Failed to initialize Whisper context"**
- Model file corrupted - re-download
- Insufficient WASM memory - increase heap size
- Model format mismatch - use GGML format

**3. "Phonemize not initialized"**
- espeak-ng WASM not loaded
- espeak-ng-data missing
- Wrong espeak voice code

**4. "ONNX Runtime error"**
- Model not compatible with ONNX Runtime Web
- Use ONNX opset 13 or lower
- Check model inputs/outputs match config

**5. Audio plays too fast/slow**
- Sample rate mismatch
- Check: Whisper = 16kHz, Piper = 22.05kHz
- Resample if needed

---

## Part 5: Performance Optimization

### Reduce Latency

```javascript
// Enable WebAssembly SIMD (if supported)
// In whisper.worker.js
const whisper = await createWhisperModule({
  wasmBinarySIMD: '/wasm/whisper-simd.wasm', // If available
  // ...
});

// Enable multi-threading (if supported)
const whisper = await createWhisperModule({
  numThreads: navigator.hardwareConcurrency || 4,
  // ...
});
```

### Stream Audio Processing

```javascript
// Process audio in chunks instead of waiting for full recording
async function processAudioChunk(chunk) {
  // Accumulate chunks
  audioBuffer.push(...chunk);
  
  // Process when we have enough (e.g., 3 seconds)
  if (audioBuffer.length >= 16000 * 3) {
    const result = await whisperService.transcribe(audioBuffer);
    audioBuffer = []; // Clear buffer
    return result;
  }
}
```

---

## Next Steps

1. **Download binaries** (whisper.wasm, piper-phonemize, espeak-ng-data)
2. **Place in public/wasm/**
3. **Update worker files** with code above
4. **Test each component** individually
5. **Test end-to-end** voice conversation
6. **Optimize performance** based on testing

**Estimated Time:** 4-6 hours for full integration + testing

---

## Resources

- **Whisper.cpp:** https://github.com/ggerganov/whisper.cpp
- **Whisper Web Demo:** https://github.com/ggerganov/whisper.cpp/tree/master/examples/whisper.wasm
- **Piper TTS:** https://github.com/rhasspy/piper
- **Piper Phonemize:** https://github.com/rhasspy/piper-phonemize
- **ONNX Runtime Web:** https://onnxruntime.ai/docs/get-started/with-javascript.html
- **espeak-ng:** https://github.com/rhasspy/espeak-ng

---

**Questions?** Open an issue with [VOICE-INTEGRATION] tag.
