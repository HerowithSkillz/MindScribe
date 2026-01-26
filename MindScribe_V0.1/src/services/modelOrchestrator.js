/**
 * Model Orchestrator - Manages dynamic model loading/unloading across tabs
 * 
 * Follows the same pattern as WebLLM service for consistency
 * Ensures only required models are loaded to optimize memory usage
 */

import webLLMService from './webllm.js';
import whisperService from './whisper.js';
import piperService from './piper.js';

class ModelOrchestrator {
  constructor() {
    this.activeModels = {
      webllm: false,
      whisper: false,
      piper: false
    };
    this.activeTab = 'chat'; // 'chat', 'voice', 'journal', 'debug', 'report', 'dashboard'
    this.isTransitioning = false;
    
    // Voice therapy system prompt - shorter responses for natural conversation
    this.VOICE_THERAPY_PROMPT = `You are MindScribe, a compassionate AI therapist speaking directly to a user through voice.
Instructions:
- Keep responses very brief (1-2 sentences maximum).
- Be warm, empathetic, and conversational.
- Use natural speaking patterns with occasional filler words (um, well, I see).
- Ask one open-ended follow-up question per response.
- Avoid medical diagnoses and clinical terminology.
- Focus on active listening and emotional validation.
- Never generate text for the user - only your responses.`;
  }

  /**
   * Switch to Voice Therapy tab
   * Unloads WebLLM, loads Whisper + Piper
   */
  async switchToVoiceTab() {
    if (this.isTransitioning) {
      console.warn('⚠️ Model transition already in progress');
      return;
    }

    if (this.activeTab === 'voice') {
      console.log('✅ Already on Voice Therapy tab');
      return;
    }

    try {
      this.isTransitioning = true;
      console.log('[ModelOrchestrator] Switching to Voice Therapy tab...');

      // Step 1: Unload WebLLM model (frees ~1-2GB memory)
      if (this.activeModels.webllm) {
        console.log('[ModelOrchestrator] Unloading WebLLM...');
        await webLLMService.unloadModel();
        this.activeModels.webllm = false;
        console.log('✅ WebLLM unloaded');
      }

      // Small delay to ensure cleanup
      await this.sleep(500);

      // Step 2: Load Whisper STT (~388MB for base.en)
      if (!this.activeModels.whisper) {
        console.log('[ModelOrchestrator] Loading Whisper STT...');
        await whisperService.loadModel('base.en');
        this.activeModels.whisper = true;
        console.log('✅ Whisper loaded');
      }

      // Step 3: Load Piper TTS (~200MB for lessac-medium)
      if (!this.activeModels.piper) {
        console.log('[ModelOrchestrator] Loading Piper TTS...');
        await piperService.loadModel('en_US-lessac-medium');
        this.activeModels.piper = true;
        console.log('✅ Piper TTS loaded');
      }

      // Step 4: Re-initialize WebLLM with voice therapy prompt (lightweight - keeps text generation)
      // WebLLM engine stays for response generation, just change system prompt
      console.log('[ModelOrchestrator] Initializing WebLLM for voice therapy...');
      const originalPrompt = webLLMService.systemPrompt;
      webLLMService.systemPrompt = this.VOICE_THERAPY_PROMPT;
      
      // Initialize if not already initialized
      if (!webLLMService.isInitialized) {
        await webLLMService.initialize();
      }
      this.activeModels.webllm = true;

      this.activeTab = 'voice';
      console.log('✅ [ModelOrchestrator] Voice Therapy tab ready');
      console.log(`📊 Memory footprint: Whisper (388MB) + Piper (200MB) + WebLLM (1.5GB) ≈ 2.1GB`);

    } catch (error) {
      console.error('❌ Failed to switch to voice tab:', error);
      throw error;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Switch from Voice Therapy tab back to text-based tabs
   * Unloads Whisper + Piper, reloads WebLLM with default prompt
   */
  async switchFromVoiceTab(targetTab = 'chat') {
    if (this.isTransitioning) {
      console.warn('⚠️ Model transition already in progress');
      return;
    }

    if (this.activeTab !== 'voice') {
      console.log('✅ Not on Voice Therapy tab, no action needed');
      return;
    }

    try {
      this.isTransitioning = true;
      console.log('[ModelOrchestrator] Leaving Voice Therapy tab...');

      // Step 1: Unload Whisper STT
      if (this.activeModels.whisper) {
        console.log('[ModelOrchestrator] Unloading Whisper...');
        await whisperService.unloadModel();
        this.activeModels.whisper = false;
        console.log('✅ Whisper unloaded');
      }

      // Step 2: Unload Piper TTS
      if (this.activeModels.piper) {
        console.log('[ModelOrchestrator] Unloading Piper TTS...');
        await piperService.unloadModel();
        this.activeModels.piper = false;
        console.log('✅ Piper TTS unloaded');
      }

      // Small delay to ensure cleanup
      await this.sleep(500);

      // Step 3: Reset WebLLM to default system prompt for text-based tabs
      console.log('[ModelOrchestrator] Resetting WebLLM for text mode...');
      
      // Restore default system prompt
      webLLMService.systemPrompt = `You are MindScribe, a supportive mental health companion.
Instructions:
- Keep answers short (2-3 sentences).
- Be empathetic but concise.
- Stop speaking immediately after your turn.
- Do NOT generate text for the User.`;

      // Re-apply DASS baseline if it exists
      if (webLLMService.dassBaseline) {
        webLLMService.updateSystemPrompt();
      }

      this.activeTab = targetTab;
      console.log(`✅ [ModelOrchestrator] Models reset for ${targetTab} tab`);
      console.log(`📊 Memory footprint: WebLLM only (~1.5GB)`);

    } catch (error) {
      console.error('❌ Failed to switch from voice tab:', error);
      throw error;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Switch to any tab (smart routing)
   * @param {string} tab - Target tab name
   */
  async switchTab(tab) {
    const voiceTab = tab === 'voice';
    const fromVoice = this.activeTab === 'voice';

    if (voiceTab && !fromVoice) {
      // Switching TO voice tab
      await this.switchToVoiceTab();
    } else if (!voiceTab && fromVoice) {
      // Switching FROM voice tab
      await this.switchFromVoiceTab(tab);
    } else {
      // Regular tab navigation (no voice involved)
      this.activeTab = tab;
      console.log(`[ModelOrchestrator] Navigated to ${tab} tab`);
    }
  }

  /**
   * Get current active tab
   * @returns {string} - Current tab name
   */
  getCurrentTab() {
    return this.activeTab;
  }

  /**
   * Get active models status
   * @returns {Object} - Active models state
   */
  getActiveModels() {
    return { ...this.activeModels };
  }

  /**
   * Check if currently transitioning between models
   * @returns {boolean}
   */
  isTransitionInProgress() {
    return this.isTransitioning;
  }

  /**
   * Helper: Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const modelOrchestrator = new ModelOrchestrator();
export default modelOrchestrator;
