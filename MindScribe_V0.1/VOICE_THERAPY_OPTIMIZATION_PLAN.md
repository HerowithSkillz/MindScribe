# Voice Therapy Optimization Plan
## From 20-35s Latency to Near Real-Time Conversation

**Date:** January 29, 2026  
**Goal:** Implement a PersonaPlex-like conversational experience, fully offline on client devices

---

## 1. Current Architecture Analysis

### Current Pipeline (Sequential)
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Record     │ ─▸ │   Whisper    │ ─▸ │   WebLLM     │ ─▸ │    Piper     │
│   3s Audio   │    │   STT        │    │   LLM        │    │    TTS       │
│              │    │   (tiny.en)  │    │   (Llama)    │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                         ~16-25s            ~3-9s             ~0.3-0.6s
```

### Current Performance (from Console Log)
| Component | Time | Notes |
|-----------|------|-------|
| Whisper STT | 16-25s | CPU-only (WASM), tiny.en model |
| WebLLM Response | 3-9s | WebGPU, Llama-3.2-1B-q4 |
| Piper TTS | 0.3-0.6s | CPU (ONNX WASM) |
| **Total** | **20-35s** | **Unusable for conversation** |

### Root Causes of Latency
1. **Whisper on CPU**: The main bottleneck. WASM execution is ~10-20x slower than GPU
2. **Sequential Processing**: Each stage waits for the previous to complete
3. **Fixed 3s Recording**: No streaming - must wait for full audio chunk
4. **No Speculative Execution**: LLM doesn't start until STT completes

---

## 2. Target Architecture Comparison

### PersonaPlex/Moshi Architecture (Server-Side GPU)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Full-Duplex Speech-to-Speech Model                   │
│  ┌────────────┐                                      ┌────────────┐     │
│  │   Mimi     │   Audio Codec (12.5Hz, 1.1kbps)     │   Mimi     │     │
│  │  Encoder   │ ─────────────────────────────────▸  │  Decoder   │     │
│  └────────────┘                                      └────────────┘     │
│        │                                                   ▲            │
│        ▼                                                   │            │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │           7B Parameter Transformer                       │            │
│  │   (Models both user + AI speech streams in parallel)    │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                          │
│   Latency: 160-200ms theoretical, requires NVIDIA GPU (L4/A100)         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why PersonaPlex Won't Work Offline:**
- Requires 7B+ parameter model (14GB+ VRAM)
- GPU memory requirements exceed browser WebGPU limits
- Moshi/PersonaPlex trained on proprietary data, not easily adaptable
- Full-duplex requires continuous bidirectional audio streaming

---

## 3. Proposed Optimized Architecture

### Option A: WebGPU-Accelerated Pipeline (Recommended)

**Key Changes:**
1. Switch from whisper.cpp (WASM) to Transformers.js Whisper with WebGPU
2. Use streaming/chunked transcription (process audio as it arrives)
3. Parallel TTS synthesis (start TTS while LLM is still generating)
4. Upgrade to faster Whisper variant (distil-whisper or Moonshine)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Optimized Browser Pipeline                             │
│                                                                           │
│  ┌─────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌──────────┐ │
│  │ Audio   │   │ Whisper WebGPU  │   │   WebLLM        │   │ Piper    │ │
│  │ Stream  │──▸│ (distil-small)  │──▸│   (Streaming)   │──▸│ TTS      │ │
│  │ VAD     │   │ ~2-4s for 3s    │   │   Token-by-     │   │ WebGPU   │ │
│  └─────────┘   │ audio           │   │   Token         │   └──────────┘ │
│       │        └─────────────────┘   └─────────────────┘        │       │
│       │                                      │                   │       │
│       ▼                                      ▼                   ▼       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │              Parallel Audio Playback (Web Audio API)               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│   Target Latency: 5-8 seconds (3-4s STT + 2-3s LLM + 0.5s TTS)          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Estimated Performance:**
| Component | Current | Optimized | Improvement |
|-----------|---------|-----------|-------------|
| Whisper STT | 16-25s | 2-4s | **6-8x faster** |
| WebLLM Response | 3-9s | 2-4s | Streaming tokens |
| Piper TTS | 0.3-0.6s | 0.2-0.4s | Parallel start |
| **Total** | **20-35s** | **5-8s** | **3-5x faster** |

---

### Option B: Moonshine + Streaming LLM (Ultra-Fast)

**Moonshine** is a new ultra-fast ASR model specifically designed for real-time on-device use:
- 5x faster than Whisper tiny
- Native streaming support (processes audio chunks incrementally)
- Optimized for WebGPU

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Ultra-Fast Browser Pipeline                          │
│                                                                           │
│  ┌─────────────┐    ┌───────────────┐    ┌─────────────┐    ┌──────────┐│
│  │ Streaming   │    │   Moonshine   │    │  SmolLM-360M│    │  Kokoro  ││
│  │ Audio VAD   │───▸│   ASR         │───▸│  or TinyLLM │───▸│  TTS     ││
│  │ (Silero)    │    │   (Streaming) │    │  (Streaming)│    │          ││
│  └─────────────┘    └───────────────┘    └─────────────┘    └──────────┘│
│                           ~0.5-1s              ~1-2s           ~0.3s     │
│                                                                           │
│   Target Latency: 2-4 seconds (conversational)                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Tradeoffs:**
- Smaller LLM = less sophisticated responses
- May need fine-tuning for therapy context
- Moonshine is newer, less tested in production

---

### Option C: Hybrid Local + WebRTC Server (Best Quality)

For production-grade quality while maintaining privacy:

```
┌────────────────────────────────────────────────────────────────────────────┐
│   Client (Browser)                    │    Optional Server (Self-Hosted)  │
│                                        │                                    │
│  ┌─────────────┐                      │   ┌────────────────────────────┐  │
│  │ Audio Input │◀─────WebRTC─────────▶│   │  GPU-Accelerated Backend  │  │
│  └─────────────┘                      │   │  - Faster Whisper          │  │
│        │                              │   │  - Larger LLM (7B-13B)     │  │
│        ▼                              │   │  - Better TTS              │  │
│  ┌─────────────┐                      │   └────────────────────────────┘  │
│  │ Local VAD   │                      │                                    │
│  │ Fallback    │   Falls back to      │   Latency: 200-500ms              │
│  │ Pipeline    │◀──local if server────│   Quality: Production-grade       │
│  └─────────────┘   unavailable        │                                    │
└────────────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Near real-time with server
- Full offline fallback
- Privacy maintained (self-hosted server)
- Best response quality

