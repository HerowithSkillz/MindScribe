# Voice Therapy Optimization Plan

## Critical Issues Identified

### 1. **Phoneme Conversion (Piper TTS)**
**Problem:** Custom G2P and espeak-ng integration both have issues
- Custom G2P: Still produces wrong phonemes → gibberish speech
- espeak-ng WASM: 18MB+ size, complex Worker integration, may not work in browser Workers

**Real Solution:** Use Piper's **text phoneme mode** instead of espeak
- Piper models support `phoneme_type: "text"` - direct character mapping
- Much simpler, works offline, no external dependencies
- Trade-off: Less natural pronunciation but **understandable** speech

**Implementation:**
```javascript
// Instead of complex IPA conversion, use simple character-to-ID mapping
function textToPhonemeIds(text) {
  const phonemeMap = voiceConfig.phoneme_id_map;
  const phonemeIds = [phonemeMap['^'][0]]; // BOS
  
  for (const char of text.toLowerCase()) {
    if (phonemeMap[char]) {
      phonemeIds.push(phonemeMap[char][0]);
    }
  }
  
  phonemeIds.push(phonemeMap['$'][0]); // EOS
  return phonemeIds;
}
```

**Why this works:** Piper lessac model WAS trained on text-mode phonemes too, not just espeak IPA

---

### 2. **Whisper Speed (45s transcription!)**
**Problem:** Base.en model (142MB) is TOO SLOW for conversation
- 45 seconds to transcribe 3 seconds of speech
- Unacceptable for real-time dialogue

**Real Solution:** Use Whisper TINY model
- Model: `tiny.en` (39MB vs 142MB base.en)
- Speed: **5-10x faster** → 5 seconds instead of 45 seconds
- Accuracy: 85% vs 95% (acceptable for therapy conversations)

**Implementation:**
```javascript
// In whisper.js
async loadModel(modelId = 'tiny.en') {  // Changed from 'base.en'
  const whisperModel = await WhisperModel.create({
    model: 'tiny.en',
    modelUrl: `/models/whisper/tiny.en.bin`,
    useCache: true
  });
}
```

**Trade-off:** Slightly less accurate but 10x faster = better UX

---

### 3. **Audio Playback Speed Issue**
**Problem:** Speech sounds "sped up"  
**Root Cause:** Sample rate mismatch

**Current code:**
```javascript
// voicePipeline.js line 42
this.audioContext = new AudioContext({
  sampleRate: 22050  // Piper output rate
});

// voicePipeline.js line 228
const audioBuffer = this.audioContext.createBuffer(
  1,
  audioData.length,
  22050  // CORRECT!
);
```

**This is actually CORRECT!** The issue might be:
1. Browser's default audio context is 44100Hz or 48000Hz
2. Need to resample Piper output OR force AudioContext to 22050Hz

**Fix:**
```javascript
// Option 1: Let browser handle resampling
this.audioContext = new AudioContext(); // Use default sample rate

// Then when creating buffer:
const audioBuffer = this.audioContext.createBuffer(
  1,
  audioData.length,
  22050  // Piper's rate - browser will resample automatically
);
```

---

### 4. **Continuous Conversation (No Hold-to-Record)**
**Problem:** Current UX requires click-to-record, click-to-stop
**Desired:** Auto-detect speech, instant responses

**Real Solution:** VAD (Voice Activity Detection) auto-recording
```javascript
// Continuous listening mode
async startContinuousMode() {
  // Start microphone capture
  await audioRecorder.initialize();
  
  // Continuously process audio chunks
  const stream = await audioRecorder.startStreaming();
  
  while (this.isSessionActive) {
    const audioChunk = await stream.getNextChunk(); // 3-5 seconds
    
    // VAD detects speech
    const hasSpeech = await vadInstance.detectSpeech(audioChunk);
    
    if (hasSpeech) {
      // Immediate transcription (no wait for button click)
      const transcript = await whisper.transcribe(audioChunk);
      
      // Immediate AI response
      const aiResponse = await webLLM.chat(transcript);
      
      // Immediate speech playback
      await piper.synthesize(aiResponse);
    }
    
    // Loop continues - ready for next speech
  }
}
```

**Key:** 
- No buttons - just start/stop session
- Auto-detect when user speaks (VAD)
- Process immediately
- Return to listening after response

---

## Implementation Priority

### Phase 1: Speed Optimization (CRITICAL)
1. **Switch to Whisper tiny.en** → 5s transcription instead of 45s
2. **Simplify Piper phoneme conversion** → Direct character mapping
3. **Fix audio playback rate** → Test with default AudioContext

**Expected Result:** Total pipeline 10-15 seconds (acceptable)

