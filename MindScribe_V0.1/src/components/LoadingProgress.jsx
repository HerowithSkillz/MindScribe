import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebLLM } from '../contexts/WebLLMContext';

const LoadingProgress = () => {
  const { isLoading, progress, currentModel, isInitialized } = useWebLLM();
  const [show, setShow] = useState(false);
  
  // Enhanced stage detection based on WebLLM's progress.text
  const loadingStage = useMemo(() => {
    const text = progress.text?.toLowerCase() || '';
    const progressValue = progress.progress || 0;
    
    // WebLLM progress stages based on documentation:
    // 1. Fetching/Downloading - getting model files from network
    // 2. Loading - loading into WebGPU memory
    // 3. Initializing - setting up model for inference
    
    if (text.includes('fetching') || text.includes('downloading') || text.includes('download')) {
      return {
        type: 'downloading',
        icon: '📥',
        message: 'Downloading model files...',
        color: 'blue',
        detail: 'First-time download (will be cached)'
      };
    }
    
    if (text.includes('loading') || text.includes('load ')) {
      return {
        type: 'loading',
        icon: '⚡',
        message: 'Loading into GPU memory...',
        color: 'purple',
        detail: 'Preparing model for inference'
      };
    }
    
    if (text.includes('initializing') || text.includes('init')) {
      return {
        type: 'initializing',
        icon: '🔧',
        message: 'Initializing AI engine...',
        color: 'indigo',
        detail: 'Setting up model parameters'
      };
    }
    
    if (text.includes('finish') || text.includes('ready') || progressValue >= 1) {
      return {
        type: 'ready',
        icon: '✅',
        message: 'Model ready!',
        color: 'green',
        detail: 'AI is ready to use'
      };
    }
    
    if (text.includes('cache') || text.includes('cached')) {
      return {
        type: 'cached',
        icon: '💾',
        message: 'Loading from cache...',
        color: 'teal',
        detail: 'Using previously downloaded model'
      };
    }
    
    // Default loading state
    return {
      type: 'loading',
      icon: '⏳',
      message: 'Preparing model...',
      color: 'blue',
      detail: text || 'Loading...'
    };
  }, [progress.text, progress.progress]);
  
  // Calculate estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    const elapsed = progress.timeElapsed || 0;
    const progressValue = progress.progress || 0;
    
    if (progressValue === 0 || elapsed === 0) return 'Calculating...';
    if (progressValue >= 0.99) return 'Almost done...';
    
    // Estimate based on current progress rate
    const estimatedTotal = elapsed / progressValue;
    const remaining = estimatedTotal - elapsed;
    
    if (remaining < 10) return 'Less than 10 seconds';
    if (remaining < 30) return 'Less than 30 seconds';
    if (remaining < 60) return 'Less than 1 minute';
    if (remaining < 120) return '1-2 minutes';
    if (remaining < 180) return '2-3 minutes';
    return '3+ minutes';
  }, [progress.timeElapsed, progress.progress]);

  useEffect(() => {
    if (isLoading) {
      setShow(true);
    } else if (isInitialized && show) {
      // Hide after 2 seconds on success
      const timer = setTimeout(() => {
        setShow(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isInitialized, show]);

  if (!show) return null;

  const progressPercent = Math.round((progress.progress || 0) * 100);
  const isComplete = progressPercent >= 100 || isInitialized;
  const statusType = isComplete ? 'success' : loadingStage.type;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div className={`
            rounded-xl shadow-2xl overflow-hidden
            ${
              statusType === 'success' ? 'bg-green-50 border-2 border-green-500' :
              statusType === 'downloading' ? 'bg-blue-50 border-2 border-blue-500' :
              statusType === 'cached' ? 'bg-teal-50 border-2 border-teal-500' :
              statusType === 'loading' ? 'bg-purple-50 border-2 border-purple-500' :
              'bg-white border-2 border-primary'
            }
          `}>
            {/* Header */}
            <div className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon with stage-specific emoji */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-2xl
                    ${
                      statusType === 'success' ? 'bg-green-500' :
                      statusType === 'downloading' ? 'bg-blue-500' :
                      statusType === 'cached' ? 'bg-teal-500' :
                      statusType === 'loading' ? 'bg-purple-500' :
                      'bg-primary'
                    }
                  `}>
                    {/* Stage-specific emoji icons */}
                    {isComplete ? (
                      <span className="text-2xl">✅</span>
                    ) : (
                      <motion.span
                        key={loadingStage.icon}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl"
                      >
                        {loadingStage.icon}
                      </motion.span>
                    )}
                  </div>

                  {/* Text with stage details */}
                  <div className="flex-1">
                    <h3 className={`
                      text-sm font-bold
                      ${
                        statusType === 'success' ? 'text-green-900' :
                        statusType === 'downloading' ? 'text-blue-900' :
                        statusType === 'cached' ? 'text-teal-900' :
                        statusType === 'loading' ? 'text-purple-900' :
                        'text-gray-900'
                      }
                    `}>
                      {isComplete ? '✓ Model Ready!' : loadingStage.message}
                    </h3>
                    <p className={`
                      text-xs mt-0.5
                      ${
                        statusType === 'success' ? 'text-green-700' :
                        statusType === 'downloading' ? 'text-blue-700' :
                        statusType === 'cached' ? 'text-teal-700' :
                        statusType === 'loading' ? 'text-purple-700' :
                        'text-gray-600'
                      }
                    `}>
                      {isComplete 
                        ? `${currentModel?.name || 'Model'} is ready to use`
                        : currentModel?.name || 'AI Model'
                      }
                    </p>
                  </div>
                </div>

                {/* Close button (only when complete) */}
                {isComplete && (
                  <button
                    onClick={() => setShow(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar with stage-specific colors */}
            {!isComplete && (
              <div className="px-4 pb-3">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      statusType === 'downloading' ? 'bg-blue-500' :
                      statusType === 'cached' ? 'bg-teal-500' :
                      statusType === 'loading' ? 'bg-purple-500' :
                      'bg-primary'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <p className="text-xs text-gray-600 truncate flex-1 mr-2">
                    {loadingStage.detail}
                  </p>
                  <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                    {progressPercent}%
                  </p>
                </div>
              </div>
            )}

            {/* Enhanced Status Details with time estimation */}
            {!isComplete && (
              <div className={`
                px-4 py-2 text-xs border-t
                ${
                  statusType === 'downloading' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                  statusType === 'cached' ? 'bg-teal-50 border-teal-200 text-teal-800' :
                  statusType === 'loading' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                  'bg-gray-50 border-gray-200 text-gray-700'
                }
              `}>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    {statusType === 'downloading' ? (
                      <>
                        <p className="font-semibold">First-time download</p>
                        <p className="mt-0.5">
                          Downloading {currentModel?.size || 'model'}. 
                          This is cached for future use.
                        </p>
                      </>
                    ) : statusType === 'cached' ? (
                      <>
                        <p className="font-semibold">Loading from cache</p>
                        <p className="mt-0.5">Model already downloaded. Loading into GPU memory...</p>
                      </>
                    ) : statusType === 'loading' ? (
                      <>
                        <p className="font-semibold">Preparing for inference</p>
                        <p className="mt-0.5">Initializing model in GPU memory. Almost ready!</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold">Initializing</p>
                        <p className="mt-0.5">{progress.text || 'Setting up AI engine...'}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success Details */}
            {isComplete && statusType === 'success' && (
              <div className="px-4 py-2 bg-green-50 border-t border-green-200 text-xs text-green-800">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold">Model initialized successfully!</p>
                    <p className="mt-0.5">You can now start chatting, analyzing journals, and generating reports.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Estimated Time with better calculation */}
            {!isComplete && progressPercent > 5 && progressPercent < 95 && (
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
                <div className="flex items-center gap-2 text-xs text-amber-800">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>
                    <span className="font-semibold">Estimated time:</span>{' '}
                    {estimatedTimeRemaining}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingProgress;
