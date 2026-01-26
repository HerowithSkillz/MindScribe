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

### 6. **Aggressive Cache Purging on Every Model Initialization** ✅ FIXED

**Location:** `src/services/webllm.js` (Previously Line 268)

**Issue:**  
The service was calling `purgeUnusedModels()` immediately after every successful model initialization. This deleted cached models that didn't match the current modelId, forcing users to re-download models when switching between them (e.g., 1B ↔ 3B) and even on project restarts.

**Fix Implemented (January 26, 2026):**
- Removed aggressive cache purging after initialization
- Added cache detection logging to show when models load from cache
- Models now persist across project restarts and allow instant switching

---

### 7. **Model Not Re-initializing After Logout/Login** ✅ FIXED

**Location:** `src/contexts/WebLLMContext.jsx` (Line 93), `src/contexts/AuthContext.jsx` (Line 108)

**Issue:**  
Critical bug where the AI model would not re-initialize when users logged back in after logging out:
1. First login → Model loads successfully ✓
2. User logs out → Model unloads successfully ✓
3. User logs back in → **Model DOES NOT reload** ❌

**Root Cause:**
The `initialize()` function had a guard clause `if (isInitialized || isLoading) return;` that prevented re-initialization. After logout, even though the model was unloaded, the `isInitialized` flag wasn't properly reset, blocking the next initialization attempt.

**Additional Issue:**
No blocking UI during model initialization, allowing users to interact with non-functional AI features before the model was ready.

**Fix Implemented (January 26, 2026):**

**Changes Made:**

1. **Fixed Initialization Guard (WebLLMContext.jsx, Lines 93-96):**
```javascript
// ❌ OLD CODE:
if (isInitialized || isLoading) return;

// ✅ NEW CODE:
if (isLoading) {
  console.log('Initialization already in progress, skipping duplicate call');
  return;
}
// Only block if loading, allow re-init after logout
```

2. **Added State Reset on Logout (AuthContext.jsx, Lines 120-124):**
```javascript
// CRITICAL: Reset WebLLM context state to allow re-initialization on next login
// This ensures the model can be reloaded when user logs back in
if (window.webLLMResetState) {
  window.webLLMResetState();
}
```

3. **Added Global State Reset Function (WebLLMContext.jsx, Lines 87-95):**
```javascript
const resetState = useCallback(() => {
  // Reset all state to allow fresh initialization
  setIsInitialized(false);
  setIsLoading(false);
  setProgress({ text: '', progress: 0, timeElapsed: 0 });
  setError(null);
  setRetryCount(0);
  setShowLoadingModal(false);
  console.log('WebLLM context state reset for re-initialization');
}, []);

// Expose globally for AuthContext to call on logout
useEffect(() => {
  window.webLLMResetState = resetState;
  return () => { delete window.webLLMResetState; };
}, [resetState]);
```

4. **Added Blocking Loading Modal (WebLLMContext.jsx, ModelInitializationModal.jsx):**
```javascript
const [showLoadingModal, setShowLoadingModal] = useState(false);

// Show modal during initialization
setShowLoadingModal(true);

// Hide modal after success
setTimeout(() => setShowLoadingModal(false), 500);
```

**Benefits:**
- ✅ **Re-initialization Works:** Model properly reloads on every login
- ✅ **State Reset:** Clean state on logout prevents stale flags
- ✅ **Blocking UI:** Modal prevents interaction until model is ready
- ✅ **Better UX:** Users can't access broken AI features during loading
- ✅ **Proper Cleanup:** Model unloads on logout, reloads on login

**Verification:**
1. Login → Model initializes → See loading modal → Modal disappears when ready
2. Logout → Model unloads → State resets
3. Login again → Model re-initializes successfully → Loading modal shows again
4. Try clicking UI during loading → Blocked by modal backdrop

---

## 🔵 LOW PRIORITY / OPTIMIZATION SUGGESTIONS

---

### 8. **Missing Usage Statistics**

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

### 9. **No Model Preloading Strategy**

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

### 10. **Inconsistent Error Messages**

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

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 5 | ⚠️ Needs Attention |
| ✅ Critical (Fixed) | 2 | Issues #6-#7 Resolved |
| 🔵 Low | 3 | 💡 Optional Enhancement |
| **Total** | **10** | **5 Critical + 2 Fixed + 3 Optional** |

---

## 🎯 RECOMMENDED FIX PRIORITY

### Immediate (Before Production):
1. ❌ Fix AppConfig structure (#1)
2. ❌ Use WebLLM prebuilt models (#2)
3. ❌ Add error recovery (#3)
4. ❌ Fix security vulnerabilities (#4, #5)
5. ✅ ~~Fix aggressive cache purging (#6)~~ - **FIXED** ✅
6. ✅ ~~Fix model re-initialization after logout (#7)~~ - **FIXED** ✅

### Long Term (Nice to Have):
7. 💡 Add usage statistics (#8)
8. 💡 Implement model preloading (#9)
9. 💡 Standardize error messages (#10)

---

## ✅ COMPLETED ISSUES

### Recently Fixed (January 26, 2026):
- **Issue #6:** Aggressive Cache Purging - Models now persist across project restarts and model switches
- **Issue #7:** Model Re-initialization Bug - Fixed model not reloading after logout/login cycle, added blocking UI during initialization

### Previously Fixed (Issues #6-#17):
The following issues were successfully resolved in earlier iterations:
- **#6-#10:** High priority fixes (race conditions, stop tokens, stream cleanup, model IDs, WebGPU detection)
- **#11-#15:** Medium priority fixes (cache purging, password security, abort controller, journal parsing, hardware check)
- **#16-#17:** Low priority fixes (redundant files cleanup, progressive loading UI)

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
