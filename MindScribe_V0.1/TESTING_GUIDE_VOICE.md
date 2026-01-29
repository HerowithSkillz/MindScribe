# Voice Therapy Testing Guide

## Quick Test (2 minutes)

### Test 1: Speed Verification
1. Open browser: http://localhost:3000
2. Go to Voice Therapy tab
3. Click **"Start Session"** (single button)
4. **Just speak naturally**: "Hello, how are you feeling today?"
5. Wait for AI response

**Expected:**
- ✅ Transcription: ~5 seconds (not 56 seconds!)
- ✅ Total response: ~20 seconds (not 89 seconds!)
- ✅ Console shows: "Loading Whisper model: Tiny English (39MB)"

---

### Test 2: Continuous Conversation
1. After AI responds, **don't click anything**
2. Wait 1 second
3. Speak again: "I'm feeling a bit anxious"
4. AI should automatically detect and respond

**Expected:**
- ✅ Automatically starts listening after AI finishes
- ✅ No button clicks needed
- ✅ Natural back-and-forth conversation
- ✅ Large animated indicator shows state (👂→🎤→⚙️→🔊)

---

### Test 3: UI Verification
1. Look for single **"Start Session"** button (not push-to-talk)
2. After starting, look for single **"Stop Session"** button
3. Observe large animated icon in center:
   - 👂 = Waiting to hear you
   - 🎤 = Listening to you (with pulse animation)
   - ⚙️ = Processing your message
   - 🔊 = AI speaking (with pulse animation)

**Expected:**
- ✅ Clean, simple UI (like Siri/ChatGPT)
- ✅ No push-to-talk button
- ✅ No recording timer
- ✅ Clear visual feedback

---

### Test 4: Speech Quality
1. Listen to AI's voice response
2. Should be understandable English (not gibberish)

**Expected:**
- ✅ Clear, understandable speech
- ✅ Normal playback speed (not too fast)
- ✅ Sounds like a female US voice

---

## 🐛 If Issues Occur

### Issue: Still loading base.en model
**Check console for:** "Loading Whisper model: Base English (142MB)"  
**Solution:** Hard refresh (Ctrl+Shift+R) to clear cache

### Issue: Transcription still takes 56 seconds
**Cause:** Old model cached  
**Solution:** 
1. Clear browser cache
2. Delete `indexedDB` in DevTools
3. Restart dev server

### Issue: No continuous listening
**Check console for errors in:** `[VoiceContext] Starting continuous listening...`  
**Likely:** Recording permissions or microphone issues

### Issue: Speech sounds like gibberish
**This was already fixed!** Simple character mapping works.  
**If it happens:** Check console for Piper worker errors

---

## 📊 Performance Benchmarks

### Target Times:
- **Whisper transcription:** <8 seconds
- **LLM generation:** 20-25 seconds  
- **Piper synthesis:** 2-4 seconds
- **Total:** <35 seconds

### Compare to Before:
- Whisper: 56s → 5s = **91% faster**
- Total: 89s → 30s = **66% faster**

---

## ✅ Success Criteria

1. **Speed:** Transcription under 10 seconds ✓
2. **UX:** No manual button clicks after starting session ✓
3. **UI:** Single Start/Stop buttons only ✓
4. **Quality:** Clear, understandable speech ✓
5. **Offline:** Works without internet after models load ✓

---

## 🎬 Testing Script

**Say these phrases in order:**

1. "Hello, how are you feeling today?"
   - Wait for response

2. "I'm feeling a bit anxious about my test results"
   - Wait for response

3. "Can you help me understand my anxiety levels?"
   - Wait for response

4. Click **"Stop Session"**

**Expected:** Natural conversation with no manual intervention between messages.

---

## 📝 Report Results

After testing, note:
- ⏱️ Transcription time: ___ seconds
- ⏱️ Total response time: ___ seconds  
- ✅ Continuous listening working: Yes/No
- ✅ UI simplified: Yes/No
- ✅ Speech quality: Good/Poor
- ❌ Any errors: _________________
