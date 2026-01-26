import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import modelOrchestrator from '../services/modelOrchestrator';
import whisperService from '../services/whisper';
import piperService from '../services/piper';
import audioRecorder from '../services/audioRecorder';
import voicePipeline from '../services/voicePipeline';
import { useAuth } from './AuthContext';

const VoiceContext = createContext(null);

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within VoiceProvider');
  }
  return context;
};

export const VoiceProvider = ({ children }) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState({ text: '', progress: 0 });
  const [conversationHistory, setConversationHistory] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [processingMetrics, setProcessingMetrics] = useState(null);
  
  const recordingIntervalRef = useRef(null);
  const sessionStartTimeRef = useRef(null);

  /**
   * Initialize voice models - called when user navigates to Voice Therapy tab
   */
  const initializeVoiceModels = useCallback(async () => {
    if (isReady || isLoading) {
      console.log('Voice models already initialized or loading');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('[VoiceContext] Initializing voice models...');

      // Step 1: Switch to voice tab (unload WebLLM, load Whisper + Piper)
      setLoadingProgress({ text: 'Preparing voice therapy session...', progress: 10 });
      await modelOrchestrator.switchToVoiceTab();

      // Step 2: Initialize voice pipeline
      setLoadingProgress({ text: 'Initializing audio system...', progress: 80 });
      await voicePipeline.initialize();

      setLoadingProgress({ text: 'Ready!', progress: 100 });
      setIsReady(true);
      console.log('✅ [VoiceContext] Voice models initialized successfully');

    } catch (err) {
      console.error('❌ Failed to initialize voice models:', err);
      setError(err.message || 'Failed to initialize voice therapy');
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, [isReady, isLoading]);

  /**
   * Cleanup voice models - called when user leaves Voice Therapy tab
   */
  const cleanupVoiceModels = useCallback(async () => {
    try {
      console.log('[VoiceContext] Cleaning up voice models...');

      // End session if active
      if (sessionActive) {
        await endSession();
      }

      // Switch back from voice tab (unload Whisper + Piper, restore WebLLM)
      await modelOrchestrator.switchFromVoiceTab();

      // Cleanup voice pipeline
      await voicePipeline.cleanup();

      setIsReady(false);
      setConversationHistory([]);
      console.log('✅ [VoiceContext] Voice models cleaned up');

    } catch (err) {
      console.error('❌ Failed to cleanup voice models:', err);
    }
  }, [sessionActive]);

  /**
   * Start voice therapy session
   */
  const startSession = useCallback(async () => {
    if (!isReady) {
      console.warn('Voice models not ready');
      return;
    }

    if (sessionActive) {
      console.warn('Session already active');
      return;
    }

    try {
      console.log('[VoiceContext] Starting voice therapy session...');
      
      // Initialize audio recorder
      await audioRecorder.initialize();

      // Start voice pipeline session
      await voicePipeline.startSession();

      setSessionActive(true);
      sessionStartTimeRef.current = Date.now();
      setConversationHistory([]);
      setError(null);

      console.log('✅ Voice therapy session started');

    } catch (err) {
      console.error('❌ Failed to start session:', err);
      setError(err.message || 'Failed to start voice therapy session');
    }
  }, [isReady, sessionActive]);

  /**
   * End voice therapy session
   */
  const endSession = useCallback(async () => {
    if (!sessionActive) {
      console.warn('No active session to end');
      return;
    }

    try {
      console.log('[VoiceContext] Ending voice therapy session...');

      // Stop recording if active
      if (isRecording) {
        await stopRecording();
      }

      // Stop any audio playback
      voicePipeline.stopAudio();

      // End voice pipeline session
      const session = await voicePipeline.endSession();

      // TODO: Save session to storage (encrypted)
      // const sessionData = {
      //   ...session,
      //   username: user.username,
      //   sessionDuration: (Date.now() - sessionStartTimeRef.current) / 1000
      // };
      // await voiceSessionStorage.save(`voice_session_${Date.now()}`, sessionData);

      setSessionActive(false);
      setIsRecording(false);
      setIsProcessing(false);
      setIsSpeaking(false);

      // Clear recording interval
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      console.log('✅ Voice therapy session ended');
      return session;

    } catch (err) {
      console.error('❌ Failed to end session:', err);
      setError(err.message || 'Failed to end session');
    }
  }, [sessionActive, isRecording, user]);

  /**
   * Start recording audio from microphone
   */
  const startRecording = useCallback(async () => {
    if (!sessionActive) {
      console.warn('No active session');
      return;
    }

    if (isRecording) {
      console.warn('Already recording');
      return;
    }

    try {
      console.log('[VoiceContext] Starting recording...');
      
      await audioRecorder.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);

      // Update recording duration every 100ms
      recordingIntervalRef.current = setInterval(() => {
        const duration = audioRecorder.getRecordingDuration();
        setRecordingDuration(duration);
      }, 100);

      console.log('✅ Recording started');

    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      setError(err.message || 'Failed to start recording');
      setIsRecording(false);
    }
  }, [sessionActive, isRecording]);

  /**
   * Stop recording and process audio
   */
  const stopRecording = useCallback(async () => {
    if (!isRecording) {
      console.warn('Not recording');
      return;
    }

    try {
      console.log('[VoiceContext] Stopping recording...');
      
      setIsRecording(false);

      // Clear recording interval
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      // Get recorded audio
      const audioData = await audioRecorder.stopRecording();
      
      if (!audioData || audioData.length === 0) {
        throw new Error('No audio recorded');
      }

      // Process audio through voice pipeline
      setIsProcessing(true);
      console.log('[VoiceContext] Processing audio...');

      const result = await voicePipeline.processVoiceInput(audioData);

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: result.transcript, timestamp: Date.now() },
        { role: 'assistant', content: result.aiResponse, timestamp: Date.now() }
      ]);

      // Update processing metrics
      setProcessingMetrics(result.processingTime);

      // Set speaking state while audio plays
      setIsSpeaking(true);
      
      // Wait for audio to finish playing (estimate based on audio length)
      const audioDuration = (result.audioOutput.length / 22050) * 1000;
      setTimeout(() => {
        setIsSpeaking(false);
      }, audioDuration);

      setIsProcessing(false);
      console.log('✅ Audio processed successfully');

    } catch (err) {
      console.error('❌ Failed to stop recording:', err);
      setError(err.message || 'Failed to process audio');
      setIsProcessing(false);
      setIsSpeaking(false);
    }
  }, [isRecording]);

  /**
   * Cancel ongoing audio playback
   */
  const cancelAudio = useCallback(() => {
    voicePipeline.stopAudio();
    setIsSpeaking(false);
  }, []);

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    voicePipeline.clearHistory();
    setConversationHistory([]);
    console.log('Conversation history cleared');
  }, []);

  /**
   * Get session duration in seconds
   */
  const getSessionDuration = useCallback(() => {
    if (!sessionActive || !sessionStartTimeRef.current) {
      return 0;
    }
    return (Date.now() - sessionStartTimeRef.current) / 1000;
  }, [sessionActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup resources when component unmounts
      if (sessionActive) {
        endSession();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [sessionActive, endSession]);

  const value = {
    // State
    isReady,
    isLoading,
    isRecording,
    isProcessing,
    isSpeaking,
    error,
    loadingProgress,
    conversationHistory,
    sessionActive,
    recordingDuration,
    processingMetrics,
    
    // Actions
    initializeVoiceModels,
    cleanupVoiceModels,
    startSession,
    endSession,
    startRecording,
    stopRecording,
    cancelAudio,
    clearHistory,
    getSessionDuration
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};
