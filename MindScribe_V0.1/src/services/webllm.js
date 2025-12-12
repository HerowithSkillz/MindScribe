import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { getHardwareTier } from '../utils/hardwareCheck';

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
    
    // Available models - UPDATED to match Hardware Check recommendations
    this.availableModels = [
      {
        id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", // Changed to q4f16 for better compatibility
        name: "Llama 3.2 1B (Lite)",
        size: "~900MB",
        speed: "Very Fast",
        quality: "Good",
        description: "Smallest and fastest model. Great for older laptops/mobile.",
        recommended: true
      },
      {
        id: "Phi-3.5-mini-instruct-q4f16_1-MLC", // UPDATED to Phi-3.5
        name: "Phi-3.5 Mini",
        size: "~2.2GB",
        speed: "Fast",
        quality: "Excellent",
        description: "Best balance of intelligence and speed. Recommended for most laptops."
      },
      {
        id: "Llama-3.1-8B-Instruct-q4f32_1-MLC",
        name: "Llama 3.1 8B",
        size: "~4.5GB",
        speed: "Moderate",
        quality: "Best",
        description: "Most capable model. Requires high-performance GPU (8GB+ RAM)."
      },
      {
        id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        name: "Qwen 2.5 1.5B",
        size: "~1.2GB",
        speed: "Very Fast",
        quality: "Good",
        description: "Compact model optimized for general chat."
      },
      {
        id: "gemma-2-2b-it-q4f16_1-MLC",
        name: "Gemma 2 2B",
        size: "~1.5GB",
        speed: "Fast",
        quality: "Good",
        description: "Google's efficient model for natural conversations."
      }
    ];
    
    const savedModelId = localStorage.getItem('mindscribe_selected_model');
    // Default to the first model (Lite) if nothing saved
    this.modelId = savedModelId || this.availableModels[0].id;
    
    this.systemPrompt = `You are MindScribe, a warm, empathetic, and supportive mental health companion. Your role is to:
- Listen actively and respond with genuine empathy
- Ask thoughtful follow-up questions to understand better
- Provide encouragement and validation
- Suggest gentle coping strategies when appropriate
- Keep responses concise (2-4 sentences) and conversational
- Use a warm, friendly tone without being overly clinical
- Respect the user's feelings and never minimize their experiences
- Focus on positivity and emotional resilience

Remember: You are a supportive friend, not a replacement for professional therapy.`;
  }

  // Debug logging
  addDebugLog(type, message, data = null) {
    const emoji = {
      'info': 'ℹ️',
      'error': '❌',
      'warning': '⚠️',
      'success': '✅',
      'task': '📋'
    }[type] || '📝';

    const log = {
      timestamp: Date.now(),
      type,
      emoji,
      message,
      data
    };
    
    this.debugLogs.push(log);
    
    if (this.debugLogs.length > this.maxDebugLogs) {
      this.debugLogs.shift();
    }
    
    // Console output with colors
    const style = {
      'info': 'color: #3b82f6',
      'error': 'color: #ef4444',
      'warning': 'color: #f59e0b',
      'success': 'color: #10b981',
      'task': 'color: #8b5cf6'
    }[type] || 'color: #6b7280';
    
    console.log(`%c${emoji} [${type.toUpperCase()}] ${message}`, style, data || '');
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('webllm-debug', { detail: log }));
    
    return log;
  }

  getDebugLogs() {
    return [...this.debugLogs];
  }

  clearDebugLogs() {
    this.debugLogs = [];
    this.addDebugLog('info', 'Debug logs cleared');
  }

  async waitForProcessing() {
    const maxWaitTime = 60000; // 60 seconds
    const checkInterval = 100; // Check every 100ms
    let elapsed = 0;

    this.addDebugLog('info', 'Checking if AI is available...');

    while (this.isProcessing && elapsed < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    if (this.isProcessing) {
      this.addDebugLog('error', 'Task queue timeout - waited 60 seconds');
      throw new Error('AI is busy. Please try again in a moment.');
    }

    this.addDebugLog('success', 'AI is ready');
  }

  getAvailableModels() {
    return this.availableModels;
  }

  getCurrentModel() {
    return this.modelId;
  }

  async setModel(modelId) {
    this.addDebugLog('task', `Switching model to ${modelId}...`);
    
    if (!this.availableModels.find(m => m.id === modelId)) {
      this.addDebugLog('error', `Invalid model ID: ${modelId}`);
      throw new Error(`Model ${modelId} not found`);
    }

    // Unload current model if any
    if (this.engine) {
      this.addDebugLog('info', 'Unloading current model...');
      await this.unloadModel();
    }

    this.modelId = modelId;
    localStorage.setItem('mindscribe_selected_model', modelId);
    this.isInitialized = false;
    
    this.addDebugLog('success', `Model set to ${modelId}`);
  }

  // --- NEW: UPDATED INITIALIZE METHOD WITH HARDWARE CHECK ---
  async initialize(onProgress) {
    if (this.isInitialized) {
      this.addDebugLog('warning', 'Model already initialized');
      return;
    }

    if (this.isLoading) {
      this.addDebugLog('warning', 'Model is already loading');
      return;
    }

    this.isLoading = true;
    this.addDebugLog('task', `Initializing AI Engine...`);

    try {
      // 1. Hardware Capability Check
      this.addDebugLog('info', 'Analyzing hardware capabilities...');
      const hardwareStatus = await getHardwareTier();

      if (hardwareStatus.tier === 'incompatible') {
        throw new Error("Your device does not support WebGPU. Please use Chrome, Edge, or Brave on a desktop/laptop.");
      }

      // 2. Auto-Select Best Model
      // We log the recommendation and update the modelId to match the hardware capability
      const recommendedModel = hardwareStatus.recommendedModel;
      this.addDebugLog('success', `Hardware Analysis: ${hardwareStatus.tier.toUpperCase()} Tier detected.`);
      this.addDebugLog('info', `Recommended Model: ${recommendedModel}`);

      // If the currently selected model is too heavy for the hardware, downgrade it automatically
      // OR if it's the first run, use the recommendation.
      // Logic: Use recommendation unless user manually picked a VALID lighter model.
      // For safety, we will adhere to the recommendation for stability.
      if (this.modelId !== recommendedModel) {
        this.addDebugLog('warning', `Optimizing: Switching from ${this.modelId} to ${recommendedModel} for stability.`);
        this.modelId = recommendedModel;
        localStorage.setItem('mindscribe_selected_model', this.modelId);
      }

      this.addDebugLog('task', `Loading Model: ${this.modelId}`);

      // 3. Create Web Worker
      this.addDebugLog('info', 'Creating Web Worker...');
      this.worker = new Worker(
        new URL('../workers/webllm.worker.js', import.meta.url),
        { type: 'module' }
      );

      this.addDebugLog('info', 'Initializing engine in worker thread...');
      
      // 4. Initialize Engine
      this.engine = await CreateWebWorkerMLCEngine(
        this.worker,
        this.modelId,
        {
          initProgressCallback: (progress) => {
            this.addDebugLog('info', `Loading: ${progress.text}`, {
              progress: progress.progress,
              timeElapsed: progress.timeElapsed
            });
            if (onProgress) {
              onProgress(progress);
            }
          },
          // Lower log level improves performance
          logLevel: 'WARN' 
        }
      );

      this.isInitialized = true;
      this.isLoading = false;
      this.addDebugLog('success', `Model ${this.modelId} initialized successfully`);
      this.purgeUnusedModels();

      return { status: 'success', tier: hardwareStatus.tier };

    } catch (error) {
      this.isLoading = false;
      this.isInitialized = false;
      this.addDebugLog('error', `Initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  async unloadModel() {
    if (!this.engine) {
      this.addDebugLog('warning', 'No model to unload');
      return;
    }

    try {
      this.addDebugLog('task', 'Unloading model...');
      
      // Terminate worker
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
        this.addDebugLog('info', 'Worker terminated');
      }

      this.engine = null;
      this.isInitialized = false;
      this.isProcessing = false;
      this.addDebugLog('success', 'Model unloaded successfully');
    } catch (error) {
      this.addDebugLog('error', `Unload failed: ${error.message}`, error);
      throw error;
    }
  }

  cancelChat() {
    if (this.abortController) {
      this.addDebugLog('warning', 'Canceling current chat request');
      this.abortController.abort();
      this.abortController = null;
      this.isProcessing = false;
      return true;
    }
    return false;
  }

  async chat(userMessage, conversationHistory = [], onUpdate) {
    if (!this.engine) {
      this.addDebugLog('error', 'AI engine not initialized');
      throw new Error('Model not initialized. Please wait for loading to complete.');
    }

    // Wait for any ongoing tasks
    await this.waitForProcessing();
    
    this.isProcessing = true;
    this.abortController = new AbortController();
    this.addDebugLog('task', 'Starting chat task...');

    try {
      // Build the full conversation
      const fullMessages = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      this.addDebugLog('info', `Sending ${conversationHistory.length + 1} messages to AI`);
      
      const chunks = await this.engine.chat.completions.create({
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 500,
        stream: true,
        // --- FIX STARTS HERE ---
        // This forces the AI to stop if it tries to generate the user's turn
        stop: ["<|user|>", "<|end|>", "<|system|>", "user:", "User:", "\nUser:"], 
        // --- FIX ENDS HERE ---
        stream_options: { include_usage: true }
      });

      let fullResponse = '';
      for await (const chunk of chunks) {
        if (this.abortController?.signal.aborted) {
          this.addDebugLog('warning', 'Chat cancelled by user');
          break;
        }

        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        
        if (onUpdate && content) {
          onUpdate(content);
        }
      }

      this.addDebugLog('success', 'Chat completed', {
        responseLength: fullResponse.length
      });
      
      return fullResponse;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.addDebugLog('warning', 'Chat request was cancelled');
        return '';
      }
      this.addDebugLog('error', `Chat error: ${error.message}`, error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.abortController = null;
      this.addDebugLog('info', 'Chat task completed');
    }
  }

  async analyzeJournal(journalText) {
    if (!this.engine) {
      this.addDebugLog('error', 'AI engine not initialized');
      throw new Error('Model not initialized');
    }

    await this.waitForProcessing();
    this.isProcessing = true;
    this.addDebugLog('task', 'Starting comprehensive journal analysis (FR-007)...');

    try {
      const messages = [
        {
          role: 'system',
          content: 'You are an expert psychological analyst. Analyze journal entries and provide structured emotional assessment in a specific format.'
        },
        {
          role: 'user',
          content: `Analyze this journal entry and provide comprehensive emotional assessment.

Journal Entry:
"${journalText}"

Provide a detailed analysis covering:
- Primary mood/emotion (one word)
- Sentiment score (0-10 scale)
- Stress level assessment
- Emotional tone description
- Brief summary (10 words max)
- Supportive insight

Provide your complete analysis:`
        }
      ];

      this.addDebugLog('info', 'Requesting AI analysis...');
      
      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.4,
        max_tokens: 300,
      });

      const response = completion.choices[0].message.content.trim();
      this.addDebugLog('info', 'Raw AI response:', { response });
      
      // Parse natural language response with multiple strategies
      const analysis = this.parseAnalysisResponse(response, journalText);

      this.addDebugLog('success', 'Journal analysis completed (FR-007)', {
        mood: analysis.mood,
        sentiment: analysis.sentiment,
        stressLevel: analysis.stressLevel,
        emotionalTone: analysis.emotionalTone,
        summary: analysis.summary
      });
      
      return analysis;
    } catch (error) {
      this.addDebugLog('error', `Analysis error: ${error.message}`, error);
      
      // Return comprehensive default values matching FR-007 requirements
      return {
        mood: 'neutral',
        emotion: 'neutral',
        sentiment: 5,
        sentimentScore: 5,
        stressLevel: 'medium',
        stress: 'medium',
        emotionalTone: 'reflective',
        summary: journalText.substring(0, 50) + '...',
        insight: 'Your feelings are valid. Remember to be kind to yourself.',
        analyzedAt: new Date().toISOString(),
        wordCount: journalText.trim().split(/\s+/).length,
        error: true
      };
    } finally {
      this.isProcessing = false;
      this.addDebugLog('info', 'Journal analysis task completed');
    }
  }

  parseAnalysisResponse(response, journalText) {
    const lowerResponse = response.toLowerCase();
    
    // Extract mood (look for emotion words)
    let mood = 'neutral';
    const moodPatterns = [
      /\bmood[:\s]+([a-z]+)/i,
      /\bemotion[:\s]+([a-z]+)/i,
      /\bfeeling[:\s]+([a-z]+)/i,
      /\bprimary[:\s]+(?:emotion|mood)[:\s]+([a-z]+)/i
    ];
    
    for (const pattern of moodPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        mood = match[1].toLowerCase();
        break;
      }
    }
    
    // If no pattern match, look for common emotion words
    const emotionWords = ['happy', 'sad', 'anxious', 'stressed', 'peaceful', 'frustrated', 'excited', 'worried', 'content', 'angry', 'hopeful', 'depressed', 'calm', 'overwhelmed', 'grateful', 'lonely', 'confused', 'confident', 'fearful', 'relieved'];
    for (const emotion of emotionWords) {
      if (lowerResponse.includes(emotion)) {
        mood = emotion;
        break;
      }
    }

    // Extract sentiment score (0-10)
    let sentiment = 5;
    const sentimentPatterns = [
      /sentiment[:\s]+(\d+(?:\.\d+)?)/i,
      /score[:\s]+(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*(?:\/|\bout of\b)\s*10/i,
      /rating[:\s]+(\d+(?:\.\d+)?)/i
    ];
    
    for (const pattern of sentimentPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        const score = parseFloat(match[1]);
        if (score >= 0 && score <= 10) {
          sentiment = score;
          break;
        }
      }
    }

    // Extract stress level
    let stressLevel = 'medium';
    const stressPatterns = [
      /stress[:\s]+(low|medium|high)/i,
      /stress level[:\s]+(low|medium|high)/i,
      /(low|medium|high)\s+stress/i
    ];
    
    for (const pattern of stressPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        stressLevel = match[1].toLowerCase();
        break;
      }
    }
    
    // If no explicit stress found, infer from keywords
    if (stressLevel === 'medium') {
      if (lowerResponse.match(/\b(very stressed|overwhelmed|anxious|panic|crisis)\b/)) {
        stressLevel = 'high';
      } else if (lowerResponse.match(/\b(calm|peaceful|relaxed|content)\b/)) {
        stressLevel = 'low';
      }
    }

    // Extract emotional tone (2-3 descriptive words)
    let emotionalTone = 'reflective';
    const tonePatterns = [
      /(?:emotional )?tone[:\s]+([a-z\s,]+?)(?:\.|$|\n)/i,
      /tone[:\s]*:?\s*([a-z\s,]+?)(?:\.|$|\n)/i,
      /overall.*?tone.*?[:\s]+([a-z\s,]+?)(?:\.|$|\n)/i
    ];
    
    for (const pattern of tonePatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        // Take first 2-3 words
        const words = match[1].trim().split(/[\s,]+/).filter(w => w.length > 2);
        emotionalTone = words.slice(0, 3).join(' and ');
        break;
      }
    }

    // Extract summary (should be 10 words or less)
    let summary = journalText.substring(0, 60) + '...';
    const summaryPatterns = [
      /summary[:\s]+["']?(.+?)["']?(?:\.|$|\n)/i,
      /in summary[:\s]+["']?(.+?)["']?(?:\.|$|\n)/i,
      /brief summary[:\s]+["']?(.+?)["']?(?:\.|$|\n)/i,
      /\d+[ -]word summary[:\s]+["']?(.+?)["']?(?:\.|$|\n)/i
    ];
    
    for (const pattern of summaryPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        let extracted = match[1].trim();
        
        // FR-007: Sanitize summary - remove unwanted characters
        // Remove quotes, excessive punctuation, special characters
        extracted = extracted
          .replace(/^["'\s]+|["'\s]+$/g, '') // Remove leading/trailing quotes
          .replace(/[^\w\s.,!?-]/g, '') // Keep only words, spaces, basic punctuation
          .replace(/\s+/g, ' ') // Normalize spaces
          .replace(/\.{2,}/g, '') // Remove multiple dots (but keep single)
          .trim();
        
        // Limit to 10 words
        const words = extracted.split(/\s+/).filter(w => w.length > 0);
        summary = words.slice(0, 10).join(' ');
        
        // Add period if not present and not ending with punctuation
        if (summary && !/[.!?]$/.test(summary)) {
          summary += '.';
        }
        
        break;
      }
    }
    
    // Final sanitization check for summary
    summary = summary.replace(/\s+/g, ' ').trim();

    // Extract insight (supportive message)
    let insight = 'Your feelings are valid. Remember to be kind to yourself.';
    const insightPatterns = [
      /insight[:\s]+(.+?)(?:\n\n|$)/is,
      /supportive message[:\s]+(.+?)(?:\n\n|$)/is,
      /recommendation[:\s]+(.+?)(?:\n\n|$)/is,
      /suggestion[:\s]+(.+?)(?:\n\n|$)/is
    ];
    
    for (const pattern of insightPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        insight = match[1].trim().split('\n')[0]; // Take first paragraph
        break;
      }
    }

    // Build comprehensive analysis object per FR-007
    return {
      mood: mood,
      emotion: mood, // Backward compatibility
      sentiment: sentiment,
      sentimentScore: sentiment,
      stressLevel: stressLevel,
      stress: stressLevel,
      emotionalTone: emotionalTone,
      summary: summary,
      insight: insight,
      analyzedAt: new Date().toISOString(),
      wordCount: journalText.trim().split(/\s+/).length,
      rawResponse: response // Store for debugging
    };
  }

  async generateTherapyRecommendations(moodData) {
    if (!this.engine) {
      this.addDebugLog('error', 'AI engine not initialized');
      throw new Error('Model not initialized');
    }

    await this.waitForProcessing();
    this.isProcessing = true;
    this.addDebugLog('task', 'Generating therapy recommendations...');

    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a supportive mental health assistant providing personalized coping strategies.'
        },
        {
          role: 'user',
          content: `Based on this mood data, suggest 3 specific, actionable coping strategies:
          
Average Mood: ${moodData.avgSentiment}/10
Common Emotions: ${moodData.commonEmotions?.join(', ') || 'various'}
Stress Level: ${moodData.stressLevel || 'moderate'}

Provide 3 numbered recommendations, each 1-2 sentences.`
        }
      ];

      this.addDebugLog('info', 'Generating personalized recommendations...');

      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 300,
      });

      const recommendations = completion.choices[0].message.content;
      this.addDebugLog('success', 'Recommendations generated');
      return recommendations;
    } catch (error) {
      this.addDebugLog('error', `Recommendation error: ${error.message}`, error);
      return "1. Practice mindfulness meditation for 10 minutes daily.\n2. Engage in regular physical activity you enjoy.\n3. Connect with supportive friends or family members.";
    } finally {
      this.isProcessing = false;
      this.addDebugLog('info', 'Recommendation generation completed');
    }
  }

  async generateMentalHealthReport(userData) {
    if (!this.engine) {
      this.addDebugLog('error', 'AI engine not initialized');
      throw new Error('Model not initialized');
    }

    await this.waitForProcessing();
    this.isProcessing = true;
    this.addDebugLog('task', 'Generating mental health report...');

    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a compassionate mental health assistant creating supportive wellness reports.'
        },
        {
          role: 'user',
          content: `Create a brief, encouraging mental health summary (3-4 sentences) based on:
          
                  Journal Entries: ${userData.journalCount}
                  Top Emotions: ${userData.topEmotions?.join(', ') || 'various'}
                  Average Mood: ${userData.avgSentiment}/10
                Period: ${userData.timePeriod}

Focus on progress, strengths, and gentle encouragement.`
        }
      ];

      this.addDebugLog('info', 'Calling AI engine for report generation...');
      
      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 300,
      });

      const report = completion.choices[0].message.content;
      this.addDebugLog('success', 'Report generated successfully', {
        responseLength: report.length
      });
      
      return report;
    } catch (error) {
      this.addDebugLog('error', `Report generation error: ${error.message}`, error);
      return "Your mental health journey shows dedication to self-awareness. Continue tracking your emotions and practicing self-care.";
    } finally {
      this.isProcessing = false;
      this.addDebugLog('info', 'Report generation completed');
    }
  }

  getStatus() {
    if (!this.engine) return "Not initialized";
    if (this.isLoading) return "Loading model...";
    if (this.isProcessing) return "Processing...";
    if (this.isInitialized) return "Ready";
    return "Engine not initialized";
  }

  /**
   * Scans the browser cache to see what models are stored
   * and how much space they are taking.
   */
  async checkCache() {
    if (!('caches' in window)) return [];
    
    try {
      const keys = await caches.keys();
      const modelCaches = [];
      
      for (const key of keys) {
        // WebLLM usually namespaces caches with 'webllm/'
        if (key.includes('webllm')) {
          const cache = await caches.open(key);
          const requests = await cache.keys();
          modelCaches.push({
            name: key,
            entries: requests.length, // This explains the "98 entries"
            isCurrent: key.includes(this.modelId) // Check if it's the one we are using
          });
        }
      }
      return modelCaches;
    } catch (err) {
      console.error("Cache check failed", err);
      return [];
    }
  }

  /**
   * Deletes a specific model from the cache to free up space.
   */
  async deleteModelFromCache(cacheName) {
    try {
      this.addDebugLog('task', `Deleting old cache: ${cacheName}...`);
      await caches.delete(cacheName);
      this.addDebugLog('success', `Deleted ${cacheName}`);
      return true;
    } catch (err) {
      this.addDebugLog('error', `Failed to delete ${cacheName}`, err);
      return false;
    }
  }

  /**
   * "Smart Clean": Deletes everything EXCEPT the current recommended model.
   */
  async purgeUnusedModels() {
    const cachesList = await this.checkCache();
    let deletedCount = 0;

    for (const cache of cachesList) {
      // If the cache name doesn't match our current active model ID
      if (!cache.name.includes(this.modelId)) {
        await this.deleteModelFromCache(cache.name);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      this.addDebugLog('success', `Cleanup complete. Removed ${deletedCount} old models.`);
    } else {
      this.addDebugLog('info', 'Storage is already clean. No old models found.');
    }
  }
}



// Singleton instance
const webLLMService = new WebLLMService();

export default webLLMService;