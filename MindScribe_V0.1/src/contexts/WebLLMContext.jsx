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
  const [showLoadingModal, setShowLoadingModal] = useState(false);

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
      setShowLoadingModal(false);
      console.log('WebLLM context cleaned up');
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }, []);

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

  const initialize = useCallback(async (isRetry = false) => {
    // CRITICAL FIX: Allow re-initialization after logout by checking only isLoading
    // Don't block if isInitialized is true - user might have logged out and back in
    if (isLoading) {
      console.log('Initialization already in progress, skipping duplicate call');
      return;
    }

    setIsLoading(true);
    setShowLoadingModal(true); // Show blocking modal during initialization
    setError(null);

    try {
      // Cleanup before retry to prevent cache corruption
      if (isRetry || isInitialized) {
        await webLLMService.unloadModel().catch(() => {});
        setIsInitialized(false);
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
      setProgress({ text: 'Model ready!', progress: 1, timeElapsed: 0 });
      
      // Hide modal after successful initialization
      setTimeout(() => setShowLoadingModal(false), 500);
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
        setShowLoadingModal(false); // Hide modal on final failure to allow retry button access
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isInitialized, retryCount]);

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

  // Register initialize function with AuthContext for auto-initialization on login
  useEffect(() => {
    setWebLLMInitialize(initialize);
  }, [initialize]);

  // Expose resetState globally for AuthContext to call on logout
  useEffect(() => {
    window.webLLMResetState = resetState;
    return () => {
      delete window.webLLMResetState;
    };
  }, [resetState]);

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
    showLoadingModal
  };

  return <WebLLMContext.Provider value={value}>{children}</WebLLMContext.Provider>;
};

export default WebLLMContext;
