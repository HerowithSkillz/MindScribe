import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { getHardwareTier } from '../utils/hardwareCheck';
import { getErrorMessage, logError, createError } from '../constants/errorMessages';

// ✅ FIXED: Use WebLLM's built-in prebuilt models instead of custom URLs
// According to docs: https://webllm.mlc.ai/docs/user/basic_usage.html#model-records-in-webllm
// WebLLM v0.2.75 has its own model registry with correct WASM library versions
// Just pass the model_id and WebLLM handles everything automatically

class WebLLMService {
  constructor() {
    this.engine = null;
    this.worker = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.abortController = null;
    this.isProcessing = false;
    this.taskQueue = [];
    this.debugLogs = [];
    this.maxDebugLogs = 100;
    this.hardwareTier = null; // Issue #15: Store hardware tier for reference
    
    // Default to the Lite model (Llama 3.2 1B) - matches WebLLM prebuilt config
    // Model IDs must exactly match those in: https://github.com/mlc-ai/web-llm/blob/main/src/config.ts
    this.modelId = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
    
    // UI-Friendly List - FIXED: Exact match with WebLLM v0.2.75 prebuilt models
    // Source: https://github.com/mlc-ai/web-llm/blob/main/src/config.ts#L300-L400
    this.availableModels = [
      {
        id: "Llama-3.2-1B-Instruct-q4f32_1-MLC", // ✅ Exact prebuilt model_id
        name: "Llama 3.2 1B (Lite)",
        size: "~1.1GB",
        speed: "Very Fast",
        quality: "Good",
        description: "Fastest model. Best for standard laptops.",
        recommended: true
      },
      {
        id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", // ✅ Exact prebuilt model_id
        name: "Llama 3.2 3B",
        size: "~1.9GB (2.26GB VRAM)",
        speed: "Fast",
        quality: "Better",
        description: "Balanced performance. Good for most use cases."
      }
    ];

    this.systemPrompt = `You are MindScribe, a supportive mental health companion.
Instructions:
- Keep answers short (2-3 sentences).
- Be empathetic but concise.
- Stop speaking immediately after your turn.
- Do NOT generate text for the User.`;
    
    this.dassBaseline = null; // Store DASS-21 baseline for context
  }

  // Set DASS-21 baseline assessment results
  setDassBaseline(dassResults) {
    this.dassBaseline = dassResults;
    this.updateSystemPrompt();
  }

  // Update system prompt with DASS-21 context
  updateSystemPrompt() {
    let basePrompt = `You are MindScribe, a supportive mental health companion.
Instructions:
- Keep answers short (2-3 sentences).
- Be empathetic but concise.
- Stop speaking immediately after your turn.
- Do NOT generate text for the User.`;

    if (this.dassBaseline) {
      const { scores, severityLevels } = this.dassBaseline;
      basePrompt += `\n\nUser's DASS-21 Baseline Assessment:
- Depression: ${scores.depression}/42 (${severityLevels.depression.level})
- Anxiety: ${scores.anxiety}/42 (${severityLevels.anxiety.level})
- Stress: ${scores.stress}/42 (${severityLevels.stress.level})

Tailor your responses based on this baseline. Be particularly mindful of their ${
  severityLevels.depression.level !== 'Normal' ? 'depression' :
  severityLevels.anxiety.level !== 'Normal' ? 'anxiety' :
  severityLevels.stress.level !== 'Normal' ? 'stress' : 'overall well-being'
} levels.`;
    }

    this.systemPrompt = basePrompt;
  }

  // --- LOGGING & STATE MANAGEMENT ---
  
  addDebugLog(type, message, data = null) {
    const emoji = {
      'info': 'ℹ️', 'error': '❌', 'warning': '⚠️', 'success': '✅', 'task': '📋'
    }[type] || '📝';

    const log = { timestamp: Date.now(), type, emoji, message, data };
    this.debugLogs.push(log);
    
    if (this.debugLogs.length > this.maxDebugLogs) this.debugLogs.shift();
    
    // Console output with colors
    const style = {
      'info': 'color: #3b82f6', 'error': 'color: #ef4444', 
      'warning': 'color: #f59e0b', 'success': 'color: #10b981', 'task': 'color: #8b5cf6'
    }[type] || 'color: #6b7280';
    
    console.log(`%c${emoji} [${type.toUpperCase()}] ${message}`, style, data || '');
    
    try {
        window.dispatchEvent(new CustomEvent('webllm-debug', { detail: log }));
    } catch (e) { /* ignore */ }
    
    return log;
  }

