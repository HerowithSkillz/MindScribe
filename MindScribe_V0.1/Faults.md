# MindScribe V0.1 - Fault Analysis Report

**Analysis Date:** January 6, 2026  
**WebLLM Version:** @mlc-ai/web-llm v0.2.75  
**Documentation Reference:** https://webllm.mlc.ai/docs/

---

## 🔴 CRITICAL FAULTS

### 1. **Incorrect AppConfig Structure in webllm.js**

**Location:** `src/services/webllm.js` (Lines 149-164)

**Issue:**  
The custom `APP_CONFIG` object uses incorrect field names that don't match WebLLM's official API specification.

**Current Code:**
```javascript
appConfig: {
  model_list: APP_CONFIG.model_list,  // ❌ Wrong field name
  useCache: true,                      // ❌ Wrong field name
  cacheAdapter: "cache"                // ❌ Wrong field name
}
```

**According to WebLLM Docs:**
The correct field is `useIndexedDBCache` (or just pass the custom model list directly):

```javascript
// Correct implementation:
appConfig: {
  model_list: APP_CONFIG.model_list
}
```

**Impact:**  
- Custom model configuration may be ignored
- Caching settings (`useCache`, `cacheAdapter`) are invalid and have no effect
- Models might not load from the specified HuggingFace URLs

**Fix:**
```javascript
this.engine = await CreateWebWorkerMLCEngine(
  this.worker,
  this.modelId,
  {
    initProgressCallback: (progress) => {
      if (onProgress) onProgress(progress);
    },
    logLevel: 'WARN',
    appConfig: {
      model_list: APP_CONFIG.model_list
    }
  }
);
```

---

### 2. **Custom Model URLs Not Using WebLLM Prebuilt Models**

**Location:** `src/services/webllm.js` (Lines 5-21)

**Issue:**  
The code manually defines HuggingFace model URLs and WASM library paths, which may not be compatible with the installed WebLLM version (v0.2.75).

**Current Code:**
```javascript
const APP_CONFIG = {
  model_list: [
    {
      "model": "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC",
      "model_id": "Llama-3.2-1B-Instruct-q4f16_1-MLC",
      "model_lib": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0.2.48/Llama-3.2-1B-Instruct-q4f16_1-ctx4k-webgpu.wasm",
      // ❌ Hardcoded WASM path for v0.2.48, but package is v0.2.75
```

**According to WebLLM Docs:**
WebLLM provides prebuilt model configurations via `webllm.prebuiltAppConfig.model_list`. Custom model definitions should:
1. Use the correct WASM library version matching the installed package
2. Follow the exact model record schema

**Recommended Approach:**
```javascript
import * as webllm from "@mlc-ai/web-llm";

// Use prebuilt models instead of custom URLs:
const engine = await CreateWebWorkerMLCEngine(
  worker,
  "Llama-3.2-1B-Instruct-q4f16_1-MLC" // WebLLM will handle the URLs
);
```

**Impact:**  
- Version mismatch between WASM lib (v0.2.48) and package (v0.2.75)
- Potential model loading failures
- Increased maintenance burden

---

### 3. **No Error Recovery for Model Loading Failures**

**Location:** `src/contexts/WebLLMContext.jsx` (Lines 73-95)

**Issue:**  
When model initialization fails, the error is logged but the UI remains in a broken state with no retry mechanism.

**Current Code:**
```javascript
try {
  await webLLMService.initialize((progressReport) => {
    setProgress({...});
  });
  setIsInitialized(true);
} catch (err) {
  console.error('WebLLM initialization failed:', err);
  setError(err.message || 'Failed to initialize AI model');
  // ❌ No retry button, no fallback model, no recovery
} finally {
  setIsLoading(false);
}
```

**According to Best Practices:**
WebLLM model loading can fail due to:
- Network interruptions during download
- Insufficient VRAM
- Browser incompatibility
- Cache corruption

**Recommended Fix:**
```javascript
const initialize = useCallback(async (retryCount = 0) => {
  try {
    await webLLMService.initialize((progressReport) => {...});
    setIsInitialized(true);
    setError(null);
  } catch (err) {
    if (retryCount < 2) {
      // Auto-retry with exponential backoff
      setTimeout(() => initialize(retryCount + 1), 2000 * (retryCount + 1));
    } else {
      setError({
        message: err.message,
        canRetry: true,
        suggestModelChange: true
      });
    }
  }
}, []);
```

