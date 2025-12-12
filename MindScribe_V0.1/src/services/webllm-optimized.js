import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

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
    
    // Available models
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
    this.addDebugLog('task', `Initializing WebLLM with model: ${this.modelId}`);

    try {
      // Create Web Worker for better performance
      this.addDebugLog('info', 'Creating Web Worker...');
      this.worker = new Worker(
        new URL('../workers/webllm.worker.js', import.meta.url),
        { type: 'module' }
      );

      this.addDebugLog('info', 'Initializing engine in worker thread...');
      
      // Create engine using worker
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
          }
        }
      );

      this.isInitialized = true;
      this.isLoading = false;
      this.addDebugLog('success', `Model ${this.modelId} initialized successfully`);
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

  async chat(messages, onUpdate) {
    if (!this.engine) {
      this.addDebugLog('error', 'AI engine not initialized');
      throw new Error('Model not initialized. Please select a model first.');
    }

    // Wait for any ongoing tasks
    await this.waitForProcessing();
    
    this.isProcessing = true;
    this.abortController = new AbortController();
    this.addDebugLog('task', 'Starting chat task...');

    try {
      const fullMessages = [
        { role: 'system', content: this.systemPrompt },
        ...messages
      ];

      this.addDebugLog('info', `Sending ${messages.length} messages to AI`);
      
      const chunks = await this.engine.chat.completions.create({
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 500,
        stream: true,
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
    this.addDebugLog('task', 'Starting journal analysis...');

    try {
      const messages = [
        {
          role: 'system',
          content: 'You are an empathetic AI analyzing journal entries for emotional insights.'
        },
        {
          role: 'user',
          content: `Analyze this journal entry and provide: 1) Main emotion (one word), 2) Sentiment score (0-10), 3) Stress level (low/medium/high), 4) Brief supportive insight (1-2 sentences).

Journal: "${journalText}"

Format: emotion|score|stress|insight`
        }
      ];

      this.addDebugLog('info', 'Analyzing journal content...');
      
      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.5,
        max_tokens: 150,
      });

      const response = completion.choices[0].message.content;
      const parts = response.split('|').map(p => p.trim());

      const analysis = {
        emotion: parts[0] || 'neutral',
        sentiment: parseFloat(parts[1]) || 5,
        stressLevel: parts[2] || 'medium',
        insight: parts[3] || 'Take care of yourself.'
      };

      this.addDebugLog('success', 'Journal analyzed', analysis);
      return analysis;
    } catch (error) {
      this.addDebugLog('error', `Analysis error: ${error.message}`, error);
      // Return default values on error
      return {
        emotion: 'neutral',
        sentiment: 5,
        stressLevel: 'medium',
        insight: 'Your feelings are valid. Remember to be kind to yourself.'
      };
    } finally {
      this.isProcessing = false;
      this.addDebugLog('info', 'Analysis completed');
    }
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
Average Mood: ${userData.avgSentiment}/10
Top Emotions: ${userData.topEmotions?.join(', ') || 'various'}
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
}

// Singleton instance
const webLLMService = new WebLLMService();

export default webLLMService;
