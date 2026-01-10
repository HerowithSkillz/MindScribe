import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import webLLMService from '../services/webllm';
import { setWebLLMInitialize } from './AuthContext';

const WebLLMContext = createContext(null);

export const useWebLLM = () => {
  const context = useContext(WebLLMContext);
  if (!context) {
    throw new Error('useWebLLM must be used within WebLLMProvider');
  }
  return context;
};

export const WebLLMProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ text: '', progress: 0, timeElapsed: 0 });
  const [error, setError] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [currentModel, setCurrentModel] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load available models on mount
  React.useEffect(() => {
    const models = webLLMService.getAvailableModels();
    setAvailableModels(models);
    const currentModelId = webLLMService.getCurrentModel();
    const currentModelObj = models.find(m => m.id === currentModelId);
    setCurrentModel(currentModelObj);
  }, []);

  const selectModel = useCallback(async (modelId) => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      
      // Wait for model to unload before proceeding (fixes race condition)
      await webLLMService.setModel(modelId);
      
      // Model needs re-initialization after switch
      setIsInitialized(false);
      
      // Update current model in UI
      const models = webLLMService.getAvailableModels();
      const currentModelObj = models.find(m => m.id === modelId);
      setCurrentModel(currentModelObj);
      
      console.log(`Model switched to ${currentModelObj?.name || modelId}`);
    } catch (err) {
      console.error('Failed to select model:', err);
      setError(err.message || 'Failed to switch model');
      throw err; // Re-throw for caller to handle
    } finally {
      setIsLoading(false); // Always cleanup loading state
    }
  }, []);

  const unloadModel = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      await webLLMService.unloadModel();
      setIsInitialized(false);
      setProgress({ text: '', progress: 0 });
      setError(null);
      console.log('Model unloaded and cleaned up successfully');
    } catch (err) {
      console.error('Failed to unload model:', err);
      setError(err.message || 'Failed to unload model');
      throw err; // Re-throw for caller to handle
    }
  }, [isInitialized]);

  const cleanup = useCallback(async () => {
    // Force cleanup regardless of state
    try {
      await webLLMService.unloadModel();
      setIsInitialized(false);
      setIsLoading(false);
      setProgress({ text: '', progress: 0 });
      setError(null);
      console.log('WebLLM context cleaned up');
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }, []);

  const initialize = useCallback(async (isRetry = false) => {
    if (isInitialized || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Cleanup before retry to prevent cache corruption
      if (isRetry) {
        await webLLMService.unloadModel().catch(() => {});
      }

      await webLLMService.initialize((progressReport) => {
        // Enhanced progress reporting with stage detection
        setProgress({
          text: progressReport.text || 'Loading model...',
          progress: progressReport.progress || 0,
          timeElapsed: progressReport.timeElapsed || 0
        });
      });

      setIsInitialized(true);
      setRetryCount(0); // Reset retry counter on success
      setProgress({ text: 'Model ready!', progress: 1 });
    } catch (err) {
      console.error('WebLLM initialization failed:', err);
      
      const currentRetryCount = isRetry ? retryCount : 0;
      
      // Auto-retry with exponential backoff (max 2 auto-retries)
      if (currentRetryCount < 2) {
        const delay = 2000 * Math.pow(2, currentRetryCount); // 2s, 4s
        const nextRetry = currentRetryCount + 1;
        setRetryCount(nextRetry);
        
        setError({
          message: `${err.message || 'Failed to initialize AI model'}. Retrying in ${delay/1000}s... (${nextRetry}/2)`,
          canRetry: false,
          isAutoRetrying: true
        });
        
        // Automatic retry with exponential backoff
        setTimeout(() => initialize(true), delay);
      } else {
        // Final failure after all retries - offer manual retry
        setError({
          message: err.message || 'Failed to initialize AI model after multiple attempts.',
          canRetry: true,
          isAutoRetrying: false,
          suggestion: 'Please check your internet connection and GPU availability, then try again.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isLoading, retryCount]);

  const chat = useCallback(async (message, history = [], onStream = null) => {
    if (!isInitialized) {
      throw new Error('Model not initialized. Please wait for initialization to complete.');
    }
    return await webLLMService.chat(message, history, onStream);
  }, [isInitialized]);

  const analyzeJournal = useCallback(async (journalText) => {
    if (!isInitialized) {
      throw new Error('Model not initialized.');
    }
    return await webLLMService.analyzeJournal(journalText);
  }, [isInitialized]);

  const generateRecommendations = useCallback(async (moodData) => {
    if (!isInitialized) {
      throw new Error('Model not initialized.');
    }
    return await webLLMService.generateTherapyRecommendations(moodData);
  }, [isInitialized]);

  const generateReport = useCallback(async (userData) => {
    if (!isInitialized) {
      throw new Error('Model not initialized.');
    }
    return await webLLMService.generateMentalHealthReport(userData);
  }, [isInitialized]);

  const cancelChat = useCallback(() => {
    return webLLMService.cancelChat();
  }, []);

  const retryInitialization = useCallback(async () => {
    setRetryCount(0); // Reset retry counter for fresh attempt
    await initialize(true);
  }, [initialize]);

  // Issue #19: Helper to manage preload preference
  const setPreloadEnabled = useCallback((enabled) => {
    localStorage.setItem('mindscribe_preload_model', enabled ? 'true' : 'false');
    console.log(`[Preload] Preference updated: ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const getPreloadEnabled = useCallback(() => {
    const preloadEnabled = localStorage.getItem('mindscribe_preload_model');
    return preloadEnabled === null || preloadEnabled === 'true';
  }, []);

  // Register initialize function with AuthContext for auto-initialization on login
  useEffect(() => {
    setWebLLMInitialize(initialize);
  }, [initialize]);

  // Issue #19: Intelligent Model Preloading Strategy
  // Preload model in background after app initialization to reduce perceived latency
  useEffect(() => {
    // Check if preloading is enabled (default: true)
    const preloadEnabled = localStorage.getItem('mindscribe_preload_model');
    const shouldPreload = preloadEnabled === null || preloadEnabled === 'true';
    
    if (!shouldPreload) {
      console.log('[Preload] Model preloading is disabled by user preference');
      return;
    }

    // Only preload if model is not already initialized or loading
    if (isInitialized || isLoading) {
      return;
    }

    // Issue #19: Delay preloading to avoid competing with critical UI rendering
    // According to best practices: Let the app fully render before heavy background tasks
    const preloadDelay = 2500; // 2.5 seconds - enough time for auth + initial render
    
    const preloadTimer = setTimeout(() => {
      console.log('[Preload] Starting background model initialization...');
      
      // Trigger initialization in background
      // WebLLMContext's initialize() already has:
      // - Progress tracking
      // - Error handling with auto-retry
      // - State management
      initialize().catch(err => {
        console.warn('[Preload] Background initialization failed:', err.message);
        // Error is already handled by initialize() - no need to re-throw
      });
    }, preloadDelay);

    // Cleanup timer on unmount or if conditions change
    return () => {
      clearTimeout(preloadTimer);
    };
  }, [isInitialized, isLoading, initialize]); // Re-evaluate when these change

  // CRITICAL FIX: Don't cleanup on unmount - WebLLMProvider should persist throughout app lifecycle
  // The provider wraps the entire app in App.jsx, so unmount = app closing
  // Aggressive cleanup causes "Module has already been disposed" errors during navigation
  // Model cleanup should only happen on: logout, model switch, or explicit unload

  const value = {
    isInitialized,
    isLoading,
    progress,
    error,
    availableModels,
    currentModel,
    selectModel,
    unloadModel,
    cleanup,
    initialize,
    chat,
    analyzeJournal,
    generateRecommendations,
    generateReport,
    cancelChat,
    retryInitialization,
    // Issue #19: Expose preload preference management
    setPreloadEnabled,
    getPreloadEnabled
  };

  return <WebLLMContext.Provider value={value}>{children}</WebLLMContext.Provider>;
};

export default WebLLMContext;