---

### 4. **Hardcoded Encryption Salt - Security Vulnerability**

**Location:** `src/services/storage.js` (Line 41)

**Issue:**  
The encryption salt is hardcoded and shared across all users, which severely weakens the encryption.

**Current Code:**
```javascript
salt: encoder.encode('mindscribe-salt-2025'), // ❌ Same salt for everyone
```

**Security Impact:**
- Rainbow table attacks possible
- If one user's password is cracked, all users with the same password are compromised
- Does not follow PBKDF2 best practices

**Recommended Fix:**
```javascript
// Generate unique salt per user during registration
const userSalt = crypto.getRandomValues(new Uint8Array(16));
await userStorage.save(`salt_${username}`, Array.from(userSalt));

// Use user-specific salt for key derivation
const saltArray = await userStorage.get(`salt_${username}`);
const salt = new Uint8Array(saltArray);
```

---

### 5. **Missing Model Unload on Component Unmount**

**Location:** `src/contexts/WebLLMContext.jsx`

**Issue:**  
The `WebLLMProvider` doesn't clean up the AI model when the component unmounts, leading to memory leaks.

**Current Code:**
```javascript
export const WebLLMProvider = ({ children }) => {
  // ... state and functions
  
  // ❌ No useEffect cleanup for unmount
  
  return <WebLLMContext.Provider value={value}>{children}</WebLLMContext.Provider>;
};
```

**According to React Best Practices:**
Heavy resources like AI models should be released on unmount.

**Recommended Fix:**
```javascript
export const WebLLMProvider = ({ children }) => {
  // ... existing code
  
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      webLLMService.unloadModel().catch(err => 
        console.warn('Cleanup error:', err)
      );
    };
  }, []);
  
  return <WebLLMContext.Provider value={value}>{children}</WebLLMContext.Provider>;
};
```

---

## ⚠️ HIGH PRIORITY ISSUES

### 6. **Race Condition in Model Selection**

**Location:** `src/contexts/WebLLMContext.jsx` (Lines 31-42)

**Issue:**  
The `selectModel` function doesn't wait for the model to unload before marking it as changed, creating a race condition.

**Current Code:**
```javascript
const selectModel = useCallback((modelId) => {
  try {
    webLLMService.setModel(modelId); // ❌ Async operation not awaited
    const currentModelId = webLLMService.getCurrentModel();
    const models = webLLMService.getAvailableModels();
    const currentModelObj = models.find(m => m.id === currentModelId);
    setCurrentModel(currentModelObj);
  } catch (err) {
    console.error('Failed to select model:', err);
    throw err;
  }
}, []);
```

**In webllm.js:**
```javascript
async setModel(modelId) {
  // ... validation
  await this.unloadModel(); // ❌ This is async!
  this.modelId = modelId;
  // Requires re-initialization
}
```

**Fix:**
```javascript
const selectModel = useCallback(async (modelId) => {
  try {
    setIsLoading(true);
    await webLLMService.setModel(modelId);
    setIsInitialized(false); // Model needs reinitialization
    const models = webLLMService.getAvailableModels();
    const currentModelObj = models.find(m => m.id === modelId);
    setCurrentModel(currentModelObj);
  } catch (err) {
    console.error('Failed to select model:', err);
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
}, []);
```

---

### 7. **Incorrect Stop Token Configuration**

**Location:** `src/services/webllm.js` (Line 236)

**Issue:**  
Stop tokens include lowercase variants that may not match the model's actual output format.

**Current Code:**
```javascript
stop: ["<|eot_id|>", "<|start_header_id|>", "<|end_header_id|>", "user:", "User:", "\nUser"]
```

**According to WebLLM/LLaMA Documentation:**
- Stop tokens are case-sensitive
- Llama 3 uses specific special tokens that should be checked against the model's tokenizer config
- Including generic strings like "user:" can cause premature stopping

**Recommended:**
```javascript
stop: ["<|eot_id|>", "<|end_of_text|>"] // Only model-specific tokens
```

---

### 8. **Missing Stream Cleanup on Error**

**Location:** `src/pages/Chat.jsx` (Lines 137-157)