### Phase 2: UX Improvement
1. **Implement VAD auto-recording** → Continuous conversation mode
2. **Add audio feedback** → "Listening..." beep, "Processing..." tone
3. **Show real-time status** → "Transcribing...", "Thinking...", "Speaking..."

**Expected Result:** Natural conversation flow

### Phase 3: Quality Tuning
1. **Test Piper pronunciation** → Iterate on phoneme mapping if needed
2. **Optimize LLM speed** → Consider shorter max tokens for voice
3. **Reduce latency** → Parallel processing where possible

---

## Code Changes Required

### 1. Whisper Tiny Model
**File:** `src/services/whisper.js`
```javascript
// Line ~50
async loadModel(modelId = 'tiny.en') {  // Change default
  // Rest stays same
}
```

**Download tiny model:**
```powershell
# In PowerShell
$url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin"
Invoke-WebRequest -Uri $url -OutFile "public/models/whisper/tiny.en.bin"
```

### 2. Simplified Piper Phonemes
**File:** `src/workers/piper.worker.js`
```javascript
// Replace entire textToPhonemeIds and remove all dictionary/G2P code

function textToPhonemeIds(text) {
  const phonemeMap = voiceConfig.phoneme_id_map;
  const phonemeIds = [];
  
  // BOS marker
  if (phonemeMap['^']) phonemeIds.push(phonemeMap['^'][0]);
  
  // Direct character mapping
  for (const char of text.toLowerCase()) {
    if (phonemeMap[char]) {
      phonemeIds.push(phonemeMap[char][0]);
    } else if (char === ' ' && phonemeMap[' ']) {
      phonemeIds.push(phonemeMap[' '][0]);
    }
  }
  
  // EOS marker
  if (phonemeMap['$']) phonemeIds.push(phonemeMap['$'][0]);
  
  return phonemeIds;
}
```

### 3. Audio Context Fix
**File:** `src/services/voicePipeline.js`
```javascript
// Line 42 - Use default sample rate
this.audioContext = new AudioContext(); // Remove {sampleRate: 22050}

// Line 228 - Keep Piper's 22050Hz, browser resamples
const audioBuffer = this.audioContext.createBuffer(
  1,
  audioData.length,
  22050  // This is correct - browser handles conversion
);
```

### 4. Continuous Mode (Phase 2)
**File:** `src/services/voicePipeline.js`
```javascript
async startContinuousSession(onMessage) {
  this.isSessionActive = true;
  await audioRecorder.initialize();
  
  while (this.isSessionActive) {
    try {
      // Get 5-second audio chunks
      const audioChunk = await audioRecorder.getNextChunk(5000);
      
      // VAD check
      const segments = await vadInstance.detectSpeech(audioChunk);
      
      if (segments.length > 0) {
        // Process immediately
        const result = await this.processVoiceInput(audioChunk);
        onMessage(result);
      }
      
      // Small delay before next chunk
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Continuous mode error:', error);
      break;
    }
  }
}
```

---

## Testing Plan

### Test 1: Whisper Tiny Speed
1. Download tiny.en model (39MB)
2. Switch to tiny.en in code
3. Record 3-second audio
4. Measure transcription time
**Expected:** <5 seconds (vs 45 seconds before)

### Test 2: Piper Pronunciation
1. Implement simple character mapping
2. Test phrase: "Hello, how are you feeling today?"
3. Listen to speech output
**Expected:** Understandable (not perfect, but clear enough)

### Test 3: Audio Playback Speed
1. Synthesize "Hello, how are you?"
2. Play through browser
3. Verify normal speed (not chipmunk voice)
**Expected:** Normal speed speech

### Test 4: End-to-End Flow
1. Speak into microphone
2. Wait for AI response
3. Listen to speech output
4. Total time < 20 seconds
**Expected:** Natural conversation timing

---

## Why This Approach Works

1. **Whisper tiny** - Proven to work in browsers, 10x faster
2. **Simple phoneme mapping** - Less accurate but **functional** and **offline**
3. **Default AudioContext** - Let browser handle sample rate conversion
4. **VAD auto-recording** - Natural conversation flow

**Trade-offs:**
- Whisper tiny: 85% accuracy vs 95% (acceptable for therapy)
- Simple phonemes: Less natural pronunciation but **understandable**
- No espeak-ng: Avoids 18MB download and Worker complexity

**Benefits:**
- **10x faster** transcription (5s vs 45s)
- **Simpler code** (no complex G2P rules)
- **Fully offline** (no external dependencies)
- **Better UX** (continuous conversation)

---

## Next Steps

1. **IMMEDIATELY:** Test current Piper output - is it really gibberish or just fast?
2. **Download tiny.en model** and switch
3. **Simplify piper.worker.js** - remove all dictionary code
4. **Test audio playback** - verify sample rate handling
5. **Implement continuous mode** - VAD auto-recording

**Priority:** Speed first, then quality, then UX
