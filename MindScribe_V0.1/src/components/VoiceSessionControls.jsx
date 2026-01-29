import React from 'react';
import { motion } from 'framer-motion';

/**
 * Voice Session Controls Component
 * 
 * Provides controls for voice therapy session:
 * - Start/End session
 * - Manual mic toggle button (press to record, press to stop and process)
 * - Session status indicators
 * - Recording timer
 */
const VoiceSessionControls = ({
  sessionActive,
  isRecording,
  isProcessing,
  isSpeaking,
  recordingDuration,
  conversationHistory = [],
  onStartSession,
  onEndSession,
  onToggleMic,  // New: Single toggle function for mic
  disabled = false
}) => {

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (isSpeaking) return 'AI is speaking...';
    if (isProcessing) return 'Processing...';
    if (isRecording) return 'Listening...';
    if (sessionActive) return 'Ready to listen';
    return 'Session not started';
  };

  const getStatusColor = () => {
    if (isSpeaking) return 'text-purple-400';
    if (isProcessing) return 'text-yellow-400';
    if (isRecording) return 'text-red-400';
    if (sessionActive) return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Session Status */}
      <div className="text-center">
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        {sessionActive && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {conversationHistory?.length || 0} exchanges
          </div>
        )}
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4">
        {!sessionActive ? (
          /* Start Session Button */
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartSession}
            disabled={disabled}
            className="px-10 py-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-xl shadow-2xl hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎙️ Start Session
          </motion.button>
        ) : (
          /* Session Active: Show Mic Toggle and End Session */
          <div className="flex flex-col items-center gap-4">
            {/* Mic Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleMic}
              disabled={disabled || isProcessing || isSpeaking}
              className={`w-24 h-24 rounded-full font-bold text-3xl shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                isRecording
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white animate-pulse shadow-red-500/50'
                  : 'bg-gradient-to-r from-green-500 to-teal-600 text-white hover:shadow-green-500/50'
              }`}
            >
              {isRecording ? '⏹️' : '🎤'}
            </motion.button>
            
            {/* Recording duration */}
            {isRecording && (
              <div className="text-red-500 font-mono text-lg font-semibold">
                {formatDuration(recordingDuration)}
              </div>
            )}
            
            {/* End Session Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEndSession}
              disabled={disabled || isRecording || isProcessing}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              End Session
            </motion.button>
          </div>
        )}
      </div>

      {/* Visual Indicator for Session State */}
      {sessionActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center"
        >
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center ${
            isSpeaking
              ? 'bg-purple-500/20'
              : isProcessing
              ? 'bg-yellow-500/20'
              : isRecording
              ? 'bg-red-500/20'
              : 'bg-green-500/20'
          }`}>
            <div className="text-6xl">
              {isSpeaking ? '🔊' : isProcessing ? '⚙️' : isRecording ? '🎤' : '👂'}
            </div>
            
            {/* Animated pulse rings */}
            {(isRecording || isSpeaking) && (
              <>
                <motion.div
                  className={`absolute inset-0 rounded-full border-4 ${
                    isRecording ? 'border-red-400' : 'border-purple-400'
                  }`}
                  animate={{
                    scale: [1, 1.4],
                    opacity: [0.8, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
                <motion.div
                  className={`absolute inset-0 rounded-full border-4 ${
                    isRecording ? 'border-red-400' : 'border-purple-400'
                  }`}
                  animate={{
                    scale: [1, 1.4],
                    opacity: [0.8, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.5
                  }}
                />
              </>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Session Active Indicator */}
      {sessionActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            isRecording 
              ? 'bg-red-500/10 border border-red-500/30' 
              : isProcessing 
              ? 'bg-yellow-500/10 border border-yellow-500/30'
              : isSpeaking
              ? 'bg-purple-500/10 border border-purple-500/30'
              : 'bg-green-500/10 border border-green-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              isRecording ? 'bg-red-500' : isProcessing ? 'bg-yellow-500' : isSpeaking ? 'bg-purple-500' : 'bg-green-500'
            }`} />
            <span className={`font-medium text-sm ${
              isRecording ? 'text-red-400' : isProcessing ? 'text-yellow-400' : isSpeaking ? 'text-purple-400' : 'text-green-400'
            }`}>
              {isRecording ? 'Recording...' : isProcessing ? 'Processing...' : isSpeaking ? 'AI Speaking...' : 'Ready'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto space-y-2">
        {!sessionActive ? (
          <>
            <p className="font-medium">Ready to start your therapy session?</p>
            <p className="text-xs">Click "Start Session" to begin.</p>
          </>
        ) : (
          <>
            <p className="font-medium">
              {isSpeaking
                ? '🔊 AI is responding...'
                : isProcessing
                ? '⚙️ Processing your message...'
                : isRecording
                ? '🎤 Recording... Tap mic to stop'
                : '👆 Tap the mic to speak'}
            </p>
            <p className="text-xs">
              Press the mic button to record your message, then press again to send
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceSessionControls;
