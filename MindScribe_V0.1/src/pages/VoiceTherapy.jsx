import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from '../contexts/VoiceContext';
import VoiceSessionControls from '../components/VoiceSessionControls';
import ConversationDisplay from '../components/ConversationDisplay';
import VoiceVisualizer from '../components/VoiceVisualizer';

/**
 * Voice Therapy Page
 * 
 * Main page for voice-to-voice AI therapy sessions
 * Features:
 * - Offline voice processing using Whisper.cpp + Piper TTS
 * - Real-time conversation with AI therapist
 * - Push-to-talk interface
 * - Privacy-first design (no data transmission)
 */
const VoiceTherapy = () => {
  const {
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
    initializeVoiceModels,
    cleanupVoiceModels,
    startSession,
    endSession,
    startRecording,
    stopRecording,
    clearHistory
  } = useVoice();

  // Prevent re-initialization on every render
  const hasInitialized = useRef(false);

  // Initialize voice models when component mounts (only once)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initializeVoiceModels();
    }

    // Cleanup when leaving page
    return () => {
      cleanupVoiceModels();
    };
  }, []); // Empty deps array - run only on mount/unmount

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🎙️ Voice Therapy
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Natural voice conversations with your AI therapist
          </p>
        </motion.div>

        {/* Loading State - Full Screen Modal */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
              >
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🎙️</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Initializing Voice Therapy
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Setting up voice models...
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {loadingProgress.text}
                    </span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {Math.round(loadingProgress.progress)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${loadingProgress.progress}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                    />
                  </div>
                </div>

                {/* Loading Steps */}
                <div className="space-y-3 mb-6">
                  <div className={`flex items-center gap-3 text-sm ${loadingProgress.progress >= 5 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${loadingProgress.progress >= 5 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      {loadingProgress.progress >= 5 ? '✓' : '○'}
                    </div>
                    <span>Loading WebLLM model</span>
                  </div>
                  <div className={`flex items-center gap-3 text-sm ${loadingProgress.progress >= 20 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${loadingProgress.progress >= 20 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      {loadingProgress.progress >= 20 ? '✓' : '○'}
                    </div>
                    <span>Initializing Whisper (Speech Recognition)</span>
                  </div>
                  <div className={`flex items-center gap-3 text-sm ${loadingProgress.progress >= 70 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${loadingProgress.progress >= 70 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      {loadingProgress.progress >= 70 ? '✓' : '○'}
                    </div>
                    <span>Loading Piper (Text-to-Speech)</span>
                  </div>
                  <div className={`flex items-center gap-3 text-sm ${loadingProgress.progress >= 90 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${loadingProgress.progress >= 90 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      {loadingProgress.progress >= 90 ? '✓' : '○'}
                    </div>
                    <span>Preparing voice pipeline</span>
                  </div>
                </div>

                {/* Info Message */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300 text-center">
                    💾 Models are cached locally after first download
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto mb-6"
          >
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 dark:text-red-100">Error</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {isReady && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Left Column: Controls & Visualizer */}
              <div className="lg:col-span-1 space-y-6">
                {/* Session Controls */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <VoiceSessionControls
                    sessionActive={sessionActive}
                    isRecording={isRecording}
                    isProcessing={isProcessing}
                    isSpeaking={isSpeaking}
                    recordingDuration={recordingDuration}
                    onStartSession={startSession}
                    onEndSession={endSession}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    conversationHistory={conversationHistory}
                  />
                </div>

                {/* Visualizer */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <VoiceVisualizer
                    isRecording={isRecording}
                    isSpeaking={isSpeaking}
                    processingMetrics={processingMetrics}
                  />
                </div>
              </div>

              {/* Right Column: Conversation */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[600px]">
                  {/* Conversation Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">Conversation</h2>
                        <p className="text-sm text-blue-100">
                          {sessionActive ? 'Session active' : 'Start a session to begin'}
                        </p>
                      </div>
                      {sessionActive && conversationHistory.length > 0 && (
                        <button
                          onClick={clearHistory}
                          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                          title="Clear conversation"
                        >
                          🗑️ Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Conversation Display */}
                  <ConversationDisplay
                    conversationHistory={conversationHistory}
                    isProcessing={isProcessing}
                    isSpeaking={isSpeaking}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature Info (shown when not ready) */}
        {!isReady && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto mt-12"
          >
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="font-semibold text-lg mb-2">100% Private</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All voice processing happens locally on your device. No data is transmitted.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-semibold text-lg mb-2">Real-time</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Low-latency voice-to-voice conversations with natural turn-taking.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="text-4xl mb-3">🌐</div>
                <h3 className="font-semibold text-lg mb-2">Offline Ready</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Works completely offline after initial model download.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VoiceTherapy;
