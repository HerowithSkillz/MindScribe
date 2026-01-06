import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebLLM } from '../contexts/WebLLMContext';

// Inspirational mental health quotes
const MENTAL_HEALTH_QUOTES = [
  "Your mental health is a priority, not a luxury.",
  "Healing is not linear, and that's okay.",
  "You are stronger than you think.",
  "Every step forward, no matter how small, is progress.",
  "Your feelings are valid, and so are you.",
  "Self-care is not selfish, it's essential.",
  "You don't have to be positive all the time.",
  "It's okay to ask for help when you need it.",
  "Your story isn't over yet.",
  "Be patient with yourself, growth takes time.",
  "You are worthy of care, love, and support.",
  "Mental health matters just as much as physical health."
];

const ModelInitializationModal = () => {
  const { 
    isLoading, 
    isInitialized, 
    progress, 
    error, 
    retryInitialization,
    currentModel 
  } = useWebLLM();

  const [currentQuote, setCurrentQuote] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [minDisplayTimeElapsed, setMinDisplayTimeElapsed] = useState(false);

  // Rotate quotes every 5 seconds
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentQuote((prev) => (prev + 1) % MENTAL_HEALTH_QUOTES.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  // Show modal when loading starts - with minimum display time
  useEffect(() => {
    if (isLoading) {
      setShowModal(true);
      setMinDisplayTimeElapsed(false);
      
      // Minimum display time of 800ms to ensure user sees the modal
      const minTimer = setTimeout(() => {
        setMinDisplayTimeElapsed(true);
      }, 800);
      
      return () => clearTimeout(minTimer);
    }
  }, [isLoading]);

  // Handle modal visibility for error states
  useEffect(() => {
    if (error && !isInitialized) {
      setShowModal(true);
    }
  }, [error, isInitialized]);

  // Hide modal only after initialization succeeds AND minimum time elapsed
  useEffect(() => {
    if (isInitialized && !error && minDisplayTimeElapsed) {
      const timer = setTimeout(() => {
        setShowModal(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, error, minDisplayTimeElapsed]);

  // Calculate progress percentage
  const progressPercent = Math.round((progress.progress || 0) * 100);

  // Parse status message from progress.text
  const getStatusMessage = () => {
    if (error) {
      return error.message || 'Initialization failed';
    }
    if (isInitialized) {
      return '✓ Model ready! Starting MindScribe...';
    }
    return progress.text || 'Initializing AI Engine...';
  };

  // Determine status type for styling
  const getStatusType = () => {
    if (error) return 'error';
    if (isInitialized) return 'success';
    if (progress.text?.toLowerCase().includes('download')) return 'downloading';
    if (progress.text?.toLowerCase().includes('cache')) return 'cached';
    return 'loading';
  };

  const statusType = getStatusType();

  return (
    <AnimatePresence>
      {showModal && (
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
            transition={{ type: "spring", damping: 20 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
          >
            {/* Brain Icon Animation */}
            <div className="flex justify-center mb-6">
              <motion.div
                animate={
                  error
                    ? { scale: [1, 1.1, 1], rotate: [0, -10, 10, 0] }
                    : isInitialized
                    ? { scale: [1, 1.2, 1] }
                    : { scale: [1, 1.05, 1] }
                }
                transition={
                  error
                    ? { duration: 0.5, repeat: 0 }
                    : { duration: 2, repeat: Infinity }
                }
                className={`text-7xl ${
                  error
                    ? 'filter grayscale'
                    : isInitialized
                    ? ''
                    : 'animate-pulse'
                }`}
              >
                🧠
              </motion.div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
              {error
                ? 'Initialization Failed'
                : isInitialized
                ? 'Ready!'
                : 'Initializing MindScribe AI'}
            </h2>

            {/* Model Name */}
            {currentModel && !error && (
              <p className="text-sm text-center text-gray-500 mb-4">
                {currentModel.name}
              </p>
            )}

            {/* Status Message */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p
                className={`text-sm font-mono text-center ${
                  error
                    ? 'text-red-600'
                    : isInitialized
                    ? 'text-green-600'
                    : 'text-blue-600'
                }`}
              >
                {getStatusMessage()}
              </p>
            </div>

            {/* Progress Bar */}
            {!error && !isInitialized && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Success Checkmark */}
            {isInitialized && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex justify-center mb-4"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </motion.div>
            )}

            {/* Error State with Retry Button */}
            {error && error.canRetry && (
              <div className="space-y-4">
                {error.suggestion && (
                  <p className="text-sm text-gray-600 text-center">
                    {error.suggestion}
                  </p>
                )}
                <button
                  onClick={retryInitialization}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Retry Initialization
                </button>
              </div>
            )}

            {/* Auto-retry indicator */}
            {error && error.isAutoRetrying && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                />
                <span>Retrying automatically...</span>
              </div>
            )}

            {/* Inspirational Quote (shown during loading) */}
            {!error && !isInitialized && (
              <motion.div
                key={currentQuote}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 pt-6 border-t border-gray-200"
              >
                <p className="text-sm text-gray-600 text-center italic">
                  "{MENTAL_HEALTH_QUOTES[currentQuote]}"
                </p>
              </motion.div>
            )}

            {/* Loading Spinner for indeterminate progress */}
            {isLoading && progressPercent === 0 && !error && (
              <div className="flex justify-center mt-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModelInitializationModal;