**Issue:**  
When streaming fails, the animation frame and stream buffer aren't properly cleaned up.

**Current Code:**
```javascript
} catch (error) {
  console.error('Chat error:', error);
  if (error.message === "Request cancelled") {
    setStreamingMessage('');
    streamBufferRef.current = '';
    // ❌ Animation frame not cancelled
  }
```

**Fix:**
```javascript
} catch (error) {
  console.error('Chat error:', error);
  
  // Always cleanup streaming state
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }
  setStreamingMessage('');
  streamBufferRef.current = '';
  
  if (error.message !== "Request cancelled") {
    const errorMessage = {...};
    setMessages([...newMessages, errorMessage]);
  }
}
```

---

### 9. **Inconsistent Model ID Format**

**Location:** `src/services/webllm.js` (Lines 6-10, 38-56)

**Issue:**  
Model IDs in APP_CONFIG don't match the UI-friendly list, causing confusion.

**APP_CONFIG:**
```javascript
"model_id": "Llama-3.2-1B-Instruct-q4f16_1-MLC"
```

**availableModels:**
```javascript
id: "Llama-3.2-1B-Instruct-q4f16_1-MLC" // ✅ Matches
```

**But:**
```javascript
"model_id": "Phi-3.5-mini-instruct-q4f16_1-MLC" // In APP_CONFIG
// vs
id: "Phi-3.5-mini-instruct-q4f16_1-MLC" // In availableModels - OK
```

**Issue:**  
If model IDs don't exactly match WebLLM's prebuilt names, loading will fail. The current implementation assumes custom URLs work, but WebLLM v0.2.75 may require exact prebuilt model names.

---

### 10. **No WebGPU Capability Detection**

**Location:** `src/services/webllm.js`

**Issue:**  
The code tries to initialize WebLLM without checking if WebGPU is available, leading to cryptic errors.

**Current Implementation:**
```javascript
async initialize(onProgress) {
  // ❌ Directly attempts to create engine
  this.engine = await CreateWebWorkerMLCEngine(...);
}
```

**According to WebLLM Requirements:**
WebLLM requires WebGPU support (Chrome 113+, Edge 113+).

**Recommended Fix:**
```javascript
async initialize(onProgress) {
  // Check WebGPU support
  if (!navigator.gpu) {
    throw new Error(
      'WebGPU is not supported in your browser. Please use Chrome 113+ or Edge 113+.'
    );
  }
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('No WebGPU adapter found. Your GPU may not support WebGPU.');
    }
    
    // Now safe to initialize
    this.engine = await CreateWebWorkerMLCEngine(...);
  } catch (error) {
    // Provide user-friendly error messages
    throw new Error(`WebLLM initialization failed: ${error.message}`);
  }
}
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 11. **Inefficient Cache Purging**

**Location:** `src/services/webllm.js` (Lines 377-385)

**Issue:**  
The `purgeUnusedModels` function iterates through all caches and deletes them one by one, which is inefficient.

**Current Code:**
```javascript
async purgeUnusedModels() {
  const cachesList = await this.checkCache();
  for (const cache of cachesList) {
    if (!cache.name.includes(this.modelId)) {
      await this.deleteModelFromCache(cache.name);
    }
  }
}
```

**Issue:**  
- Sequential deletion is slow
- No user feedback during deletion
- Doesn't check cache size before deleting

**Recommended:**
```javascript
async purgeUnusedModels() {
  const cachesList = await this.checkCache();
  const toDelete = cachesList.filter(cache => 
    !cache.name.includes(this.modelId)
  );
  
  // Delete in parallel
  await Promise.all(
    toDelete.map(cache => this.deleteModelFromCache(cache.name))
  );
  
  this.addDebugLog('success', `Purged ${toDelete.length} unused model(s)`);
}
```

---

### 12. **Password Security Weakness**

**Location:** `src/services/auth.js` (Lines 109-118)

**Issue:**  
Password hashing uses a simple Web Crypto hash, which is vulnerable to brute-force attacks.

**Current Code:**
```javascript
async hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Issue:**  
- No salt (different from the encryption salt issue)
- No iteration count (single SHA-256 is too fast)
- Identical passwords produce identical hashes

