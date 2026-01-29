import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import modelOrchestrator from '../services/modelOrchestrator';
import piperService from '../services/piper';
import audioRecorder from '../services/audioRecorder';
import voicePipeline from '../services/voicePipeline';
import voiceSessionStorage from '../services/voiceSessionStorage';
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
  const [sessionHistory, setSessionHistory] = useState([]);
  
  const recordingIntervalRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const currentSessionIdRef = useRef(null);
  const isInitializingRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const sessionActiveRef = useRef(false);

  /**
   * Initialize voice models - called when user navigates to Voice Therapy tab
   */
  const initializeVoiceModels = useCallback(async () => {
    if (isInitializingRef.current) {
      console.log('Initialization already in progress');
      return;
    }
    isInitializingRef.current = true;

    if (isReady || isLoading) {
      console.log('Voice models already initialized or loading');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('[VoiceContext] Initializing voice models...');

      // Step 1: Initialize voice session storage
      setLoadingProgress({ text: 'Initializing storage...', progress: 5 });
      await voiceSessionStorage.init();

      // Step 2: Switch to voice tab (unload WebLLM, load Whisper + Piper)
      setLoadingProgress({ text: 'Preparing voice therapy session...', progress: 20 });
      await modelOrchestrator.switchToVoiceTab();

      // Step 3: Initialize voice pipeline with VAD
      setLoadingProgress({ text: 'Initializing audio system and VAD...', progress: 70 });
      await voicePipeline.initialize({ useVAD: true });

      // Step 4: Load recent sessions
      setLoadingProgress({ text: 'Loading session history...', progress: 90 });
      await loadSessionHistory();

      setLoadingProgress({ text: 'Ready!', progress: 100 });
      setIsReady(true);
      console.log('✅ [VoiceContext] Voice models initialized successfully');

    } catch (err) {
      console.error('❌ Failed to initialize voice models:', err);
      setError(err.message || 'Failed to initialize voice therapy');
      setIsReady(false);
    } finally {
      setIsLoading(false);
      isInitializingRef.current = false;
    }
  }, [isReady, isLoading]);

  /**
   * Cleanup voice models - called when user leaves Voice Therapy tab
   */
  const cleanupVoiceModels = useCallback(async () => {
    if (isCleaningUpRef.current) {
      console.log('Cleanup already in progress');
      return;
    }
    isCleaningUpRef.current = true;

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
    } finally {
      isCleaningUpRef.current = false;
    }
  }, [sessionActive]);

  /**
   * Continuous listening mode - automatically detects speech and processes it
   */
  const startContinuousListening = useCallback(async () => {
    console.log('[VoiceContext] Starting continuous listening...');

    const processAudioLoop = async () => {
      // Exit if session is no longer active
      if (!sessionActiveRef.current) {
        console.log('[VoiceContext] Session ended, stopping continuous listening');
        return;
      }

      try {
        // Start recording
        console.log('[VoiceContext] Starting recording...');
        setIsRecording(true);
        setError(null);

        await audioRecorder.startRecording();

        console.log('✅ Recording started');

        // Wait for 3 seconds of audio
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Stop recording
        if (!sessionActiveRef.current) return; // Check again before stopping

        console.log('[VoiceContext] Stopping recording...');
        const audioData = await audioRecorder.stopRecording();
        setIsRecording(false);

        // Process the audio
        if (audioData && audioData.length > 0) {
          console.log('[VoiceContext] Processing audio...');
          setIsProcessing(true);

          try {
            const result = await voicePipeline.processVoiceInput(audioData);

            // Add to conversation history
            const newConversation = {
              user: result.userText,
              ai: result.aiResponse,
              timestamp: new Date().toISOString(),
              processingTime: result.processingTime
            };

            setConversationHistory(prev => [...prev, newConversation]);

            // Play AI response and wait for it to finish
            setIsSpeaking(true);
            // voicePipeline.processVoiceInput already plays the audio and returns after completion
            setIsSpeaking(false);

            console.log('✅ Audio processed successfully');

          } catch (error) {
            console.error('❌ Voice pipeline error:', error);
            
            // Don't show "No speech detected" as error - just continue listening
            if (!error.message?.includes('No speech detected')) {
              setError(error.message || 'Failed to process voice input');
            }
          } finally {
            setIsProcessing(false);
          }
        }

        // Continue the loop if session is still active
        if (sessionActiveRef.current) {
          // Small delay before next cycle
          setTimeout(processAudioLoop, 500);
        }

      } catch (error) {
        console.error('❌ Failed in continuous listening:', error);
        setIsRecording(false);
        setIsProcessing(false);
        
        // Continue the loop even if there was an error
        if (sessionActiveRef.current) {
          setTimeout(processAudioLoop, 1000);
        }
      }
    };

    // Start the loop
    processAudioLoop();
  }, []);

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
      sessionActiveRef.current = true;
      sessionStartTimeRef.current = Date.now();
      setConversationHistory([]);
      setError(null);

      console.log('✅ Voice therapy session started');

      // NOTE: No longer auto-start continuous listening
      // User will manually toggle mic with toggleMic()

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

    console.log('[VoiceContext] Ending voice therapy session...');

    // Stop the continuous listening loop by setting sessionActive to false
    setSessionActive(false);
    sessionActiveRef.current = false;
    setIsRecording(false);
    setIsProcessing(false);
    setIsSpeaking(false);

    try {

      // Stop recording if active (don't await to avoid delays)
      if (isRecording) {
        setIsRecording(false);
        try {
          audioRecorder.stopRecording();
        } catch (err) {
          console.warn('Recording already stopped:', err.message);
        }
      }

      // Stop any audio playback
      voicePipeline.stopAudio();

      // End voice pipeline session
      const session = await voicePipeline.endSession();

      // Save session to IndexedDB storage
      try {
        const sessionDuration = (Date.now() - sessionStartTimeRef.current) / 1000;
        const sessionData = {
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          userId: user?.username || 'default',
          duration: sessionDuration,
          conversationHistory: conversationHistory,
          processingMetrics: processingMetrics,
          vadEnabled: voicePipeline.getVADState()?.isInitialized || false,
          whisperModel: 'base.en',
          piperVoice: 'lessac-medium',
          averageLatency: processingMetrics?.total || 0
        };

        // DISABLED: Voice therapy sessions are NOT saved for privacy
        // User explicitly requested no storage of voice therapy communications
        // currentSessionIdRef.current = await voiceSessionStorage.saveSession(sessionData);
        console.log(`✅ Session ended (not saved - privacy mode)`);

        // Session history reload disabled
        // await loadSessionHistory();
      } catch (storageError) {
        console.error('❌ Failed to save session:', storageError);
        // Continue even if storage fails
      }

      // TODO: Save session to storage (encrypted)
      // const sessionData = {
      //   ...session,
      //   username: user.username,
      //   sessionDuration: (Date.now() - sessionStartTimeRef.current) / 1000
      // };
      // await voiceSessionStorage.save(`voice_session_${Date.now()}`, sessionData);

      // setSessionActive already set to false at start of function
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
   * Toggle microphone - Press to record, release to process
   * This replaces the continuous auto-listening mode
   */
  const toggleMic = useCallback(async () => {
    if (!sessionActive) {
      console.warn('No active session');
      return;
    }

    // If currently recording, stop and process
    if (isRecording) {
      try {
        console.log('[VoiceContext] Stopping recording and processing...');
        
        setIsRecording(false);

        // Clear recording interval
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }

        // Get recorded audio
        const audioData = await audioRecorder.stopRecording();
        
        if (!audioData || audioData.length === 0) {
          console.warn('No audio recorded');
          return;
        }

        // Check minimum duration (at least 0.5 seconds)
        const audioDuration = audioData.length / 16000;
        if (audioDuration < 0.5) {
          console.warn('Recording too short, ignoring');
          return;
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
        if (result.audioOutput && result.audioOutput.length > 0) {
          const playbackDuration = (result.audioOutput.length / 22050) * 1000;
          setTimeout(() => {
            setIsSpeaking(false);
          }, playbackDuration);
        } else {
          setIsSpeaking(false);
        }

        setIsProcessing(false);
        console.log('✅ Audio processed successfully');

      } catch (err) {
        console.error('❌ Failed to process recording:', err);
        // Don't show "No speech detected" as a user-facing error
        if (!err.message?.includes('No speech detected')) {
          setError(err.message || 'Failed to process audio');
        }
        setIsProcessing(false);
        setIsSpeaking(false);
      }
    } else {
      // Start recording
      try {
        console.log('[VoiceContext] Starting recording...');
        
        await audioRecorder.startRecording();
        setIsRecording(true);
        setRecordingDuration(0);
        setError(null); // Clear any previous error

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
    }
  }, [sessionActive, isRecording]);

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    voicePipeline.clearHistory();
    setConversationHistory([]);
    console.log('Conversation history cleared');
  }, []);

  /**
   * Load session history from storage
   */
  const loadSessionHistory = useCallback(async () => {
    try {
      const sessions = await voiceSessionStorage.getAllSessions({
        limit: 50,
        sortBy: 'timestamp',
        sortOrder: 'desc',
        includeConversations: false
      });
      setSessionHistory(sessions);
      console.log(`Loaded ${sessions.length} sessions from history`);
    } catch (error) {
      console.error('Failed to load session history:', error);
    }
  }, []);

  /**
   * Get specific session by ID
   */
  const getSession = useCallback(async (sessionId) => {
    try {
      return await voiceSessionStorage.getSession(sessionId);
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }, []);

  /**
   * Delete session by ID
   */
  const deleteSession = useCallback(async (sessionId) => {
    try {
      await voiceSessionStorage.deleteSession(sessionId);
      await loadSessionHistory();
      console.log(`Session ${sessionId} deleted`);
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }, [loadSessionHistory]);

  /**
   * Export session history
   */
  const exportSessionHistory = useCallback(async () => {
    try {
      const jsonData = await voiceSessionStorage.exportSessions();
      
      // Create download link
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindscribe-voice-sessions-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Session history exported successfully');
    } catch (error) {
      console.error('Failed to export sessions:', error);
      throw error;
    }
  }, []);

  /**
   * Get session statistics
   */
  const getSessionStatistics = useCallback(async () => {
    try {
      return await voiceSessionStorage.getStatistics();
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return null;
    }
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

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Cleanup resources when component unmounts
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // Note: endSession not called here to prevent premature cleanup
    };
  }, []);

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
    sessionHistory,
    
    // Actions
    initializeVoiceModels,
    cleanupVoiceModels,
    startSession,
    endSession,
    startRecording,
    stopRecording,
    toggleMic,  // New: Manual mic toggle (press to record, press again to process)
    cancelAudio,
    clearHistory,
    getSessionDuration,
    
    // Session Management
    loadSessionHistory,
    getSession,
    deleteSession,
    exportSessionHistory,
    getSessionStatistics
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};
