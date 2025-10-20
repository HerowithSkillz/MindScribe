import * as webllm from "@mlc-ai/web-llm";

class WebLLMService {
  constructor() {
    this.engine = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.abortController = null; // For canceling ongoing requests
    this.isProcessing = false; // Track if AI is currently processing
    this.taskQueue = []; // Queue for pending tasks
    this.debugLogs = []; // Store debug logs
    this.maxDebugLogs = 100; // Keep last 100 logs
    
    // Available models with metadata for user selection
    this.availableModels = [
      {
        id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        name: "Llama 3.2 1B",
        size: "~900MB",
        speed: "Very Fast",
        quality: "Good",
        description: "Smallest and fastest model. Great for quick responses.",
        recommended: true
      },
      {
        id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
        name: "Phi-3 Mini",
        size: "~2GB",
        speed: "Fast",
        quality: "Better",
        description: "Balanced model with good quality and speed."
      },
      {
        id: "Llama-3.1-8B-Instruct-q4f32_1-MLC",
        name: "Llama 3.1 8B",
        size: "~4.5GB",
        speed: "Moderate",
        quality: "Best",
        description: "Most capable model with highest quality responses."
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
    
    // Load saved model preference or use recommended
    const savedModelId = localStorage.getItem('mindscribe_selected_model');
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

  // Debug logging methods
  addDebugLog(type, message, data = null) {
    const log = {
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString(),
      type, // 'info', 'error', 'warning', 'success', 'task'
      message,
      data
    };
    
    this.debugLogs.push(log);
    
    // Keep only last maxDebugLogs entries
    if (this.debugLogs.length > this.maxDebugLogs) {
      this.debugLogs.shift();
    }
    
    // Also log to console with emoji
    const emoji = {
      info: 'ℹ️',
      error: '❌',
      warning: '⚠️',
      success: '✅',
      task: '🔄'
    }[type] || '📝';
    
    console.log(`${emoji} [${log.time}] ${message}`, data || '');
    
    // Emit custom event for debug UI to listen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('webllm-debug', { detail: log }));
    }
    
    return log;
  }

  getDebugLogs() {
    return [...this.debugLogs];
  }

  clearDebugLogs() {
    this.debugLogs = [];
    this.addDebugLog('info', 'Debug logs cleared');
  }

  // Task queue management
  async waitForProcessing() {
    if (!this.isProcessing) return;
    
    this.addDebugLog('warning', 'Another task is running, waiting...');
    
    // Wait until current task completes (max 60 seconds)
    const startTime = Date.now();
    while (this.isProcessing && (Date.now() - startTime) < 60000) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.isProcessing) {
      this.addDebugLog('error', 'Timeout waiting for previous task');
      throw new Error('Previous task timeout');
    }
  }

  setModel(modelId) {
    // Allow changing model selection anytime, but initialization must happen after unload
    const model = this.availableModels.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found in available models`);
    }
    
    this.modelId = modelId;
    localStorage.setItem('mindscribe_selected_model', modelId);
    console.log(`Model set to: ${model.name} (${modelId})`);
  }

  getAvailableModels() {
    return this.availableModels;
  }

  getCurrentModel() {
    return this.availableModels.find(m => m.id === this.modelId);
  }

  async initialize(onProgress) {
    if (this.isInitialized) return true;
    if (this.isLoading) return false;

    this.isLoading = true;

    try {
      console.log(`Initializing model: ${this.modelId}`);
      
      // Create engine with progress callback using factory function
      // This is the recommended approach from WebLLM documentation
      this.engine = await webllm.CreateMLCEngine(
        this.modelId,
        {
          initProgressCallback: (progress) => {
            if (onProgress) {
              onProgress(progress);
            }
            // Log progress for debugging
            console.log(`Model loading: ${progress.text} - ${Math.round(progress.progress * 100)}%`);
          }
        }
      );

      this.isInitialized = true;
      this.isLoading = false;
      
      console.log(`WebLLM initialized successfully with model: ${this.modelId}`);
      return true;
    } catch (error) {
      console.error("WebLLM initialization error:", error);
      this.isLoading = false;
      
      // Try fallback model if available
      if (this.modelOptions.length > 1) {
        console.log("Attempting to load fallback model...");
        this.modelId = this.modelOptions[1];
        return this.initialize(onProgress);
      }
      
      throw error;
    }
  }

  async chat(userMessage, conversationHistory = [], onStream = null) {
    if (!this.isInitialized) {
      const error = "WebLLM not initialized. Call initialize() first.";
      this.addDebugLog('error', error);
      throw new Error(error);
    }

    // Wait if another task is processing
    await this.waitForProcessing();
    
    this.isProcessing = true;
    this.addDebugLog('task', 'Starting chat request', { messageLength: userMessage.length });

    // Create new abort controller for this request
    this.abortController = new AbortController();

    try {
      // Build messages array following OpenAI format
      const messages = [
        { role: "system", content: this.systemPrompt },
        ...conversationHistory,
        { role: "user", content: userMessage }
      ];

      this.addDebugLog('info', `Processing chat with ${messages.length} messages in context`);

      // Use streaming for better UX (recommended by WebLLM docs)
      let fullResponse = "";
      
      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 512, // Increased for better responses
        stream: true,
        stream_options: { include_usage: true }, // Get token usage stats
      });

      // Batch chunks for smoother streaming
      let chunkBuffer = '';
      let chunkCount = 0;
      const BATCH_SIZE = 3; // Send every 3 chunks for smoother rendering

      for await (const chunk of completion) {
        // Check if request was aborted
        if (this.abortController?.signal.aborted) {
          console.log("Chat request cancelled by user");
          throw new Error("Request cancelled");
        }

        const content = chunk.choices[0]?.delta?.content || "";
        
        if (content) {
          fullResponse += content;
          chunkBuffer += content;
          chunkCount++;
          
          // Send batched chunks for smoother rendering
          if (onStream && (chunkCount >= BATCH_SIZE || content.includes(' '))) {
            onStream(chunkBuffer);
            chunkBuffer = '';
            chunkCount = 0;
          }
        }
        
        // Log usage stats from last chunk
        if (chunk.usage) {
          console.log("Token usage:", chunk.usage);
        }
      }
      
      // Send any remaining buffered content
      if (onStream && chunkBuffer) {
        onStream(chunkBuffer);
      }

      this.addDebugLog('success', 'Chat completed successfully', { 
        responseLength: fullResponse.length,
        tokens: fullResponse.split(' ').length 
      });

      return fullResponse;
    } catch (error) {
      if (error.message === "Request cancelled") {
        this.addDebugLog('warning', "Chat cancelled by user");
        throw error;
      }
      this.addDebugLog('error', "Chat error: " + error.message, error);
      throw error;
    } finally {
      this.abortController = null;
      this.isProcessing = false;
      this.addDebugLog('info', 'Chat processing completed');
    }
  }

  cancelChat() {
    if (this.abortController) {
      this.abortController.abort();
      console.log("Cancelling chat request...");
      return true;
    }
    return false;
  }

  async analyzeJournal(journalText) {
    if (!this.isInitialized) {
      const error = "WebLLM not initialized.";
      this.addDebugLog('error', error);
      throw new Error(error);
    }

    await this.waitForProcessing();
    this.isProcessing = true;
    this.addDebugLog('task', 'Starting journal analysis', { textLength: journalText.length });

    try {
      const analysisPrompt = `Analyze this journal entry and provide:
1. Primary emotion (one word: happy, sad, anxious, angry, calm, stressed, etc.)
2. Sentiment score (0-10, where 0 is very negative, 5 is neutral, 10 is very positive)
3. Stress level (low, moderate, high)
4. Key themes (2-3 words max)

Journal entry: "${journalText}"

Respond ONLY in this exact JSON format:
{"emotion": "word", "sentiment": number, "stress": "level", "themes": ["word1", "word2"]}`;

      const messages = [
        { role: "system", content: "You are an expert in emotional analysis. Respond only with valid JSON." },
        { role: "user", content: analysisPrompt }
      ];

      // Use JSON mode for structured output (WebLLM feature)
      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.3,
        max_tokens: 100,
        response_format: { type: "json_object" }, // Enable JSON mode
      });

      const response = completion.choices[0].message.content;
      
      try {
        // Parse JSON response
        const parsed = JSON.parse(response);
        return {
          emotion: parsed.emotion || "neutral",
          sentiment: typeof parsed.sentiment === 'number' ? parsed.sentiment : 5,
          stress: parsed.stress || "moderate",
          themes: Array.isArray(parsed.themes) ? parsed.themes : ["reflection"]
        };
      } catch (parseError) {
        // Fallback: try to extract JSON from response
        const jsonMatch = response.match(/\{[^}]+\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw parseError;
      }
    } catch (error) {
      this.addDebugLog('error', "Journal analysis error: " + error.message, error);
      // Return default analysis on error
      return {
        emotion: "neutral",
        sentiment: 5,
        stress: "moderate",
        themes: ["reflection"]
      };
    } finally {
      this.isProcessing = false;
      this.addDebugLog('info', 'Journal analysis completed');
    }
  }

  async generateTherapyRecommendations(moodData) {
    if (!this.isInitialized) {
      const error = "WebLLM not initialized.";
      this.addDebugLog('error', error);
      throw new Error(error);
    }

    await this.waitForProcessing();
    this.isProcessing = true;
    this.addDebugLog('task', 'Generating therapy recommendations', moodData);

    try {
      const prompt = `Based on this mood pattern, suggest 3 brief self-care practices:
Average sentiment: ${moodData.avgSentiment}/10
Stress level: ${moodData.stressLevel}
Common emotions: ${moodData.commonEmotions.join(", ")}

Provide 3 specific, actionable suggestions (one sentence each). Be warm and encouraging.`;

      const messages = [
        { role: "system", content: "You are a supportive mental health guide providing brief, actionable self-care tips." },
        { role: "user", content: prompt }
      ];

      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.8,
        max_tokens: 150,
      });

      this.addDebugLog('success', 'Recommendations generated successfully');
      return completion.choices[0].message.content;
    } catch (error) {
      this.addDebugLog('error', "Recommendations generation error: " + error.message, error);
      return "Take time for yourself today. Practice deep breathing. Connect with someone you trust.";
    } finally {
      this.isProcessing = false;
      this.addDebugLog('info', 'Recommendations generation completed');
    }
  }

  async generateMentalHealthReport(userData) {
    if (!this.isInitialized) {
      const error = "WebLLM not initialized.";
      this.addDebugLog('error', error);
      throw new Error(error);
    }

    await this.waitForProcessing();
    this.isProcessing = true;
    this.addDebugLog('task', 'Generating mental health report', userData);

    try {
      const prompt = `Create a brief mental health summary based on:
- Journal entries: ${userData.journalCount}
- Average mood: ${userData.avgSentiment}/10
- Stress levels: ${userData.stressDistribution}
- Most common emotions: ${userData.topEmotions.join(", ")}
- Time period: ${userData.timePeriod}

Write a 2-paragraph compassionate summary with insights and encouragement.`;

      const messages = [
        { role: "system", content: "You are a compassionate mental health professional writing a supportive summary report." },
        { role: "user", content: prompt }
      ];

      this.addDebugLog('info', 'Calling AI engine for report generation...');
      
      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 300,
      });

      this.addDebugLog('success', 'Report generated successfully', {
        responseLength: completion.choices[0].message.content.length
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      this.addDebugLog('error', "Report generation error: " + error.message, error);
      return "Your mental health journey shows dedication to self-awareness. Continue tracking your emotions and practicing self-care.";
    } finally {
      this.isProcessing = false;
      this.addDebugLog('info', 'Report generation completed');
    }
  }

  getModelInfo() {
    return {
      modelId: this.modelId,
      currentModel: this.getCurrentModel(),
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      availableModels: this.availableModels
    };
  }

  async unload() {
    if (this.engine) {
      // WebLLM handles cleanup automatically when tab is closed
      // Manual unload can help free memory if needed
      try {
        await this.engine.unload();
      } catch (error) {
        console.warn("Error during engine unload:", error);
      }
      this.engine = null;
      this.isInitialized = false;
    }
  }
  
  async resetChat() {
    // Reset chat context without reloading the model
    if (this.engine) {
      try {
        await this.engine.resetChat();
        console.log("Chat context reset successfully");
      } catch (error) {
        console.warn("Error resetting chat:", error);
      }
    }
  }
  
  async runtimeStatsText() {
    // Get performance statistics (useful for debugging)
    if (this.engine) {
      try {
        return await this.engine.runtimeStatsText();
      } catch (error) {
        console.warn("Error getting runtime stats:", error);
        return "Stats unavailable";
      }
    }
    return "Engine not initialized";
  }
}

// Singleton instance
const webLLMService = new WebLLMService();

export default webLLMService;