---

## 4. Recommended Implementation: Option A (WebGPU Pipeline)

### Phase 1: Replace Whisper WASM with WebGPU (Priority: CRITICAL)

**Current:** whisper.cpp via whisper-webgpu WASM (~16-25s)  
**Target:** Transformers.js Whisper with WebGPU (~2-4s)

#### Step 1.1: Install Transformers.js
```bash
npm install @huggingface/transformers
```

#### Step 1.2: Create New Whisper Service
```javascript
// src/services/whisperWebGPU.js
import { pipeline, env } from '@huggingface/transformers';

// Configure for local models
env.allowLocalModels = true;
env.useBrowserCache = true;

class WhisperWebGPU {
  constructor() {
    this.transcriber = null;
    this.isReady = false;
  }

  async initialize(onProgress) {
    try {
      // Use distil-whisper-small for best speed/quality balance
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        'distil-whisper/distil-small.en', // 366MB, much faster
        {
          device: 'webgpu', // Use GPU acceleration
          dtype: 'fp16',     // Half precision for speed
          progress_callback: (progress) => {
            onProgress?.(progress.progress * 100);
          }
        }
      );
      
      this.isReady = true;
      console.log('✅ Whisper WebGPU initialized');
      return true;
    } catch (error) {
      console.error('WebGPU not available, falling back to WASM:', error);
      // Fallback to current implementation
      return this.initializeFallback(onProgress);
    }
  }

  async transcribe(audioData, sampleRate = 16000) {
    if (!this.isReady) throw new Error('Whisper not initialized');

    const startTime = performance.now();
    
    const result = await this.transcriber(audioData, {
      language: 'english',
      task: 'transcribe',
      return_timestamps: false,
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    const duration = performance.now() - startTime;
    console.log(`[Whisper WebGPU] Transcribed in ${duration.toFixed(0)}ms`);
    
    return result.text;
  }

  async dispose() {
    this.transcriber = null;
    this.isReady = false;
  }
}

export const whisperWebGPU = new WhisperWebGPU();
```

#### Step 1.3: Update Model Orchestrator
```javascript
// In modelOrchestrator.js
import { whisperWebGPU } from './whisperWebGPU.js';

// Replace whisper.loadModel() with:
await whisperWebGPU.initialize((progress) => {
  console.log(`[ModelOrchestrator] Whisper WebGPU: ${progress}%`);
});
```

### Phase 2: Implement Streaming LLM Responses

**Current:** Wait for full response before TTS  
**Target:** Start TTS as soon as first sentence is complete

