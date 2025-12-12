import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebLLM } from '../contexts/WebLLMContext';

const LoadingProgress = () => {
  const { isLoading, progress, currentModel, isInitialized } = useWebLLM();
  const [show, setShow] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('loading'); // loading, success, cached

  useEffect(() => {
    if (isLoading) {
      setShow(true);
      
      // Determine if it's a download or cache load based on progress text
      const text = progress.text.toLowerCase();
      if (text.includes('fetching') || text.includes('downloading')) {
        setStatusType('loading');
        setStatusMessage('Downloading model...');
      } else if (text.includes('loading') || text.includes('initializing')) {
        setStatusType('cached');
        setStatusMessage('Loading from cache...');
      } else {
        setStatusType('loading');
        setStatusMessage('Preparing model...');
      }
    } else if (isInitialized && show) {
      // Show success briefly
      setStatusType('success');
      setStatusMessage('Model ready!');
      
      // Hide after 3 seconds
      setTimeout(() => {
        setShow(false);
      }, 3000);
    }
  }, [isLoading, progress.text, isInitialized, show]);

  if (!show) return null;

  const progressPercent = Math.round((progress.progress || 0) * 100);
  const isComplete = progressPercent >= 100 || isInitialized;

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
            ${statusType === 'success' ? 'bg-green-50 border-2 border-green-500' : 'bg-white border-2 border-primary'}
          `}>
            {/* Header */}
            <div className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${statusType === 'success' ? 'bg-green-500' : statusType === 'cached' ? 'bg-blue-500' : 'bg-primary'}
                  `}>
                    {statusType === 'success' ? (
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : statusType === 'cached' ? (
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    ) : (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </motion.div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <h3 className={`
                      text-sm font-bold
                      ${statusType === 'success' ? 'text-green-900' : 'text-gray-900'}
                    `}>
                      {statusType === 'success' ? '✓ Model Ready!' : statusMessage}
                    </h3>
                    <p className={`
                      text-xs mt-0.5
                      ${statusType === 'success' ? 'text-green-700' : 'text-gray-600'}
                    `}>
                      {statusType === 'success' 
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

            {/* Progress Bar */}
            {!isComplete && (
              <div className="px-4 pb-3">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className={`h-full ${statusType === 'cached' ? 'bg-blue-500' : 'bg-primary'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <p className="text-xs text-gray-600">
                    {progress.text || 'Initializing...'}
                  </p>
                  <p className="text-xs font-semibold text-gray-700">
                    {progressPercent}%
                  </p>
                </div>
              </div>
            )}

            {/* Status Details */}
            {!isComplete && (
              <div className={`
                px-4 py-2 text-xs border-t
                ${statusType === 'cached' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-700'}
              `}>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    {statusType === 'cached' ? (
                      <>
                        <p className="font-semibold">Loading from cache</p>
                        <p className="mt-0.5">Model already downloaded. This should be quick!</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold">First-time download</p>
                        <p className="mt-0.5">
                          Downloading {currentModel?.size || 'model'}. 
                          This is a one-time process and will be cached for future use.
                        </p>
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

            {/* Estimated Time (for downloads) */}
            {!isComplete && statusType === 'loading' && progressPercent > 0 && progressPercent < 95 && (
              <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
                <div className="flex items-center gap-2 text-xs text-yellow-800">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>
                    <span className="font-semibold">Estimated time:</span>{' '}
                    {progressPercent < 25 ? '2-5 minutes remaining' : 
                     progressPercent < 50 ? '1-3 minutes remaining' : 
                     progressPercent < 75 ? 'Less than 1 minute' : 
                     'Almost done...'}
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
