import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Voice Visualizer Component
 * 
 * Displays real-time audio waveform visualization
 * Shows audio levels during recording and playback
 */
const VoiceVisualizer = ({ isRecording, isSpeaking, processingMetrics }) => {
  const [audioLevels, setAudioLevels] = useState(Array(20).fill(0));
  const animationRef = useRef(null);

  useEffect(() => {
    if (isRecording || isSpeaking) {
      startVisualization();
    } else {
      stopVisualization();
    }

    return () => stopVisualization();
  }, [isRecording, isSpeaking]);

  const startVisualization = () => {
    const animate = () => {
      // Generate random audio levels for visualization
      // In production, this would read actual audio data from AudioContext
      const newLevels = Array(20).fill(0).map(() => {
        return Math.random() * 0.7 + 0.3; // Random heights between 0.3 and 1.0
      });
      setAudioLevels(newLevels);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const stopVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    // Fade out to zero
    setAudioLevels(Array(20).fill(0));
  };

  return (
    <div className="space-y-4">
      {/* Waveform Visualization */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center gap-1 h-24">
          {audioLevels.map((level, index) => (
            <motion.div
              key={index}
              className={`w-2 rounded-full ${
                isRecording
                  ? 'bg-gradient-to-t from-red-500 to-red-300'
                  : isSpeaking
                  ? 'bg-gradient-to-t from-purple-500 to-purple-300'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              animate={{
                height: `${level * 100}%`,
              }}
              transition={{
                duration: 0.1,
                ease: "easeOut"
              }}
            />
          ))}
        </div>

        {/* Status Text */}
        <div className="text-center mt-4">
          <p className={`text-sm font-medium ${
            isRecording
              ? 'text-red-500'
              : isSpeaking
              ? 'text-purple-500'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {isRecording ? '🎤 Recording...' : isSpeaking ? '🔊 Playing...' : '⏸️ Idle'}
          </p>
        </div>
      </div>

      {/* Processing Metrics */}
      {processingMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
        >
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📊 Performance Metrics
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Speech-to-Text:</span>
              <span className="ml-2 font-mono text-blue-600 dark:text-blue-400">
                {processingMetrics.stt?.toFixed(0)}ms
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">AI Response:</span>
              <span className="ml-2 font-mono text-blue-600 dark:text-blue-400">
                {processingMetrics.llm?.toFixed(0)}ms
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Text-to-Speech:</span>
              <span className="ml-2 font-mono text-blue-600 dark:text-blue-400">
                {processingMetrics.tts?.toFixed(0)}ms
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total:</span>
              <span className="ml-2 font-mono font-semibold text-blue-700 dark:text-blue-300">
                {processingMetrics.total?.toFixed(0)}ms
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Target: &lt;500ms end-to-end latency
          </div>
        </motion.div>
      )}

      {/* Privacy Notice */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-2">
          <span className="text-green-600 dark:text-green-400 text-lg">🔒</span>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
              100% Private & Offline
            </h4>
            <p className="text-xs text-green-700 dark:text-green-300">
              All voice processing happens locally on your device. No audio is sent to servers or stored permanently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceVisualizer;
