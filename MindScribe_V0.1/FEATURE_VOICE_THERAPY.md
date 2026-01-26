# MindScribe V0.1 - Voice Therapy Feature Specification

**Feature Status:** 🟡 Planning Phase  
**Priority:** Medium (Privacy-Focused Enhancement)  
**Target Release:** V0.2  
**Documentation Date:** January 26, 2026

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Technical Architecture](#technical-architecture)
3. [Technology Stack](#technology-stack)
4. [Model Management Strategy](#model-management-strategy)
5. [Implementation Roadmap](#implementation-roadmap)
6. [File Structure](#file-structure)
7. [Performance Benchmarks](#performance-benchmarks)
8. [Privacy & Security](#privacy--security)
9. [Testing Strategy](#testing-strategy)
10. [References & Documentation](#references--documentation)

---

## Overview

### Feature Description

Voice Therapy is a **fully offline, privacy-first** voice-to-voice AI therapy session feature that enables users to have natural spoken conversations with the AI without any internet connection. This feature will be accessible through a new **"Voice Therapy"** tab positioned between the existing **Chat** and **Journal** tabs in the navigation.

### Key Differentiators

- ✅ **100% Offline:** Runs entirely on-device using WebAssembly models
- ✅ **Zero Internet Dependency:** No API calls, no data leaves the browser
- ✅ **Privacy-First:** Voice data never transmitted, processed locally only
- ✅ **Real-time Processing:** Low-latency voice-to-voice communication
- ✅ **Consumer Hardware Compatible:** Optimized for laptops/desktops with 8GB+ RAM
- ✅ **Intelligent Model Management:** Unloads WebLLM, loads voice models on-demand

### User Experience Flow

```
1. User clicks "Voice Therapy" tab
   ↓
2. System unloads WebLLM model (frees ~1-2GB VRAM)
   ↓
3. System loads Whisper STT (~75MB) + Piper TTS (~20-50MB)
   ↓
4. User clicks "Start Session" button
   ↓
5. User speaks → Whisper transcribes → WebLLM generates response → Piper synthesizes voice
   ↓
6. AI responds with voice in real-time
   ↓
7. Conversation continues until user clicks "End Session"
   ↓
8. User switches tab → Voice models unloaded, WebLLM reloaded for Chat/Journal
```

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MindScribe Browser                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Chat Tab    │  │ Voice Tab    │  │ Journal Tab  │    │
│  │  (WebLLM)    │  │ (Whisper +   │  │  (WebLLM)    │    │
│  │              │  │  Piper)      │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            │                               │
│         ┌──────────────────▼──────────────────┐           │
│         │   Model Manager (Orchestrator)      │           │
│         │  - Unload/Load models on tab switch │           │
│         │  - Memory management                │           │
│         │  - Worker lifecycle management      │           │
│         └─────────┬───────────────────────────┘           │
│                   │                                        │
│         ┌─────────▼───────────────────┐                   │
│         │   3 Separate Web Workers   │                   │
│         │                             │                   │
│         │  ┌─────────────────────┐   │                   │
│         │  │ WebLLM Worker       │   │                   │
│         │  │ (Text Generation)   │   │                   │
│         │  └─────────────────────┘   │                   │
│         │                             │                   │
│         │  ┌─────────────────────┐   │                   │
│         │  │ Whisper.cpp Worker  │   │                   │
│         │  │ (Speech-to-Text)    │   │                   │
│         │  └─────────────────────┘   │                   │
│         │                             │                   │
│         │  ┌─────────────────────┐   │                   │
│         │  │ Piper TTS Worker    │   │                   │
│         │  │ (Text-to-Speech)    │   │                   │
│         │  └─────────────────────┘   │                   │
│         └─────────────────────────────┘                   │
│                                                             │
│         ┌─────────────────────────────┐                   │
│         │  Browser Cache API          │                   │
│         │  - Whisper models (~75MB)   │                   │
│         │  - Piper models (~20-50MB)  │                   │
│         │  - WebLLM models (~1-2GB)   │                   │
│         └─────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Voice Processing Pipeline

```
User Voice Input
       ↓
[Microphone API] (Web Audio API)
       ↓
[Audio Buffer] (16kHz, 16-bit PCM)
       ↓
[Whisper.cpp Worker] (WASM)
       ↓
Transcribed Text
       ↓
[WebLLM Worker] (Text Generation)
       ↓
AI Response Text
       ↓
[Piper TTS Worker] (WASM + ONNX Runtime)
       ↓
Audio Output (WAV/PCM)
       ↓
[Web Audio API] (AudioContext)
       ↓
Speaker Output
```

---

## Technology Stack

### 1. Speech-to-Text: Whisper.cpp (WASM)

**Repository:** https://github.com/ggml-org/whisper.cpp

**Why Whisper.cpp?**
- ✅ Official C/C++ port of OpenAI's Whisper (high accuracy)
- ✅ WebAssembly support for browser execution
- ✅ Multiple quantized model sizes (tiny, base, small)
- ✅ CPU-only inference (no GPU required)
- ✅ Zero dependencies, single WASM file
- ✅ Active maintenance (v1.8.3 as of Jan 2026)

**Model Selection:**
- **Development/Testing:** `tiny.en` (~75MB, ~32x realtime on CPU)
- **Production:** `base.en` (~142MB, ~16x realtime on CPU)
- **High Quality:** `small.en` (~466MB, ~6x realtime on CPU)

**Model Format:** GGML (custom binary format)

**Memory Usage:**
| Model | Disk Size | RAM Usage | Speed (CPU) |
|-------|-----------|-----------|-------------|
| tiny.en | 75 MB | ~273 MB | 32x realtime |
| base.en | 142 MB | ~388 MB | 16x realtime |
| small.en | 466 MB | ~852 MB | 6x realtime |

**Key APIs:**
```c
// C API (wrapped in JavaScript)
struct whisper_context * whisper_init_from_buffer(void * buffer, size_t buffer_size);
int whisper_full(struct whisper_context * ctx, struct whisper_full_params params, const float * samples, int n_samples);
int whisper_full_n_segments(struct whisper_context * ctx);
const char * whisper_full_get_segment_text(struct whisper_context * ctx, int i_segment);
```

**Browser Integration:**
```javascript
// Load Whisper WASM module
const whisper = await createWhisperModule({
  wasmBinary: whisperWasmBinary,
  print: console.log,
  printErr: console.error
});

// Initialize model from buffer
const modelPtr = whisper._whisper_init_from_buffer(modelBufferPtr, modelSize);

// Transcribe audio
const samplesPtr = whisper._malloc(samples.length * 4);
whisper.HEAPF32.set(samples, samplesPtr / 4);
whisper._whisper_full(modelPtr, paramsPtr, samplesPtr, samples.length);

// Get results
const numSegments = whisper._whisper_full_n_segments(modelPtr);
for (let i = 0; i < numSegments; i++) {
  const textPtr = whisper._whisper_full_get_segment_text(modelPtr, i);
  const text = whisper.UTF8ToString(textPtr);
  console.log(text);
}
```

### 2. Text-to-Speech: Piper TTS (WASM + ONNX Runtime)

**Repository:** https://github.com/rhasspy/piper  
**New Repository (Updated):** https://github.com/OHF-Voice/piper1-gpl

**Why Piper?**
- ✅ Fast neural TTS (1-2x realtime on CPU)
- ✅ ONNX Runtime support (optimized inference)
- ✅ Multiple voice models available
- ✅ Low memory footprint (~20-50MB per voice)
- ✅ High quality natural-sounding speech
- ✅ Browser-compatible with ONNX Runtime Web

**Voice Model Selection:**
- **Female (US English):** `en_US-lessac-medium` (~30MB, natural, empathetic tone)
- **Male (US English):** `en_US-ryan-medium` (~28MB, clear, professional tone)
- **Alternative (UK English):** `en_GB-southern_english_female-medium` (~32MB)

**Model Format:** ONNX (.onnx files) + JSON config

**Memory Usage:**
| Voice | Model Size | RAM Usage | Quality | Speed |
|-------|-----------|-----------|---------|-------|
| lessac-low | 20 MB | ~150 MB | Good | 2x realtime |
| lessac-medium | 30 MB | ~200 MB | High | 1.5x realtime |
| ryan-medium | 28 MB | ~190 MB | High | 1.5x realtime |

**ONNX Runtime Web Integration:**
```javascript
import * as ort from 'onnxruntime-web';

// Load Piper ONNX model
const session = await ort.InferenceSession.create('lessac-medium.onnx', {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all'
});

// Generate speech
async function synthesize(text, voiceConfig) {
  // Phonemize text using espeak-ng (WASM port)
  const phonemes = await phonemize(text);
  
  // Prepare input tensors
  const inputIds = new ort.Tensor('int64', phonemes, [1, phonemes.length]);
  const inputLengths = new ort.Tensor('int64', [phonemes.length], [1]);
  const scales = new ort.Tensor('float32', [
    voiceConfig.noise_scale, 
    voiceConfig.length_scale, 
    voiceConfig.noise_w
  ], [3]);
  
  // Run inference
  const outputs = await session.run({
    input: inputIds,
    input_lengths: inputLengths,
    scales: scales
  });
  
  // Get audio output
  const audio = outputs.output.data; // Float32Array of audio samples
  return audio;
}
```

**Required Dependencies:**
1. **ONNX Runtime Web:** `npm install onnxruntime-web` (~2MB gzipped)
2. **espeak-ng WASM:** For phonemization (~500KB) - https://github.com/rhasspy/espeak-ng-wasm

### 3. Text Generation: WebLLM (Existing)

**Already implemented in project** - reuse existing WebLLM service with voice-specific system prompts.

**Voice Therapy System Prompt:**
```javascript
const VOICE_THERAPY_SYSTEM_PROMPT = `You are a compassionate AI therapist speaking directly to a user through voice. 
Keep responses concise (2-3 sentences max), conversational, and empathetic. 
Use natural speaking patterns with occasional filler words (um, well, I see). 
Ask open-ended follow-up questions. Avoid medical diagnoses. 
Focus on active listening and emotional validation.`;
```

---

## Model Management Strategy

### Memory Constraints

**Typical Consumer Hardware:**
- **RAM:** 8GB - 16GB
- **GPU VRAM:** 0GB (CPU-only) to 4GB (Integrated)
- **Browser Memory Limit:** ~2-4GB per tab (varies by browser)

**Model Memory Footprint:**

| Scenario | WebLLM | Whisper | Piper | Total | Status |
|----------|--------|---------|-------|-------|--------|
| Chat/Journal Tab | 1.5GB | - | - | 1.5GB | ✅ Current |
| Voice Therapy Tab | - | 388MB | 200MB | 588MB | ✅ Feasible |
| Both Loaded (❌) | 1.5GB | 388MB | 200MB | 2.1GB | ⚠️ Too much |

### Dynamic Model Switching

**Key Principle:** Only load models needed for the active tab.

**Implementation Strategy:**

```javascript
class ModelOrchestrator {
  constructor() {
    this.activeModels = {
      webllm: null,
      whisper: null,
      piper: null
    };
    this.activeTab = 'chat'; // 'chat', 'voice', 'journal', 'debug', 'report'
  }

  async switchToVoiceTab() {
    console.log('[ModelOrchestrator] Switching to Voice Therapy tab...');
    
    // 1. Unload WebLLM model (frees ~1.5GB)
    if (this.activeModels.webllm) {
      await webLLMService.unloadModel();
      this.activeModels.webllm = null;
      console.log('[ModelOrchestrator] WebLLM unloaded');
    }
    
    // 2. Load Whisper STT (~388MB)
    if (!this.activeModels.whisper) {
      this.activeModels.whisper = await whisperService.loadModel('base.en');
      console.log('[ModelOrchestrator] Whisper loaded');
    }
    
    // 3. Load Piper TTS (~200MB)
    if (!this.activeModels.piper) {
      this.activeModels.piper = await piperService.loadModel('lessac-medium');
      console.log('[ModelOrchestrator] Piper TTS loaded');
    }
    
    // 4. Keep WebLLM engine for text generation (lightweight - only keeps context)
    // Text generation uses existing WebLLM service, just reload with voice prompt
    await webLLMService.initialize({
      systemPrompt: VOICE_THERAPY_SYSTEM_PROMPT,
      maxTokens: 150, // Shorter responses for voice
      temperature: 0.8 // More conversational
    });
    
    this.activeTab = 'voice';
    console.log('[ModelOrchestrator] Voice tab ready');
  }

  async switchFromVoiceTab() {
    console.log('[ModelOrchestrator] Leaving Voice Therapy tab...');
    
    // 1. Unload Whisper STT
    if (this.activeModels.whisper) {
      await whisperService.unloadModel();
      this.activeModels.whisper = null;
    }
    
    // 2. Unload Piper TTS
    if (this.activeModels.piper) {
      await piperService.unloadModel();
      this.activeModels.piper = null;
    }
    
    // 3. Reload WebLLM with default settings for Chat/Journal
    await webLLMService.initialize({
      systemPrompt: DEFAULT_SYSTEM_PROMPT
    });
    
    console.log('[ModelOrchestrator] Models reset for text tabs');
  }
}
```

**Tab Switch Flow:**

```
Chat/Journal Tab Active
       ↓
User clicks "Voice Therapy"
       ↓
[Loading Modal] "Preparing voice session..."
       ↓
Unload WebLLM (~2 seconds)
       ↓
Load Whisper (~3 seconds)
       ↓
Load Piper (~2 seconds)
       ↓
Reload WebLLM with voice prompt (~1 second)
       ↓
[Ready] "Voice Therapy Ready - Click to Start"
       ↓
User speaks → Real-time conversation
       ↓
User clicks another tab
       ↓
[Loading Modal] "Returning to text mode..."
       ↓
Unload Whisper + Piper (~1 second)
       ↓
Reload WebLLM for text (~2 seconds)
       ↓
Back to Chat/Journal
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Set up voice infrastructure and workers

**Tasks:**

1. **Create Voice Workers**
   ```
   src/workers/
   ├── whisper.worker.js      (New - STT processing)
   ├── piper.worker.js         (New - TTS processing)
   └── webllm.worker.js        (Existing - Text generation)
   ```

2. **Implement Whisper Service**
   ```javascript
   // src/services/whisper.js
   class WhisperService {
     async loadModel(modelName = 'base.en') {
       // Download GGML model from HuggingFace
       // Initialize Whisper.cpp WASM
       // Setup audio processing pipeline
     }
     
     async transcribe(audioBuffer) {
       // Send audio to worker
       // Return transcribed text
     }
     
     async unloadModel() {
       // Cleanup worker and memory
     }
   }
   ```

3. **Implement Piper Service**
   ```javascript
   // src/services/piper.js
   class PiperService {
     async loadModel(voiceName = 'lessac-medium') {
       // Download ONNX model + config
       // Initialize ONNX Runtime Web
       // Load espeak-ng for phonemization
     }
     
     async synthesize(text) {
       // Phonemize text
       // Generate audio via ONNX
       // Return audio buffer
     }
     
     async unloadModel() {
       // Cleanup ONNX session
     }
   }
   ```

4. **Create Model Orchestrator**
   ```javascript
   // src/services/modelOrchestrator.js
   class ModelOrchestrator {
     async switchToVoice() { /* ... */ }
     async switchFromVoice() { /* ... */ }
     getCurrentTab() { /* ... */ }
   }
   ```

**Deliverables:**
- ✅ Whisper worker loading and transcription functional
- ✅ Piper worker loading and synthesis functional
- ✅ Model orchestrator switching between WebLLM and voice models
- ✅ Basic audio recording from microphone working

---

### Phase 2: Voice Therapy UI (Week 3)

**Goal:** Create Voice Therapy tab and user interface

**Tasks:**

1. **Create Voice Therapy Page**
   ```jsx
   // src/pages/VoiceTherapy.jsx
   import React, { useState, useEffect } from 'react';
   import { useVoice } from '../contexts/VoiceContext';
   
   export default function VoiceTherapy() {
     const {
       isReady,
       isRecording,
       isProcessing,
       startSession,
       endSession,
       transcript,
       aiResponse
     } = useVoice();
     
     return (
       <div className="voice-therapy-container">
         <VoiceSessionControls />
         <ConversationDisplay />
         <VoiceVisualizer />
       </div>
     );
   }
   ```

2. **Create Voice Context**
   ```javascript
   // src/contexts/VoiceContext.jsx
   export const VoiceProvider = ({ children }) => {
     const [isReady, setIsReady] = useState(false);
     const [isRecording, setIsRecording] = useState(false);
     const [transcript, setTranscript] = useState([]);
     
     const initializeVoice = async () => {
       await modelOrchestrator.switchToVoice();
       setIsReady(true);
     };
     
     const cleanup = async () => {
       await modelOrchestrator.switchFromVoice();
     };
     
     // Implement voice session logic
   };
   ```

3. **Add Navigation Tab**
   ```jsx
   // src/components/Layout.jsx
   <nav>
     <NavLink to="/chat">Chat</NavLink>
     <NavLink to="/voice">Voice Therapy</NavLink> {/* New */}
     <NavLink to="/journal">Journal</NavLink>
   </nav>
   ```

4. **Create UI Components**
   ```
   src/components/
   ├── VoiceSessionControls.jsx    (Start/Stop button, status)
   ├── ConversationDisplay.jsx      (Show transcript + AI responses)
   ├── VoiceVisualizer.jsx          (Audio waveform visualization)
   └── ModelLoadingModal.jsx        (Model switching progress)
   ```

**Deliverables:**
- ✅ Voice Therapy tab accessible from navigation
- ✅ Session start/stop controls functional
- ✅ Real-time conversation display
- ✅ Loading states for model switching
- ✅ Voice activity visualization

---

### Phase 3: Integration & Audio Pipeline (Week 4)

**Goal:** Connect all components for end-to-end voice conversation

**Tasks:**

1. **Implement Audio Recording**
   ```javascript
   // src/services/audioRecorder.js
   class AudioRecorder {
     async startRecording() {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
       this.mediaRecorder = new MediaRecorder(stream);
       this.audioChunks = [];
       
       this.mediaRecorder.ondataavailable = (event) => {
         this.audioChunks.push(event.data);
       };
       
       this.mediaRecorder.start();
     }
     
     async stopRecording() {
       return new Promise((resolve) => {
         this.mediaRecorder.onstop = async () => {
           const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
           const audioBuffer = await this.convertToWAV(audioBlob);
           resolve(audioBuffer);
         };
         this.mediaRecorder.stop();
       });
     }
     
     convertToWAV(blob) {
       // Convert to 16kHz, 16-bit PCM WAV format (required by Whisper)
     }
   }
   ```

2. **Implement Voice-to-Voice Pipeline**
   ```javascript
   // src/services/voicePipeline.js
   class VoicePipeline {
     async processVoiceInput(audioBuffer) {
       // 1. Speech-to-Text
       const transcript = await whisperService.transcribe(audioBuffer);
       console.log('User said:', transcript);
       
       // 2. Generate AI response
       const aiText = await webLLMService.chat(transcript, [], null, {
         maxTokens: 150,
         temperature: 0.8
       });
       console.log('AI response:', aiText);
       
       // 3. Text-to-Speech
       const audioOutput = await piperService.synthesize(aiText);
       
       // 4. Play audio
       await this.playAudio(audioOutput);
       
       return { transcript, aiText };
     }
     
     async playAudio(audioData) {
       const audioContext = new AudioContext({ sampleRate: 22050 });
       const audioBuffer = audioContext.createBuffer(1, audioData.length, 22050);
       audioBuffer.getChannelData(0).set(audioData);
       
       const source = audioContext.createBufferSource();
       source.buffer = audioBuffer;
       source.connect(audioContext.destination);
       source.start();
     }
   }
   ```

3. **Add Voice Activity Detection (VAD)**
   ```javascript
   // Detect when user starts/stops speaking automatically
   // Use Silero-VAD (ONNX model ~800KB) for accurate detection
   class VoiceActivityDetector {
     async init() {
       // Load Silero-VAD ONNX model
       this.vadSession = await ort.InferenceSession.create('silero-vad.onnx');
     }
     
     async isSpeaking(audioChunk) {
       // Process audio chunk through VAD model
       // Return true if speech detected
     }
   }
   ```

4. **Implement Conversation Storage**
   ```javascript
   // Store voice therapy sessions in IndexedDB
   const voiceSessionStorage = createStorage({
     name: 'mindscribe',
     storeName: 'voiceSessions'
   });
   
   async function saveSession(session) {
     await voiceSessionStorage.save(`session_${Date.now()}`, {
       timestamp: new Date().toISOString(),
       transcript: session.transcript,
       duration: session.duration,
       encrypted: true
     });
   }
   ```

**Deliverables:**
- ✅ End-to-end voice conversation working
- ✅ Audio recording and playback functional
- ✅ Automatic voice activity detection
- ✅ Session history saved to IndexedDB
- ✅ Error handling and recovery

---

### Phase 4: Optimization & Polish (Week 5)

**Goal:** Optimize performance and improve user experience

**Tasks:**

1. **Performance Optimizations**
   - Implement audio chunk streaming for faster transcription
   - Add WebAssembly SIMD optimizations for Whisper
   - Optimize ONNX Runtime settings for Piper
   - Implement progressive model loading

2. **UI/UX Improvements**
   - Add conversation transcript export
   - Implement voice settings (speed, pitch for TTS)
   - Add pause/resume session controls
   - Show real-time processing status

3. **Error Handling**
   - Handle microphone permission denied
   - Handle model loading failures
   - Implement retry logic for failed transcription
   - Add fallback for unsupported browsers

4. **Documentation**
   - Write user guide for Voice Therapy
   - Document technical architecture
   - Create troubleshooting guide

**Deliverables:**
- ✅ Optimized performance (<500ms latency)
- ✅ Polished UI/UX
- ✅ Comprehensive error handling
- ✅ Complete documentation

---

### Phase 5: Testing & Quality Assurance (Week 6)

**Goal:** Ensure reliability and quality

**Tasks:**

1. **Unit Testing**
   - Test Whisper service transcription accuracy
   - Test Piper service speech quality
   - Test model orchestrator switching
   - Test audio recording/playback

2. **Integration Testing**
   - Test full voice-to-voice pipeline
   - Test model switching between tabs
   - Test session persistence
   - Test error recovery

3. **Performance Testing**
   - Measure latency (target: <500ms end-to-end)
   - Test memory usage (target: <1GB during voice session)
   - Test CPU usage (target: <50% on modern CPUs)
   - Test on various hardware configurations

4. **User Acceptance Testing**
   - Test with real users
   - Collect feedback on voice quality
   - Measure conversation naturalness
   - Identify usability issues

**Deliverables:**
- ✅ All tests passing
- ✅ Performance benchmarks met
- ✅ User feedback incorporated
- ✅ Ready for production release

---

## File Structure

### New Files to Create

```
MindScribe_V0.1/
├── src/
│   ├── pages/
│   │   └── VoiceTherapy.jsx                    (New - Voice therapy page)
│   │
│   ├── components/
│   │   ├── VoiceSessionControls.jsx            (New - Start/stop controls)
│   │   ├── ConversationDisplay.jsx             (New - Transcript display)
│   │   ├── VoiceVisualizer.jsx                 (New - Audio waveform)
│   │   └── ModelSwitchingModal.jsx             (New - Model loading progress)
│   │
│   ├── contexts/
│   │   └── VoiceContext.jsx                    (New - Voice state management)
│   │
│   ├── services/
│   │   ├── whisper.js                          (New - Whisper STT service)
│   │   ├── piper.js                            (New - Piper TTS service)
│   │   ├── audioRecorder.js                    (New - Audio recording)
│   │   ├── voicePipeline.js                    (New - Voice processing pipeline)
│   │   ├── modelOrchestrator.js                (New - Model management)
│   │   └── vad.js                              (New - Voice activity detection)
│   │
│   ├── workers/
│   │   ├── whisper.worker.js                   (New - Whisper worker)
│   │   └── piper.worker.js                     (New - Piper worker)
│   │
│   └── utils/
│       ├── audioProcessing.js                  (New - Audio utilities)
│       └── vadHelpers.js                       (New - VAD utilities)
│
├── public/
│   └── models/                                 (New - Model storage)
│       ├── whisper/
│       │   ├── tiny.en.bin                     (~75MB)
│       │   ├── base.en.bin                     (~142MB)
│       │   └── small.en.bin                    (~466MB)
│       │
│       ├── piper/
│       │   ├── lessac-medium.onnx              (~30MB)
│       │   ├── lessac-medium.onnx.json         (Config)
│       │   ├── ryan-medium.onnx                (~28MB)
│       │   └── ryan-medium.onnx.json           (Config)
│       │
│       └── vad/
│           └── silero-v6.2.0.onnx              (~800KB)
│
├── FEATURE_VOICE_THERAPY.md                    (This document)
└── VOICE_THERAPY_TESTING.md                    (New - Testing guide)
```

### Modified Files

```
src/
├── App.jsx                                     (Add VoiceTherapy route)
├── components/
│   └── Layout.jsx                              (Add Voice Therapy nav link)
└── contexts/
    └── WebLLMContext.jsx                       (Modify for model unloading)
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Current (Chat) | Voice Therapy |
|--------|--------|---------------|---------------|
| Model Loading | <8s | 5-10s | <8s (switch) |
| STT Latency | <300ms | N/A | <300ms |
| TTS Latency | <200ms | N/A | <200ms |
| End-to-End | <500ms | N/A | <500ms |
| Memory Usage | <1GB | ~1.5GB | <1GB |
| CPU Usage | <50% | ~30% | <50% |

### Hardware Requirements

**Minimum:**
- CPU: Intel i5 (8th gen) / AMD Ryzen 5 3000 series
- RAM: 8GB
- Browser: Chrome 113+ / Edge 113+
- Microphone: Any USB/built-in microphone

**Recommended:**
- CPU: Intel i7 (10th gen+) / AMD Ryzen 7 5000+
- RAM: 16GB
- Browser: Chrome 120+ / Edge 120+
- Microphone: USB microphone with noise cancellation

**Model Performance on Different Hardware:**

| Hardware | Whisper Base | Piper TTS | End-to-End |
|----------|--------------|-----------|------------|
| i5 8th Gen, 8GB RAM | ~400ms | ~150ms | ~550ms |
| i7 10th Gen, 16GB RAM | ~250ms | ~100ms | ~350ms |
| i9 12th Gen, 32GB RAM | ~150ms | ~70ms | ~220ms |
| M1 Mac, 16GB RAM | ~100ms | ~50ms | ~150ms |
| M2/M3 Mac, 24GB RAM | ~70ms | ~40ms | ~110ms |

---

## Privacy & Security

### Privacy Guarantees

1. **Zero Data Transmission**
   - All voice processing happens locally in browser
   - No audio sent to servers
   - No transcripts uploaded
   - No API calls to third-party services

2. **Local Storage Encryption**
   - Voice session transcripts encrypted with user's encryption key
   - Same encryption as journal/chat (PBKDF2 + AES-GCM)
   - Encryption key derived from user password, never stored

3. **No Persistent Storage of Audio**
   - Raw audio buffers discarded after transcription
   - Only text transcripts stored (encrypted)
   - User can delete session history anytime

4. **Browser Isolation**
   - All processing in Web Workers (isolated threads)
   - Models cached in browser Cache API (sandboxed)
   - No cross-origin requests

### Security Considerations

1. **Model Integrity**
   - Download models from official sources (HuggingFace, GitHub releases)
   - Verify SHA-256 checksums of downloaded models
   - Use SubResource Integrity (SRI) for WASM binaries

2. **Microphone Permissions**
   - Request microphone permission only when user starts voice session
   - Show clear permission prompt
   - Allow user to revoke permission anytime

3. **Memory Safety**
   - Use WebAssembly memory sandboxing
   - No buffer overflows possible in WASM
   - Automatic garbage collection for JS objects

---

## Testing Strategy

### Unit Tests

```javascript
// tests/whisper.service.test.js
describe('WhisperService', () => {
  test('should load model successfully', async () => {
    const whisper = new WhisperService();
    await expect(whisper.loadModel('base.en')).resolves.toBeDefined();
  });
  
  test('should transcribe audio correctly', async () => {
    const audioBuffer = loadTestAudio('test-speech.wav');
    const transcript = await whisperService.transcribe(audioBuffer);
    expect(transcript).toContain('hello world');
  });
});

// tests/piper.service.test.js
describe('PiperService', () => {
  test('should synthesize speech', async () => {
    const audio = await piperService.synthesize('Hello, how are you?');
    expect(audio).toBeInstanceOf(Float32Array);
    expect(audio.length).toBeGreaterThan(0);
  });
});

// tests/modelOrchestrator.test.js
describe('ModelOrchestrator', () => {
  test('should switch to voice tab', async () => {
    await orchestrator.switchToVoice();
    expect(orchestrator.activeTab).toBe('voice');
    expect(orchestrator.activeModels.whisper).toBeDefined();
    expect(orchestrator.activeModels.piper).toBeDefined();
  });
  
  test('should switch from voice tab', async () => {
    await orchestrator.switchFromVoice();
    expect(orchestrator.activeModels.whisper).toBeNull();
    expect(orchestrator.activeModels.piper).toBeNull();
  });
});
```

### Integration Tests

```javascript
// tests/voice-pipeline.integration.test.js
describe('Voice Pipeline Integration', () => {
  test('should complete full voice-to-voice conversation', async () => {
    // 1. Record audio
    const audioBuffer = await audioRecorder.recordTestAudio(3000); // 3 seconds
    
    // 2. Transcribe
    const transcript = await whisperService.transcribe(audioBuffer);
    expect(transcript).toBeDefined();
    
    // 3. Generate response
    const aiText = await webLLMService.chat(transcript, []);
    expect(aiText).toBeDefined();
    
    // 4. Synthesize speech
    const audio = await piperService.synthesize(aiText);
    expect(audio).toBeInstanceOf(Float32Array);
  }, 30000); // 30 second timeout
});
```

### Performance Tests

```javascript
// tests/performance.test.js
describe('Performance Benchmarks', () => {
  test('STT latency should be < 300ms', async () => {
    const start = performance.now();
    await whisperService.transcribe(testAudio);
    const latency = performance.now() - start;
    expect(latency).toBeLessThan(300);
  });
  
  test('TTS latency should be < 200ms', async () => {
    const start = performance.now();
    await piperService.synthesize('Hello world');
    const latency = performance.now() - start;
    expect(latency).toBeLessThan(200);
  });
  
  test('Memory usage should be < 1GB', async () => {
    const before = performance.memory.usedJSHeapSize;
    await orchestrator.switchToVoice();
    const after = performance.memory.usedJSHeapSize;
    const memoryUsed = (after - before) / (1024 * 1024 * 1024); // GB
    expect(memoryUsed).toBeLessThan(1);
  });
});
```

---

## References & Documentation

### Official Documentation

1. **Whisper.cpp**
   - GitHub: https://github.com/ggml-org/whisper.cpp
   - Documentation: https://github.com/ggml-org/whisper.cpp/blob/master/README.md
   - WASM Example: https://github.com/ggml-org/whisper.cpp/tree/master/examples/whisper.wasm
   - Model Downloads: https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md

2. **Piper TTS**
   - GitHub (Original): https://github.com/rhasspy/piper
   - GitHub (Updated): https://github.com/OHF-Voice/piper1-gpl
   - Voice Samples: https://rhasspy.github.io/piper-samples/
   - Model Downloads: https://huggingface.co/rhasspy/piper-voices

3. **ONNX Runtime Web**
   - Documentation: https://onnxruntime.ai/docs/get-started/with-javascript.html
   - NPM Package: https://www.npmjs.com/package/onnxruntime-web
   - API Reference: https://onnxruntime.ai/docs/api/js/index.html

4. **Web Audio API**
   - MDN Documentation: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
   - getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

5. **WebAssembly**
   - MDN: https://developer.mozilla.org/en-US/docs/WebAssembly
   - WASM in Browser: https://webassembly.org/docs/web/

### Research Papers

1. **Whisper (OpenAI):** "Robust Speech Recognition via Large-Scale Weak Supervision"
   - Paper: https://cdn.openai.com/papers/whisper.pdf

2. **VITS (Piper's underlying model):** "Conditional Variational Autoencoder with Adversarial Learning for End-to-End Text-to-Speech"
   - Paper: https://arxiv.org/abs/2106.06103

### Community Resources

1. **Whisper.cpp Discussions:** https://github.com/ggml-org/whisper.cpp/discussions
2. **Piper Voices:** https://github.com/rhasspy/piper/blob/master/VOICES.md
3. **WebLLM Discord:** https://discord.gg/9Xpy2HGBuD

---

## Implementation Checklist

### Pre-Implementation

- [ ] Review and approve this feature specification
- [ ] Confirm hardware requirements with target users
- [ ] Test WebAssembly support in target browsers
- [ ] Verify model download sources and checksums
- [ ] Plan model caching strategy (CDN vs. HuggingFace)

### Phase 1: Foundation

- [ ] Create whisper.worker.js
- [ ] Create piper.worker.js  
- [ ] Implement WhisperService class
- [ ] Implement PiperService class
- [ ] Implement ModelOrchestrator class
- [ ] Test model loading and unloading
- [ ] Test memory usage during model switching

### Phase 2: Voice Therapy UI

- [ ] Create VoiceTherapy.jsx page
- [ ] Create VoiceContext.jsx
- [ ] Create VoiceSessionControls component
- [ ] Create ConversationDisplay component
- [ ] Create VoiceVisualizer component
- [ ] Add Voice Therapy tab to navigation
- [ ] Implement loading states

### Phase 3: Integration & Audio

- [ ] Implement AudioRecorder class
- [ ] Implement VoicePipeline class
- [ ] Add Voice Activity Detection (VAD)
- [ ] Implement session storage
- [ ] Test end-to-end voice conversation
- [ ] Add error handling

### Phase 4: Optimization & Polish

- [ ] Optimize audio chunk streaming
- [ ] Add WebAssembly SIMD optimizations
- [ ] Optimize ONNX Runtime settings
- [ ] Improve UI/UX
- [ ] Add voice settings (speed, pitch)
- [ ] Implement transcript export

### Phase 5: Testing & QA

- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Conduct performance testing
- [ ] Conduct user acceptance testing
- [ ] Document testing results
- [ ] Fix identified bugs

### Post-Implementation

- [ ] Update USER_GUIDE.md with Voice Therapy instructions
- [ ] Update TECHNICAL_DOCS.md with voice architecture
- [ ] Create video tutorial for Voice Therapy
- [ ] Monitor user feedback and performance metrics
- [ ] Plan future voice enhancements

---

## Future Enhancements (V0.3+)

1. **Multi-Language Support**
   - Add Whisper multilingual models
   - Add Piper voices for other languages (Spanish, French, etc.)

2. **Voice Customization**
   - Allow users to select from multiple voice options
   - Adjust speech rate and pitch
   - Add emotion/tone control

3. **Advanced VAD**
   - Implement speaker diarization (distinguish multiple speakers)
   - Add background noise filtering
   - Improve turn-taking detection

4. **Session Insights**
   - Sentiment analysis of voice sessions
   - Conversation topic detection
   - Session statistics and trends

5. **Accessibility Features**
   - Real-time captions for deaf/hard-of-hearing users
   - Voice commands for navigation
   - Screen reader integration

---

## Contact & Support

**Feature Owner:** Claude Sonnet 4.5  
**Technical Lead:** TBD  
**Documentation:** FEATURE_VOICE_THERAPY.md

**Questions?** Open a discussion on GitHub Issues with [VOICE-THERAPY] tag.

---

**Last Updated:** January 26, 2026  
**Version:** 1.0  
**Status:** 🟡 Awaiting Approval
