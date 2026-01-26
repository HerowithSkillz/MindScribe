import React from 'react';
import { motion } from 'framer-motion';

/**
 * Voice Session Controls Component
 * 
 * Provides controls for voice therapy session:
 * - Start/End session
 * - Push-to-talk button
 * - Session status indicators
 * - Recording timer
 */
const VoiceSessionControls = ({
  sessionActive,
  isRecording,
  isProcessing,
  isSpeaking,
  recordingDuration,
  onStartSession,
  onEndSession,
  onStartRecording,
  onStopRecording,
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
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎙️ Start Voice Session
          </motion.button>
        ) : (
          <>
            {/* Push-to-Talk Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onMouseDown={!isRecording && !isProcessing && !isSpeaking ? onStartRecording : null}
              onMouseUp={isRecording ? onStopRecording : null}
              onTouchStart={!isRecording && !isProcessing && !isSpeaking ? onStartRecording : null}
              onTouchEnd={isRecording ? onStopRecording : null}
              disabled={isProcessing || isSpeaking || disabled}
              className={`relative w-24 h-24 rounded-full shadow-lg transition-all ${
                isRecording
                  ? 'bg-red-500 shadow-red-500/50 animate-pulse'
                  : isProcessing || isSpeaking
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-br from-green-400 to-blue-500 hover:shadow-xl hover:shadow-blue-500/50'
              } disabled:opacity-50`}
            >
              <div className="text-4xl">
                {isRecording ? '🎤' : isProcessing ? '⚙️' : isSpeaking ? '🔊' : '🎙️'}
              </div>
              
              {/* Recording pulse effect */}
              {isRecording && (
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-red-400"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
            </motion.button>

            {/* End Session Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEndSession}
              disabled={isRecording || isProcessing || disabled}
              className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium shadow-md hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏹️ End Session
            </motion.button>
          </>
        )}
      </div>

      {/* Recording Timer */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-mono text-sm">
              {formatDuration(recordingDuration)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        {!sessionActive ? (
          <p>Click "Start Voice Session" to begin your therapy conversation</p>
        ) : (
          <p>
            {isRecording
              ? 'Release to send your message'
              : isProcessing || isSpeaking
              ? 'Please wait...'
              : 'Hold the microphone button to speak'}
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceSessionControls;
