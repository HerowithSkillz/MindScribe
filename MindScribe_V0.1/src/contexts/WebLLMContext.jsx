import React, { createContext, useContext, useState, useCallback } from 'react';
import webLLMService from '../services/webllm';

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
  const [progress, setProgress] = useState({ text: '', progress: 0 });
  const [error, setError] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [currentModel, setCurrentModel] = useState(null);

  // Load available models on mount
  React.useEffect(() => {
    const models = webLLMService.getAvailableModels();
    setAvailableModels(models);
    const currentModelId = webLLMService.getCurrentModel();
    const currentModelObj = models.find(m => m.id === currentModelId);
    setCurrentModel(currentModelObj);
  }, []);

  const selectModel = useCallback((modelId) => {
    try {
      webLLMService.setModel(modelId);
      const currentModelId = webLLMService.getCurrentModel();
      const models = webLLMService.getAvailableModels();
      const currentModelObj = models.find(m => m.id === currentModelId);
      setCurrentModel(currentModelObj);
    } catch (err) {
      console.error('Failed to select model:', err);
      throw err; // Re-throw for caller to handle
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

  const initialize = useCallback(async () => {
    if (isInitialized || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await webLLMService.initialize((progressReport) => {
        setProgress({
          text: progressReport.text || 'Loading model...',
          progress: progressReport.progress || 0
        });
      });

      setIsInitialized(true);
      setProgress({ text: 'Model ready!', progress: 1 });
    } catch (err) {
      console.error('WebLLM initialization failed:', err);
      setError(err.message || 'Failed to initialize AI model');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isLoading]);

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
    cancelChat
  };

  return <WebLLMContext.Provider value={value}>{children}</WebLLMContext.Provider>;
};

export default WebLLMContext;