**Recommended:**
Use PBKDF2 with per-user salt (similar to encryption key derivation):
```javascript
async hashPassword(password, userSalt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: userSalt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

---

### 13. **Missing Abort Controller Cleanup**

**Location:** `src/services/webllm.js` (Line 214)

**Issue:**  
The `cancelChat` method doesn't exist in the WebLLMService class.

**In WebLLMContext:**
```javascript
const cancelChat = useCallback(() => {
  return webLLMService.cancelChat(); // ❌ This method is not defined!
}, []);
```

**In webllm.js:**
```javascript
// Missing implementation
```

**Recommended Fix:**
```javascript
cancelChat() {
  if (this.abortController) {
    this.abortController.abort();
    this.addDebugLog('warning', 'Chat request cancelled by user');
    return true;
  }
  return false;
}
```

---

### 14. **Journal Analysis Parsing Too Lenient**

**Location:** `src/services/webllm.js` (Lines 303-343)

**Issue:**  
The `parseAnalysisResponse` function uses regex patterns that may not match the actual LLM output format, leading to incorrect parsing.

**Current Code:**
```javascript
const moodPatterns = [/\bmood[:\s]+([a-z]+)/i, /\bemotion[:\s]+([a-z]+)/i];
```

**Issue:**  
- LLMs may not output in the expected "key: value" format
- The prompt asks for "JSON only" but doesn't enforce it
- Fallback values may mask LLM failures

**Recommended Approach:**
```javascript
// Enforce JSON response with explicit formatting
const messages = [
  {
    role: 'system',
    content: 'You are a JSON-only API. Output valid JSON with no extra text.'
  },
  {
    role: 'user',
    content: `Analyze this journal entry and respond with ONLY this JSON structure:
{
  "mood": "one_word_lowercase",
  "sentiment": number_0_to_10,
  "stressLevel": "low|medium|high",
  "summary": "brief_text_max_50_chars"
}

Entry: "${journalText}"`
  }
];

