import React, { useState } from 'react';
import { useWebLLM } from '../contexts/WebLLMContext';
import { motion, AnimatePresence } from 'framer-motion';

const ModelSelector = ({ isOpen, onClose }) => {
  const { 
    availableModels, 
    currentModel, 
    selectModel, 
    isInitialized,
    unloadModel,
    isLoading,
    initialize
  } = useWebLLM();
  
  const [showConfirmUnload, setShowConfirmUnload] = useState(false);
  const [pendingModelId, setPendingModelId] = useState(null);
  const [isUnloading, setIsUnloading] = useState(false);

  const handleModelSelect = async (modelId) => {
    if (currentModel?.id === modelId) {
      onClose();
      return;
    }

    if (isInitialized) {
      setPendingModelId(modelId);
      setShowConfirmUnload(true);
    } else {
      try {
        selectModel(modelId);
        // Automatically initialize the newly selected model
        await initialize();
        onClose();
      } catch (error) {
        console.error('Failed to select model:', error);
        alert('Failed to select model: ' + error.message);
      }
    }
  };

  const handleConfirmUnload = async () => {
    setIsUnloading(true);
    try {
      await unloadModel();
      if (pendingModelId) {
        selectModel(pendingModelId);
        // Automatically initialize the newly selected model
        await initialize();
      }
      setShowConfirmUnload(false);
      setPendingModelId(null);
      onClose();
    } catch (error) {
      console.error('Failed to switch model:', error);
      alert('Failed to switch model: ' + error.message);
    } finally {
      setIsUnloading(false);
    }
  };

  const handleUnloadOnly = async () => {
    setIsUnloading(true);
    try {
      await unloadModel();
      alert('Model unloaded successfully. You can now select a different model.');
    } catch (error) {
      console.error('Failed to unload model:', error);
      alert('Failed to unload model: ' + error.message);
    } finally {
      setIsUnloading(false);
    }
  };

  // Defensive check: Ensure availableModels exists and has items
  if (!availableModels || availableModels.length === 0) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Choose AI Model</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select the model that best fits your needs. Larger models provide better quality but take longer to download.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {isLoading && (
              <div className="mt-4 p-3 bg-primary bg-opacity-10 border border-primary rounded-lg flex items-start">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="flex-shrink-0 mt-0.5 mr-2"
                >
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </motion.div>
                <p className="text-sm text-gray-800">
                  <strong>Loading model...</strong> {currentModel?.name} is being initialized. Check the progress indicator at the top of the screen.
                </p>
              </div>
            )}
            
            {isInitialized && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-blue-800">
                      <strong>Currently active:</strong> {currentModel?.name}. To switch models, the current model will be unloaded first.
                    </p>
                  </div>
                  <button
                    onClick={handleUnloadOnly}
                    disabled={isUnloading}
                    className="ml-3 px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                    title="Unload current model to free memory"
                  >
                    {isUnloading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </motion.div>
                        <span>Unloading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Unload Model</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Model Cards */}
          <div className="p-6 space-y-4">
            {availableModels.map((model, index) => {
              const isSelected = currentModel?.id === model.id;
              const isActive = isInitialized && isSelected;
              
              return (
                <motion.div
                  key={model.id || `model-${index}`}  // Use index as fallback to ensure uniqueness
                  whileHover={{ scale: isActive ? 1 : 1.02 }}
                  className={`
                    relative p-5 rounded-xl border-2 cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary bg-opacity-5' 
                      : 'border-gray-200 hover:border-primary hover:bg-gray-50'
                    }
                    ${isActive ? 'ring-2 ring-primary ring-opacity-50' : ''}
                  `}
                  onClick={() => handleModelSelect(model.id)}
                >
                  {/* Recommended Badge */}
                  {model.recommended && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-sage text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      ⭐ Recommended
                    </div>
                  )}

                  {/* Active Badge */}
                  {isActive && (
                    <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      ✓ Active
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Model Name */}
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {model.name}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-3">
                        {model.description}
                      </p>

                      {/* Specs Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="text-xs text-gray-500 mb-1">Size</div>
                          <div className="text-sm font-semibold text-gray-900">{model.size}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="text-xs text-gray-500 mb-1">Speed</div>
                          <div className="text-sm font-semibold text-gray-900">{model.speed}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="text-xs text-gray-500 mb-1">Quality</div>
                          <div className="text-sm font-semibold text-gray-900">{model.quality}</div>
                        </div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    <div className={`
                      ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}
                    `}>
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Technical ID */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-400 font-mono">
                      {model.id}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-2xl">
            <div className="flex items-start text-sm text-gray-600">
              <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="mb-1"><strong>Note:</strong> Models are downloaded once and cached in your browser.</p>
                <p>First-time download requires an internet connection and may take a few minutes depending on model size.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Unload Dialog */}
      <AnimatePresence>
        {showConfirmUnload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowConfirmUnload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Switch to {availableModels.find(m => m.id === pendingModelId)?.name}?
                </h3>
                
                <p className="text-sm text-gray-600 mb-6">
                  This will unload <strong>{currentModel?.name}</strong> and switch to <strong>{availableModels.find(m => m.id === pendingModelId)?.name}</strong>.
                  <br /><br />
                  Current chat context will be cleared, but all saved data remains intact.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmUnload(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={isUnloading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmUnload}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    disabled={isUnloading}
                  >
                    {isUnloading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </motion.div>
                        <span>Switching...</span>
                      </>
                    ) : (
                      'Unload & Switch'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ModelSelector;