#### Step 2.1: Modify WebLLM for Streaming
```javascript
// In webllm.js - Add streaming response handler
async generateStreamingResponse(prompt, onChunk) {
  const engine = this.engine;
  let fullResponse = '';
  let sentenceBuffer = '';
  
  const asyncChunkGenerator = await engine.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    max_tokens: 150,
  });

  for await (const chunk of asyncChunkGenerator) {
    const token = chunk.choices[0]?.delta?.content || '';
    fullResponse += token;
    sentenceBuffer += token;
    
    // Check for sentence boundaries
    const sentenceMatch = sentenceBuffer.match(/[^.!?]*[.!?]/);
    if (sentenceMatch) {
      const completeSentence = sentenceMatch[0];
      onChunk(completeSentence); // Send to TTS immediately
      sentenceBuffer = sentenceBuffer.slice(completeSentence.length);
    }
  }
  
  // Send remaining text
  if (sentenceBuffer.trim()) {
    onChunk(sentenceBuffer);
  }
  
  return fullResponse;
}
```

#### Step 2.2: Parallel TTS Synthesis
```javascript
// In voicePipeline.js
async processVoiceToVoice(audioData, onPartialAudio) {
  // Transcribe
  const transcript = await whisperWebGPU.transcribe(audioData);
  
  // Stream LLM and synthesize in parallel
  const audioChunks = [];
  
  await webllm.generateStreamingResponse(prompt, async (sentence) => {
    // Synthesize each sentence as it arrives
    const audioChunk = await piper.synthesize(sentence);
    audioChunks.push(audioChunk);
    onPartialAudio?.(audioChunk); // Play immediately
  });
  
  return { transcript, audioChunks };
}
```

### Phase 3: Optimize TTS for WebGPU

**Current:** Piper ONNX on CPU (WASM)  
**Target:** Piper or Kokoro on WebGPU

#### Option 3A: Keep Piper with SIMD Optimization
```javascript
// Enable SIMD for faster ONNX
import * as ort from 'onnxruntime-web';

// Configure for maximum speed
ort.env.wasm.simd = true;
ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
```

#### Option 3B: Switch to Kokoro TTS (Faster, Better Quality)
Kokoro is a newer TTS model that's:
- 2x faster than Piper
- Better prosody and naturalness
- Supports WebGPU

```javascript
// src/services/kokoroTTS.js (placeholder for future)
import { pipeline } from '@huggingface/transformers';

const synthesizer = await pipeline(
  'text-to-speech', 
  'hexgrad/Kokoro-82M',
  { device: 'webgpu' }
);
```

### Phase 4: Implement Voice Activity Detection Improvements

**Current:** Fixed 3-second recording chunks  
**Target:** Dynamic speech endpoint detection

```javascript
// Enhanced VAD in audioRecorder.js
class SmartRecorder {
  constructor() {
    this.silenceThreshold = 0.01;
    this.minSpeechDuration = 500;  // ms
    this.maxSilenceDuration = 800; // ms before stopping
    this.maxRecordingDuration = 10000; // 10s max
  }

  async recordUntilSilence() {
    return new Promise((resolve) => {
      let audioChunks = [];
      let silenceStart = null;
      let speechDetected = false;
      
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.analyser = this.audioContext.createAnalyser();
      
      const checkAudio = () => {
        const data = new Float32Array(this.analyser.fftSize);
        this.analyser.getFloatTimeDomainData(data);
        
        const rms = Math.sqrt(data.reduce((a, b) => a + b * b, 0) / data.length);
        const isSpeech = rms > this.silenceThreshold;
        
        if (isSpeech) {
          speechDetected = true;
          silenceStart = null;
        } else if (speechDetected && !silenceStart) {
          silenceStart = Date.now();
        }
        
        // Stop recording after sufficient silence
        if (silenceStart && Date.now() - silenceStart > this.maxSilenceDuration) {
          this.stop();
          resolve(this.getAudioData());
        } else {
          requestAnimationFrame(checkAudio);
        }
      };
      
      this.start();
      checkAudio();
    });
  }
}
```

---

## 5. Model Recommendations

### For Fastest Performance (Target: 3-5s latency)

| Component | Model | Size | Expected Speed |
|-----------|-------|------|----------------|
| STT | `distil-whisper/distil-small.en` | 366MB | 2-3s for 3s audio |
| LLM | `Llama-3.2-1B-Instruct-q4f16_1-MLC` | 600MB | 1-2s (streaming) |
| TTS | `Piper en_US-lessac-medium` | 30MB | 0.2-0.4s |

### For Best Quality (Target: 5-8s latency)