// Parse response with strict JSON parsing
try {
  const analysis = JSON.parse(response);
  // Validate structure
  if (!analysis.mood || typeof analysis.sentiment !== 'number') {
    throw new Error('Invalid analysis structure');
  }
  return analysis;
} catch (parseError) {
  // Fall back to regex parsing only as last resort
  return this.parseAnalysisResponse(response, journalText);
}
```

---

### 15. **Hardware Check Not Used Effectively**

**Location:** `src/services/webllm.js` (Lines 137-140)

**Issue:**  
Hardware tier detection is performed but not used to automatically select appropriate models.

**Current Code:**
```javascript
try {
   const hw = await getHardwareTier();
   this.addDebugLog('info', `Hardware Tier: ${hw.tier}`);
} catch (e) { console.warn('HW check skipped'); }
// ❌ Hardware tier info is logged but not used
```

**Recommended Enhancement:**
```javascript
try {
  const hw = await getHardwareTier();
  this.addDebugLog('info', `Hardware Tier: ${hw.tier}`);
  
  // Auto-select appropriate model if not already set
  if (!localStorage.getItem('mindscribe_selected_model')) {
    this.modelId = hw.recommendedModel || this.modelId;
    this.addDebugLog('info', `Auto-selected model: ${this.modelId}`);
  }
  
  // Warn if current model exceeds hardware capability
  const currentModel = this.availableModels.find(m => m.id === this.modelId);
  if (hw.tier === 'low' && currentModel.size.includes('2GB')) {
    this.addDebugLog('warning', 
      'Selected model may be too large for your hardware. Consider switching to a smaller model.'
    );
  }
} catch (e) { 
  console.warn('HW check skipped');
}
```

---

## 🔵 LOW PRIORITY / OPTIMIZATION SUGGESTIONS

### 16. **Redundant Model Service Files**

**Location:** `src/services/`

**Issue:**  
Three WebLLM service files exist with overlapping functionality:
- `webllm.js` (396 lines) - Primary implementation
- `webllm-optimized.js` - Duplicate?
- `webllm-backup.js` - Old version?

**Impact:**  
- Confusion for developers
- Maintenance overhead
- Risk of using wrong file

**Recommendation:**  
Remove unused files or document their purpose clearly.

---

### 17. **No Progressive Model Loading UI**

**Issue:**  
While progress callbacks exist, the UI doesn't show detailed download stages (fetching, caching, loading).

**Enhancement:**
```javascript
initProgressCallback: (progress) => {
  // Enhanced progress reporting
  const stage = progress.text.toLowerCase();
  let displayText = progress.text;
  
  if (stage.includes('download')) {
    displayText = `📥 Downloading model... ${Math.round(progress.progress * 100)}%`;
  } else if (stage.includes('load')) {
    displayText = `⚡ Loading into memory... ${Math.round(progress.progress * 100)}%`;
  }
  
  onProgress({ ...progress, displayText });
}
```

---

### 18. **Missing Usage Statistics**

**Issue:**  
WebLLM's chat completion responses include usage statistics (tokens), but these aren't stored or displayed.

**Location:** `src/pages/Chat.jsx`

**Enhancement:**
```javascript
const aiMessage = {
  role: 'assistant',
  content: aiResponse,
  timestamp: new Date().toISOString(),
  usage: {
    prompt_tokens: responseObj.usage?.prompt_tokens,
    completion_tokens: responseObj.usage?.completion_tokens,
    total_tokens: responseObj.usage?.total_tokens
  }
};
```

---

### 19. **No Model Preloading Strategy**

**Issue:**  
Models are loaded only when first needed, causing initial delays.

**Recommendation:**
Implement background preloading on app load:
```javascript
// In App.jsx
useEffect(() => {
  // Preload model in background after 2 seconds
  const timer = setTimeout(() => {
    if (!isInitialized && !isLoading) {
      initialize();
    }
  }, 2000);
  
  return () => clearTimeout(timer);
}, []);
```

---

### 20. **Inconsistent Error Messages**

**Issue:**  
Error messages across the app vary in format and detail.

**Examples:**
- "AI is busy. Please try again."
- "Model not initialized."
- "Failed to initialize AI model"

**Recommendation:**  
Create a centralized error message system:
```javascript
const ERROR_MESSAGES = {
  MODEL_NOT_INITIALIZED: {
    user: "The AI model is still loading. Please wait a moment.",
    dev: "Model not initialized"
  },
  MODEL_BUSY: {
    user: "The AI is currently processing. Please wait or cancel the current request.",
    dev: "Task queue timeout"
  }
  // ... more standardized errors
};
```

---

## 📊 SUMMARY STATISTICS

| Severity | Count | Critical Path? |
|----------|-------|----------------|
| 🔴 Critical | 5 | ✅ Yes |
| ⚠️ High | 5 | ✅ Yes |
| 🟡 Medium | 5 | ⚠️ Partial |
| 🔵 Low | 5 | ❌ No |
| **Total** | **20** | **10 Critical Path** |

---

## 🎯 RECOMMENDED FIX PRIORITY

### Immediate (Before Production):
1. ✅ Fix AppConfig structure (#1)
2. ✅ Add WebGPU detection (#10)
3. ✅ Fix security vulnerabilities (#4, #12)
4. ✅ Add error recovery (#3)
5. ✅ Fix race conditions (#6)

### Short Term (Next Sprint):
6. ✅ Implement `cancelChat()` method (#13)
7. ✅ Fix stream cleanup (#8)
8. ✅ Add component unmount cleanup (#5)
9. ✅ Use WebLLM prebuilt models (#2)

### Medium Term (Optimization):
10. ✅ Improve journal parsing (#14)
11. ✅ Use hardware detection (#15)
12. ✅ Optimize cache management (#11)

### Long Term (Nice to Have):
13. ✅ Add usage statistics (#18)
14. ✅ Implement model preloading (#19)
15. ✅ Clean up redundant files (#16)

---

## 🔗 REFERENCES

1. **WebLLM Official Documentation:**  
   https://webllm.mlc.ai/docs/

2. **WebLLM API Reference:**  
   https://webllm.mlc.ai/docs/user/api_reference.html

3. **WebLLM GitHub Examples:**  
   https://github.com/mlc-ai/web-llm/tree/main/examples

4. **WebLLM Prebuilt Models:**  
   https://github.com/mlc-ai/web-llm/blob/main/src/config.ts

5. **WebGPU Compatibility:**  
   https://caniuse.com/webgpu

---

**Report Generated By:** Claude Sonnet 4.5  
**Analysis Tool:** Manual code review + WebLLM documentation cross-reference  
**Last Updated:** January 6, 2026
