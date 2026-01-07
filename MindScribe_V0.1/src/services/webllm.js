import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { getHardwareTier } from '../utils/hardwareCheck';

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
    
    // Default to the Lite model (Llama 3.2 1B) - matches WebLLM prebuilt config
    // Model IDs must exactly match those in: https://github.com/mlc-ai/web-llm/blob/main/src/config.ts
    this.modelId = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
    
    // UI-Friendly List - Updated to match WebLLM v0.2.75 prebuilt models
    this.availableModels = [
      {
        id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        name: "Llama 3.2 1B (Lite)",
        size: "~1.1GB",
        speed: "Very Fast",
        quality: "Good",
        description: "Fastest model. Best for standard laptops.",
        recommended: true
      },
      {
        id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
        name: "Llama 3.2 3B",
        size: "~1.9GB",
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

  async waitForProcessing() {
    const maxWaitTime = 60000; // 60s timeout
    const checkInterval = 100;
    let elapsed = 0;

    while (this.isProcessing && elapsed < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    if (this.isProcessing) {
      this.addDebugLog('error', 'Task queue timeout');
      throw new Error('AI is busy. Please try again.');
    }
  }

  async setModel(modelId) {
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
      // 1. Hardware Check (Silent)
      try {
         const hw = await getHardwareTier();
         this.addDebugLog('info', `Hardware Tier: ${hw.tier}`);
      } catch (e) { console.warn('HW check skipped'); }

      // 2. Worker Creation
      this.worker = new Worker(
        new URL('../workers/webllm.worker.js', import.meta.url),
        { type: 'module' }
      );

      // 3. Engine Creation - Let WebLLM Handle Model URLs
      // According to WebLLM docs: https://webllm.mlc.ai/docs/user/basic_usage.html
      // Simply pass the model ID - WebLLM's prebuilt config handles everything
      // This ensures version compatibility (v0.2.75) and automatic caching
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
      this.addDebugLog('success', `Model initialized successfully`);
      
      // Cleanup old files
      this.purgeUnusedModels();

    } catch (error) {
      this.isLoading = false;
      this.isInitialized = false;
      this.addDebugLog('error', `Init failed: ${error.message}`, error);
      throw error;
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
    if (!this.engine) throw new Error('Model not initialized');
    
    await this.waitForProcessing();
    this.isProcessing = true;
    this.abortController = new AbortController();

    try {
      const fullMessages = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      const chunks = await this.engine.chat.completions.create({
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 350,
        stream: true,
        // Stop tokens are handled automatically by WebLLM from model config
        // Llama 3.2 uses stop_token_ids: [128001, 128008, 128009] from conversation template
        // No custom stop strings needed - removes risk of premature stopping
      });

      let fullResponse = '';
      for await (const chunk of chunks) {
        if (this.abortController?.signal.aborted) {
          this.addDebugLog('warning', 'Chat cancelled');
          break;
        }
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        if (onUpdate) onUpdate(content);
      }
      return fullResponse;
    } catch (error) {
      this.addDebugLog('error', `Chat error: ${error.message}`);
      throw error;
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  // --- RESTORED: ROBUST JOURNAL ANALYSIS ---
  
  async analyzeJournal(journalText) {
    if (!this.engine) throw new Error('Model not initialized');
    await this.waitForProcessing();
    this.isProcessing = true;
    this.addDebugLog('task', 'Analyzing journal entry...');

    try {
      const messages = [
        {
          role: 'system',
          content: 'You are an expert psychological analyst. Output JSON only.'
        },
        {
          role: 'user',
          content: `Analyze this journal entry and provide structured assessment.
Entry: "${journalText}"
Provide:
- Primary mood (one word)
- Sentiment score (0-10)
- Stress level (low/medium/high)
- Brief summary (max 10 words)
- Supportive insight`
        }
      ];

      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.4,
        max_tokens: 300,
      });

      const response = completion.choices[0].message.content.trim();
      this.addDebugLog('info', 'Raw Analysis:', { response });
      
      // We use the restored parser to handle the LLM's non-perfect JSON output
      const analysis = this.parseAnalysisResponse(response, journalText);
      
      return analysis;
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
  parseAnalysisResponse(response, journalText) {
    const lowerResponse = response.toLowerCase();
    
    // 1. Emotion Extraction (standardized field name)
    let emotion = 'neutral';
    const emotionPatterns = [/\bmood[:\s]+([a-z]+)/i, /\bemotion[:\s]+([a-z]+)/i];
    for (const pattern of emotionPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) { emotion = match[1].toLowerCase(); break; }
    }

    // 2. Sentiment Extraction
    let sentiment = 5;
    const scoreMatch = response.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
    if (scoreMatch) sentiment = parseFloat(scoreMatch[1]);

    // 3. Stress Level (standardized field name)
    let stress = 'moderate';
    if (lowerResponse.includes('high stress')) stress = 'high';
    else if (lowerResponse.includes('low stress')) stress = 'low';
    else if (lowerResponse.includes('medium stress')) stress = 'moderate';

    // 4. Summary Extraction
    let summary = journalText.substring(0, 60) + '...';
    const summaryMatch = response.match(/summary[:\s]+(.+?)(?:\n|$)/i);
    if (summaryMatch) summary = summaryMatch[1].trim();

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
    if (!this.engine) return "Take a deep breath and center yourself.";
    
    await this.waitForProcessing();
    this.isProcessing = true;
    try {
        const messages = [
            { role: 'system', content: 'You are a helpful therapist.' },
            { role: 'user', content: `Suggest 3 short coping strategies for someone feeling ${moodData.avgSentiment < 5 ? 'stressed' : 'okay'}.` }
        ];
        const completion = await this.engine.chat.completions.create({ messages, max_tokens: 200 });
        return completion.choices[0].message.content;
    } catch(e) {
        return "1. Practice deep breathing.\n2. Go for a short walk.\n3. Drink a glass of water.";
    } finally {
        this.isProcessing = false;
    }
  }

  async generateMentalHealthReport(userData) {
     if (!this.engine) return "AI not loaded.";
     await this.waitForProcessing();
     this.isProcessing = true;
     try {
         const messages = [
             { role: 'system', content: 'Summarize mental health progress.' },
             { role: 'user', content: `Summarize stats: ${userData.journalCount} entries, Mood ${userData.avgSentiment}/10.` }
         ];
         const completion = await this.engine.chat.completions.create({ messages, max_tokens: 300 });
         return completion.choices[0].message.content;
     } catch(e) { return "Unable to generate report."; } 
     finally { this.isProcessing = false; }
  }

  // --- CACHE MANAGEMENT ---

  async checkCache() {
    if (!('caches' in window)) return [];
    try {
      const keys = await caches.keys();
      return keys.filter(k => k.includes('webllm')).map(k => ({ name: k }));
    } catch (err) { return []; }
  }

  async deleteModelFromCache(cacheName) {
    try { await caches.delete(cacheName); return true; } 
    catch (err) { return false; }
  }

  async purgeUnusedModels() {
    const cachesList = await this.checkCache();
    for (const cache of cachesList) {
      if (!cache.name.includes(this.modelId)) {
        await this.deleteModelFromCache(cache.name);
      }
    }
  }
}

const webLLMService = new WebLLMService();
export default webLLMService;