| Component | Model | Size | Expected Speed |
|-----------|-------|------|----------------|
| STT | `openai/whisper-small.en` | 488MB | 3-5s for 3s audio |
| LLM | `Llama-3.2-3B-Instruct-q4f16_1-MLC` | 1.8GB | 3-4s (streaming) |
| TTS | `Kokoro-82M` (future) | 164MB | 0.3-0.5s |

### Alternative: Moonshine (Experimental)

| Component | Model | Size | Expected Speed |
|-----------|-------|------|----------------|
| STT | `moonshine-tiny` | 31MB | 0.5-1s for 3s audio |
| LLM | `SmolLM-360M-Instruct` | 360MB | 0.5-1s (streaming) |
| TTS | `Piper en_US-lessac-medium` | 30MB | 0.2-0.4s |

**Total: ~1.5-2.5 seconds** - True conversational speed!

---

## 6. Implementation Roadmap

### Week 1: WebGPU Whisper Migration
- [ ] Install @huggingface/transformers
- [ ] Create whisperWebGPU.js service
- [ ] Add WebGPU capability detection
- [ ] Implement fallback to current WASM implementation
- [ ] Test on various hardware (low/medium/high-end)

### Week 2: Streaming LLM Integration  
- [ ] Modify webllm.js for streaming responses
- [ ] Implement sentence-boundary detection
- [ ] Create parallel processing pipeline
- [ ] Add buffering for smooth audio playback

### Week 3: TTS Optimization
- [ ] Enable SIMD for Piper ONNX
- [ ] Investigate Kokoro TTS integration
- [ ] Implement audio chunk queuing
- [ ] Add gapless playback between chunks

### Week 4: Smart VAD & Polish
- [ ] Implement dynamic speech endpoint detection
- [ ] Add interruption handling (user can speak over AI)
- [ ] Performance profiling and optimization
- [ ] User testing and iteration

---

## 7. Hardware Requirements

### Minimum (5-8s latency)
- **GPU:** WebGPU-capable browser (Chrome 113+, Edge 113+)
- **RAM:** 8GB system memory
- **VRAM:** 4GB dedicated or shared GPU memory
- **CPU:** 4-core processor for fallback

### Recommended (3-5s latency)
- **GPU:** Discrete GPU with 6GB+ VRAM (NVIDIA GTX 1060+ or AMD RX 580+)
- **RAM:** 16GB system memory
- **Browser:** Chrome/Edge latest with WebGPU enabled

### Optimal (2-3s latency)
- **GPU:** NVIDIA RTX 3060+ or AMD RX 6600+
- **RAM:** 32GB system memory
- **SSD:** For model caching

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WebGPU not available | Medium | High | Fallback to current WASM pipeline |
| Model too large for VRAM | Medium | Medium | Use smaller models, implement dynamic switching |
| Browser API instability | Low | Medium | Feature detection, graceful degradation |
| Audio quality issues | Medium | Medium | A/B testing, user feedback loops |

---

## 9. Success Metrics

| Metric | Current | Target | Stretch Goal |
|--------|---------|--------|--------------|
| End-to-end latency | 20-35s | 5-8s | 2-3s |
| STT accuracy | 85% | 90% | 95% |
| TTS naturalness | 3/5 | 4/5 | 4.5/5 |
| User satisfaction | N/A | 4/5 | 4.5/5 |
| Browser compatibility | Chrome/Edge | +Firefox | +Safari |

---

## 10. Conclusion

The current architecture's main bottleneck is **Whisper STT running on CPU via WASM**, taking 16-25 seconds for just 3 seconds of audio. By migrating to **WebGPU-accelerated Whisper** and implementing **streaming LLM responses**, we can achieve **5-8x faster performance** while remaining fully offline.

The PersonaPlex/Moshi architecture (160ms latency) is not achievable in-browser due to:
1. 7B+ parameter model requirements (14GB+ VRAM)
2. Full-duplex audio codec not available for web
3. Training data and model architecture not portable

However, our optimized pipeline can achieve **3-5 second latency** with:
- WebGPU Whisper (distil-small.en): 2-3s
- Streaming WebLLM: 1-2s
- Optimized Piper TTS: 0.2-0.4s

This is **conversationally usable** and represents a **7-10x improvement** over the current implementation.

---

## Appendix: Quick Start Commands

```bash
# Install dependencies
npm install @huggingface/transformers

# Download models (will be cached in IndexedDB)
# Models download automatically on first use

# Test WebGPU availability
navigator.gpu ? console.log('WebGPU ✅') : console.log('WebGPU ❌');
```

---

*Document Version: 1.0*  
*Last Updated: January 29, 2026*
