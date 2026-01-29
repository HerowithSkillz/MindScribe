/**
 * Model Orchestrator - Manages dynamic model loading/unloading across tabs
 * 
 * Follows the same pattern as WebLLM service for consistency
 * Ensures only required models are loaded to optimize memory usage
 * 
 * Updated: Now uses WebGPU-accelerated Whisper for 6-8x faster transcription
 */

import webLLMService from './webllm.js';
import whisperWebGPU from './whisperWebGPU.js';
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
    // Wait for any ongoing transition
    while (this.isTransitioning) {
      await this.sleep(100);
    }

    if (this.activeTab === 'voice') {
      console.log('✅ Already on Voice Therapy tab');
      return;
    }

    try {
      this.isTransitioning = true;
      console.log('[ModelOrchestrator] Switching to Voice Therapy tab...');

      // Step 1: Keep WebLLM loaded (needed for text generation in voice mode)
      // We don't unload it to avoid 2.1GB memory footprint
      if (!this.activeModels.webllm) {
        console.log('[ModelOrchestrator] WebLLM not loaded, will initialize after voice models');
      } else {
        console.log('[ModelOrchestrator] Keeping WebLLM loaded for text generation');
      }

      // Small delay for state sync
      await this.sleep(100);

      // Step 2: Load Whisper WebGPU STT (39MB for tiny.en - WebGPU accelerated!)
      if (!this.activeModels.whisper) {
        console.log('[ModelOrchestrator] Loading Whisper WebGPU (tiny.en)...');
        try {
          const success = await whisperWebGPU.initialize('whisper-tiny.en', (progress) => {
            console.log(`[ModelOrchestrator] ${progress.text} (${progress.progress}%)`);
          });
          
          if (success) {
            this.activeModels.whisper = true;
            const info = whisperWebGPU.getModelInfo();
            console.log(`✅ Whisper loaded with ${info.device.toUpperCase()} acceleration`);
          } else {
            throw new Error('Whisper initialization returned false');
          }
        } catch (whisperError) {
          console.error('[ModelOrchestrator] Failed to initialize Whisper WebGPU:', whisperError);
          throw new Error(`Voice therapy initialization failed: ${whisperError.message}. Please check your internet connection and try again.`);
        }
      }

      // Step 3: Load Piper TTS with default ASMR voice (Amy)
      if (!this.activeModels.piper) {
        console.log('[ModelOrchestrator] Loading Piper TTS...');
        // Default to Amy - soft, gentle ASMR voice for therapy
        await piperService.loadModel('en_US-amy-medium');
        this.activeModels.piper = true;
        console.log('✅ Piper TTS loaded');
      }

      // Step 4: Update WebLLM system prompt for voice therapy
      console.log('[ModelOrchestrator] Switching WebLLM to voice therapy mode...');
      webLLMService.systemPrompt = this.VOICE_THERAPY_PROMPT;
      this.activeModels.webllm = true; // Mark as active

      this.activeTab = 'voice';
      console.log('✅ [ModelOrchestrator] Voice Therapy tab ready');
      console.log(`📊 Memory footprint: Whisper WebGPU (39MB) + Piper (200MB) + WebLLM (shared) ≈ ~250MB new`);

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
    // Wait for any ongoing transition
    while (this.isTransitioning) {
      await this.sleep(100);
    }

    if (this.activeTab !== 'voice') {
      console.log('✅ Not on Voice Therapy tab, no action needed');
      return;
    }

    try {
      this.isTransitioning = true;
      console.log('[ModelOrchestrator] Leaving Voice Therapy tab...');

      // Step 1: Unload Whisper WebGPU STT
      if (this.activeModels.whisper) {
        console.log('[ModelOrchestrator] Unloading Whisper WebGPU...');
        await whisperWebGPU.unload();
        this.activeModels.whisper = false;
        console.log('✅ Whisper WebGPU unloaded');
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