  getDebugLogs() { return [...this.debugLogs]; }
  clearDebugLogs() { this.debugLogs = []; this.addDebugLog('info', 'Debug logs cleared'); }
  getAvailableModels() { return this.availableModels; }
  getCurrentModel() { return this.modelId; }
  getHardwareTier() { return this.hardwareTier; } // Issue #15: Expose hardware tier for UI display
  
  // Validate model ID exists in availableModels (prevents loading removed/invalid models)
  isValidModelId(modelId) {
    return this.availableModels.some(m => m.id === modelId);
  }

  async waitForProcessing() {
    const maxWaitTime = 60000; // 60s timeout
    const checkInterval = 100;
    let elapsed = 0;

    while (this.isProcessing && elapsed < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    if (this.isProcessing) {
      const error = getErrorMessage('MODEL', 'ALREADY_BUSY');
      this.addDebugLog('error', error.dev);
      throw createError('MODEL', 'ALREADY_BUSY');
    }
  }

  async setModel(modelId) {
    // Validate model ID exists in availableModels (prevents invalid models)
    if (!this.isValidModelId(modelId)) {
      const availableIds = this.availableModels.map(m => m.id).join(', ');
      throw new Error(
        `Invalid model ID: "${modelId}". Available models: ${availableIds}`
      );
    }
    
    if (modelId === this.modelId) return;
    this.addDebugLog('task', `Switching model to ${modelId}...`);
    this.modelId = modelId;
    localStorage.setItem('mindscribe_selected_model', modelId);
    await this.unloadModel();
    // Requires re-initialization
  }

  // --- INITIALIZATION LOGIC ---

  async initialize(onProgress) {
    if (this.isInitialized) return;
    if (this.isLoading) return;

    this.isLoading = true;
    this.addDebugLog('task', `Initializing AI Engine (${this.modelId})...`);

    try {
      // 0. Check WebGPU Support (Issue #10 fix)
      if (!navigator.gpu) {
        throw createError('BROWSER', 'WEBGPU_NOT_SUPPORTED');
      }
      
      // 0.1 Verify WebGPU Adapter (functional check)
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          throw createError('BROWSER', 'WEBGPU_ADAPTER_UNAVAILABLE');
        }
      } catch (adapterErr) {
        const error = getErrorMessage('BROWSER', 'WEBGPU_INIT_FAILED');
        throw new Error(`${error.user} (${adapterErr.message})`);
      }

      // 1. Hardware Check & Smart Model Selection (Issue #15 Enhancement)
      try {
         const hw = await getHardwareTier();
         this.hardwareTier = hw.tier; // Store for reference
         this.addDebugLog('info', `Hardware Tier: ${hw.tier}`);
         
         // Issue #15 fix: Auto-select appropriate model on first launch
         const storedModelId = localStorage.getItem('mindscribe_selected_model');
         
         if (!storedModelId) {
           // First-time user - use hardware-recommended model
           this.modelId = hw.recommendedModel || this.modelId;
           this.addDebugLog('info', `Auto-selected model for ${hw.tier} tier hardware: ${this.modelId}`);
         } else if (this.isValidModelId(storedModelId)) {
           // Returning user with valid model preference
           this.modelId = storedModelId;
           this.addDebugLog('info', `Using user-selected model: ${this.modelId}`);
         } else {
           // Invalid/removed model in localStorage (e.g., Phi-3 from old version)
           this.addDebugLog('warning', 
             `⚠️ Model "${storedModelId}" is no longer available. Auto-selecting appropriate model for your hardware.`
           );
           localStorage.removeItem('mindscribe_selected_model'); // Clean up invalid entry
           this.modelId = hw.recommendedModel || this.modelId;
           this.addDebugLog('info', `Auto-selected model for ${hw.tier} tier hardware: ${this.modelId}`);
         }
         
         // Issue #15 fix: Validate model vs hardware capability
         const currentModel = this.availableModels.find(m => m.id === this.modelId);
         if (currentModel) {
           // Warn if 3B model on low/medium hardware
           if ((hw.tier === 'low' || hw.tier === 'medium') && currentModel.id.includes('3B')) {
             this.addDebugLog('warning', 
               `⚠️ ${currentModel.name} (${currentModel.size}) may run slowly on ${hw.tier} tier hardware. ` +
               `Consider switching to Llama 3.2 1B (~1.1GB) for better performance.`
             );
           }
           
           // Suggest better model for high-end hardware
           if (hw.tier === 'high' && currentModel.id.includes('1B')) {
             this.addDebugLog('info',
               `💡 Your ${hw.tier} tier hardware can handle larger models. ` +
               `Consider trying Llama 3.2 3B (~1.9GB) for improved response quality.`
             );
           }
         }
         
      } catch (e) { 
        console.warn('HW check skipped:', e); 
        this.hardwareTier = 'unknown';
        // Fallback to default model already set in constructor
      }

      // 2. Worker Creation
      this.worker = new Worker(
        new URL('../workers/webllm.worker.js', import.meta.url),
        { type: 'module' }
      );

      // 3. Check if model is already cached (Issue #6 fix)
      const cachedModels = await this.checkCache();
      const isModelCached = cachedModels.some(cache => 
        cache.name && (cache.name.includes(this.modelId) || cache.name.includes('webllm'))
      );
      
      // Get model info for logging
      const selectedModel = this.availableModels.find(m => m.id === this.modelId);
      const modelSize = selectedModel?.size || '1-2GB';
      
      if (isModelCached) {
        this.addDebugLog('success', `✅ Found cached model: ${this.modelId}. Loading from cache...`);
      } else {
        this.addDebugLog('info', `⬇️ Model not cached. Downloading ${this.modelId} (~${modelSize})...`);
      }

      // 4. Engine Creation - Let WebLLM Handle Model URLs
      // According to WebLLM docs: https://webllm.mlc.ai/docs/user/basic_usage.html
      // Simply pass the model ID - WebLLM's prebuilt config handles everything
      // This ensures version compatibility (v0.2.79) and automatic caching
      this.engine = await CreateWebWorkerMLCEngine(
        this.worker,
        this.modelId,
        {
          initProgressCallback: (progress) => {
            if (onProgress) onProgress(progress);
          },
          logLevel: 'WARN'
        }
      );

      this.isInitialized = true;
      this.isLoading = false;
      this.addDebugLog('success', `✅ Model initialized successfully and ready to use!`);
      
      // Issue #6 FIX: Removed aggressive cache purging
      // Previously: this.purgeUnusedModels() was called here, which deleted all other model caches
      // This caused re-downloads every time users switched models or restarted the project
      // Now: Let the browser manage cache automatically (browsers support 50GB+ cache storage)
      // Users can manually clear cache via Debug page if needed
      // Cache will persist across project restarts and allow instant model switching

    } catch (error) {
      this.isLoading = false;
      this.isInitialized = false;
      
      // Provide helpful error messages for common issues
      let friendlyMessage = error.message;
      if (error.message && error.message.includes('fetch')) {
        friendlyMessage = 'Failed to download model. Please check your internet connection. The model may also be blocked by your firewall or corporate network.';
      } else if (error.message && error.message.includes('WebGPU')) {
        friendlyMessage = 'WebGPU is not supported in your browser. Please use Chrome 113+ or Edge 113+';
      }
      
      this.addDebugLog('error', `Init failed: ${friendlyMessage}`, error);
      throw new Error(friendlyMessage);
    }
  }

  async unloadModel() {
    if (!this.engine) return;
    try {
      if (this.engine) await this.engine.unload();
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      this.engine = null;
      this.isInitialized = false;
      this.addDebugLog('success', 'Model unloaded');
    } catch (error) {
      this.addDebugLog('error', `Unload failed: ${error.message}`);
    }
  }

  // --- CORE CHAT LOGIC ---

  async chat(userMessage, conversationHistory = [], onUpdate) {
    if (!this.engine) throw createError('MODEL', 'NOT_INITIALIZED'); // Issue #20
    
    await this.waitForProcessing();
    this.isProcessing = true;
    this.abortController = new AbortController();

    try {
      // Context Window Management: Prune history if approaching limit
      // Most models have 4096 token context window
      // Rough estimate: 1 token ≈ 0.75 words, so 1 message ≈ 10-20 tokens
      const CONTEXT_WINDOW_SIZE = 4096;
      const SAFETY_BUFFER = 512; // Reserve for system prompt + response
      const MAX_HISTORY_TOKENS = CONTEXT_WINDOW_SIZE - SAFETY_BUFFER;
      
      // Estimate tokens in conversation history
      let estimatedTokens = this.systemPrompt.split(/\s+/).length * 1.3; // System prompt
      estimatedTokens += userMessage.split(/\s+/).length * 1.3; // Current message
      
      // Prune old messages if needed (keep recent context)
      let prunedHistory = [...conversationHistory];
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msgTokens = conversationHistory[i].content.split(/\s+/).length * 1.3;
        if (estimatedTokens + msgTokens > MAX_HISTORY_TOKENS) {
          // Remove oldest messages to fit within context window
          prunedHistory = conversationHistory.slice(i + 1);
          this.addDebugLog('warning', `Pruned ${i + 1} old messages to fit context window`);
          break;
        }
        estimatedTokens += msgTokens;
      }

      const fullMessages = [
        { role: 'system', content: this.systemPrompt },
        ...prunedHistory,
        { role: 'user', content: userMessage }
      ];

      const chunks = await this.engine.chat.completions.create({
        messages: fullMessages,
        temperature: 0.3, // Lower temp = faster, more deterministic generation (was 0.7)
        top_p: 0.9, // Nucleus sampling for quality while maintaining speed
        max_tokens: 512, // Increased for better response completeness (was 350)
        repetition_penalty: 1.0, // Default value, prevents repetitive loops
        stream: true,
        stream_options: { include_usage: true }, // Issue #18 fix: Enable usage statistics in stream
        // Stop tokens are handled automatically by WebLLM from model config
        // Llama 3.2 uses stop_token_ids: [128001, 128008, 128009] from conversation template
        // No custom stop strings needed - removes risk of premature stopping
      });

      let fullResponse = '';
      let usageStats = null; // Issue #18: Capture usage statistics from final chunk
      
      for await (const chunk of chunks) {
        if (this.abortController?.signal.aborted) {
          this.addDebugLog('warning', 'Chat cancelled');
          break;
        }
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        if (onUpdate) onUpdate(content);
        
        // Issue #18: According to WebLLM docs, usage is only in the last chunk
        if (chunk.usage) {
          usageStats = chunk.usage;
          this.addDebugLog('info', `Token usage - Prompt: ${chunk.usage.prompt_tokens}, Completion: ${chunk.usage.completion_tokens}, Total: ${chunk.usage.total_tokens}`);
        }
      }
      
      // Issue #18 fix: Return both response and usage statistics
      return { 
        content: fullResponse, 
        usage: usageStats,
        contextPruned: prunedHistory.length < conversationHistory.length
      };
    } catch (error) {
      this.addDebugLog('error', `Chat error: ${error.message}`);
      
      // Detect context window / memory exhaustion errors
      if (error.message.includes('context_window_size') || 
          error.message.includes('KV cache') ||
          error.message.includes('out of memory') ||
          error.message.includes('OOM')) {
        this.addDebugLog('error', 'Context window exhausted - conversation too long');
        throw new Error('CONTEXT_WINDOW_EXCEEDED: The conversation has become too long. Please clear some chat history.');
      }
      
      throw error;
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  // Issue #13 fix: Missing cancelChat method
  cancelChat() {
    if (this.abortController) {
      this.abortController.abort();
      this.addDebugLog('warning', 'Chat request cancelled by user');
      return true;
    }
    this.addDebugLog('info', 'No active chat to cancel');
    return false;
  }

  /**
   * Generate streaming response with sentence-level callbacks
   * Used for parallel TTS synthesis - sends complete sentences as they're generated
   * 
   * @param {string} userMessage - The user's message
   * @param {Array} conversationHistory - Previous conversation turns
   * @param {Function} onSentence - Callback for each complete sentence (for TTS)
   * @param {Function} onToken - Optional callback for each token (for UI updates)
   * @returns {Promise<string>} - The full response
   */
  async generateStreamingResponse(userMessage, conversationHistory = [], onSentence = null, onToken = null) {
    if (!this.engine) throw createError('MODEL', 'NOT_INITIALIZED');
    
    await this.waitForProcessing();
    this.isProcessing = true;
    this.abortController = new AbortController();

    try {
      this.addDebugLog('task', 'Generating streaming response for voice...');

      const fullMessages = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory.slice(-6), // Keep last 3 exchanges for context
        { role: 'user', content: userMessage }
      ];

      const chunks = await this.engine.chat.completions.create({
        messages: fullMessages,
        temperature: 0.7, // Slightly more varied for natural conversation
        top_p: 0.9,
        max_tokens: 150, // Shorter responses for voice
        stream: true,
      });

      let fullResponse = '';
      let sentenceBuffer = '';
      const sentenceEndPattern = /[.!?]+\s*/;
      
      for await (const chunk of chunks) {
        if (this.abortController?.signal.aborted) {
          this.addDebugLog('warning', 'Streaming cancelled');
          break;
        }
        
        const token = chunk.choices[0]?.delta?.content || '';
        fullResponse += token;
        sentenceBuffer += token;
        
        // Call token callback for real-time UI updates
        if (onToken) onToken(token);
        
        // Check for complete sentences
        const sentences = sentenceBuffer.split(sentenceEndPattern);
        
        // If we have more than one part, we found sentence boundaries
        if (sentences.length > 1) {
          // Send all complete sentences except the last (which may be incomplete)
          for (let i = 0; i < sentences.length - 1; i++) {
            const sentence = sentences[i].trim();
            if (sentence && onSentence) {
              // Add punctuation back if it was stripped
              const punctMatch = sentenceBuffer.match(sentenceEndPattern);
              const punct = punctMatch ? punctMatch[0].trim() : '.';
              const completeSentence = sentence + punct;
              
              this.addDebugLog('info', `[Streaming] Sentence ready: "${completeSentence}"`);
              await onSentence(completeSentence);
            }
          }
          // Keep only the incomplete part
          sentenceBuffer = sentences[sentences.length - 1];
        }
      }
      
      // Send any remaining text as the final sentence
      if (sentenceBuffer.trim() && onSentence) {
        this.addDebugLog('info', `[Streaming] Final sentence: "${sentenceBuffer.trim()}"`);
        await onSentence(sentenceBuffer.trim());
      }
      
      this.addDebugLog('success', `Streaming complete: ${fullResponse.length} chars`);
      return fullResponse;

    } catch (error) {
      this.addDebugLog('error', `Streaming error: ${error.message}`);
      throw error;
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  // --- RESTORED: ROBUST JOURNAL ANALYSIS ---
  
  async analyzeJournal(journalText) {
    if (!this.engine) throw createError('MODEL', 'NOT_INITIALIZED'); // Issue #20
    await this.waitForProcessing();
    this.isProcessing = true;
    this.addDebugLog('task', 'Analyzing journal entry...');

    try {
      // Issue #14 fix: Enforce JSON structure with explicit schema
      const messages = [
        {
          role: 'system',
          content: 'You are a JSON-only API that analyzes journal entries. Output ONLY valid JSON, no other text.'
        },
        {
          role: 'user',
          content: `Analyze this journal entry and respond with ONLY valid JSON in this exact format (no additional text, no markdown):
{
  "emotion": "single_word_lowercase_emotion",
  "sentiment": number_between_0_and_10,
  "stress": "low_or_moderate_or_high",
  "summary": "brief_summary_max_50_chars"
}

Journal Entry: "${journalText}"

JSON Response:`
        }
      ];

      // Issue #14 fix: Use stream: false and response_format for structured output
      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.4,
        max_tokens: 300,
        stream: false, // CRITICAL: Must be false for non-streaming completion
        response_format: { type: "json_object" } // WebLLM 0.2.x: Forces valid JSON output
      });

      const response = completion.choices[0].message.content.trim();
      const usageStats = completion.usage; // Issue #18: Capture usage statistics from non-streaming response
      
      this.addDebugLog('info', 'Raw Analysis Response', { response });
      if (usageStats) {
        this.addDebugLog('info', `Analysis token usage - Prompt: ${usageStats.prompt_tokens}, Completion: ${usageStats.completion_tokens}, Total: ${usageStats.total_tokens}`);
      }
      
      // Issue #14 fix: Strict JSON parsing with validation, fallback to regex only on failure
      try {
        const analysis = JSON.parse(response);
        
        // Validate required fields
        if (!analysis.emotion || typeof analysis.sentiment !== 'number' || !analysis.stress) {
          throw new Error('Invalid JSON structure: missing required fields');
        }
        
        // Validate data types and ranges
        if (analysis.sentiment < 0 || analysis.sentiment > 10) {
          throw new Error('Invalid sentiment value: must be 0-10');
        }
        
        if (!['low', 'moderate', 'high'].includes(analysis.stress)) {
          throw new Error('Invalid stress level: must be low, moderate, or high');
        }
        
        // Add timestamp
        analysis.analyzedAt = new Date().toISOString();
        analysis.usage = usageStats; // Issue #18: Include usage statistics in analysis result
        
        this.addDebugLog('success', 'Journal analyzed successfully (JSON mode)');
        return analysis;
        
      } catch (jsonError) {
        // Fallback to regex parsing only if JSON parsing fails
        this.addDebugLog('warning', `JSON parse failed: ${jsonError.message}, using regex fallback`);
        const analysis = this.parseAnalysisResponse(response, journalText);
        return analysis;
      }
    } catch (error) {
      this.addDebugLog('error', `Analysis error: ${error.message}`);
      // Fallback object to prevent UI crash
      return {
        emotion: 'neutral',
        sentiment: 5,
        stress: 'moderate',
        summary: journalText.substring(0, 50) + '...',
        insight: 'Keep writing to understand your feelings better.',
        error: true
      };
    } finally {
      this.isProcessing = false;
    }
  }

  // --- RESTORED: COMPLEX PARSING LOGIC ---
  // Issue #14 fix: Enhanced fallback parser with better pattern matching
  // Only used when JSON parsing fails (backwards compatibility)
  parseAnalysisResponse(response, journalText) {
    this.addDebugLog('info', 'Using regex fallback parser');
    const lowerResponse = response.toLowerCase();
    
    // 1. Emotion Extraction - try multiple patterns
    let emotion = 'neutral';
    const emotionPatterns = [
      /\bemotio?n[:\s]+([a-z]+)/i,
      /\bmood[:\s]+([a-z]+)/i,
      /\bfeeling[:\s]+([a-z]+)/i,
      /"emotion"\s*:\s*"([^"]+)"/i // JSON-like pattern
    ];
    for (const pattern of emotionPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) { 
        emotion = match[1].toLowerCase(); 
        break; 
      }
    }

    // 2. Sentiment Extraction - try multiple formats
    let sentiment = 5;
    const sentimentPatterns = [
      /sentiment[:\s]+(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*\/\s*10/,
      /"sentiment"\s*:\s*(\d+(?:\.\d+)?)/i // JSON-like pattern
    ];
    for (const pattern of sentimentPatterns) {
      const match = response.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (value >= 0 && value <= 10) {
          sentiment = value;
          break;
        }
      }
    }

    // 3. Stress Level Extraction - improved pattern matching
    let stress = 'moderate';
    if (lowerResponse.includes('high stress') || lowerResponse.includes('stress: high')) {
      stress = 'high';
    } else if (lowerResponse.includes('low stress') || lowerResponse.includes('stress: low')) {
      stress = 'low';
    } else if (lowerResponse.includes('medium') || lowerResponse.includes('moderate')) {
      stress = 'moderate';
    }

    // 4. Summary Extraction - try multiple patterns
    let summary = journalText.substring(0, 50) + '...';
    const summaryPatterns = [
      /summary[:\s]+(.+?)(?:\n|$)/i,
      /"summary"\s*:\s*"([^"]+)"/i // JSON-like pattern
    ];
    for (const pattern of summaryPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        summary = match[1].trim().substring(0, 50);
        break;
      }
    }

    this.addDebugLog('info', 'Fallback parse result', { emotion, sentiment, stress, summary });

    return {
      emotion,
      sentiment,
      stress,
      summary,
      analyzedAt: new Date().toISOString()
    };
  }

  // --- RESTORED: RECOMMENDATIONS & REPORT ---

  async generateTherapyRecommendations(moodData) {
    if (!this.engine) throw createError('MODEL', 'NOT_INITIALIZED'); // Issue #20
    
    await this.waitForProcessing();
    this.isProcessing = true;
    this.addDebugLog('task', 'Generating therapy recommendations...');
    
    try {
        const messages = [
            { role: 'system', content: 'You are a helpful therapist.' },
            { role: 'user', content: `Suggest 3 short coping strategies for someone feeling ${moodData.avgSentiment < 5 ? 'stressed' : 'okay'}.` }
        ];
        
        // Non-streaming completion (WebLLM API requires stream: false)
        const completion = await this.engine.chat.completions.create({ 
            messages, 
            max_tokens: 200,
            temperature: 0.7,
            stream: false // CRITICAL: Must explicitly set to false for non-streaming
        });
        
        const recommendations = completion.choices[0].message.content;
        this.addDebugLog('success', 'Recommendations generated');
        return recommendations;
    } catch(e) {
        this.addDebugLog('error', `Recommendations failed: ${e.message}`);
        return "1. Practice deep breathing.\n2. Go for a short walk.\n3. Drink a glass of water.";
    } finally {
        this.isProcessing = false;
    }
  }

  async generateMentalHealthReport(userData) {
     if (!this.engine) throw createError('MODEL', 'NOT_INITIALIZED'); // Issue #20
     
     await this.waitForProcessing();
     this.isProcessing = true;
     this.addDebugLog('task', 'Generating mental health report...');
     
     try {
         const messages = [
             { role: 'system', content: 'You are a compassionate mental health analyst. Provide a brief, encouraging summary.' },
             { role: 'user', content: `Summarize this user's mental health progress: ${userData.journalCount} journal entries written, average mood sentiment ${userData.avgSentiment}/10. Provide 2-3 sentences of insight.` }
         ];
         
         // Non-streaming completion (WebLLM API requires stream: false)
         const completion = await this.engine.chat.completions.create({ 
             messages, 
             max_tokens: 300,
             temperature: 0.7,
             stream: false // CRITICAL: Must explicitly set to false for non-streaming
         });
         
         const report = completion.choices[0].message.content;
         this.addDebugLog('success', 'Report generated successfully');
         return report;
     } catch(e) {
         this.addDebugLog('error', `Report generation failed: ${e.message}`);
         return "Unable to generate report. Please try again.";
     } finally { 
         this.isProcessing = false; 
     }
  }

  // --- CACHE MANAGEMENT ---

  async checkCache() {
    if (!('caches' in window)) return [];
    try {
      const keys = await caches.keys();
      return keys.filter(k => k.includes('webllm')).map(k => ({ name: k }));
    } catch (err) { return []; }
  }

  async clearAllCache() {
    if (!('caches' in window)) return false;
    try {
      const keys = await caches.keys();
      const webllmCaches = keys.filter(k => k.includes('webllm'));
      await Promise.all(webllmCaches.map(key => caches.delete(key)));
      this.addDebugLog('success', `Cleared ${webllmCaches.length} cache(s)`);
      return true;
    } catch (err) {
      this.addDebugLog('error', 'Failed to clear cache', err);
      return false;
    }
  }

  async deleteModelFromCache(cacheName) {
    try { await caches.delete(cacheName); return true; } 
    catch (err) { return false; }
  }

  async purgeUnusedModels() {
    try {
      this.addDebugLog('task', 'Purging unused model caches...');
      const cachesList = await this.checkCache();
      const unusedCaches = cachesList.filter(cache => !cache.name.includes(this.modelId));
      
      if (unusedCaches.length === 0) {
        this.addDebugLog('info', 'No unused caches to purge');
        return 0;
      }

      // Delete all unused caches in parallel (Issue #11 fix)
      await Promise.all(
        unusedCaches.map(cache => this.deleteModelFromCache(cache.name))
      );
      
      this.addDebugLog('success', `Purged ${unusedCaches.length} unused cache(s)`);
      return unusedCaches.length;
    } catch (err) {
      this.addDebugLog('error', 'Failed to purge unused caches', err);
      return 0;
    }
  }
}

const webLLMService = new WebLLMService();
export default webLLMService;