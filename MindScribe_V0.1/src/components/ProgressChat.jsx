import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebLLM } from '../contexts/WebLLMContext';

const ProgressChat = () => {
  const { isLoading, progress, currentModel, isInitialized } = useWebLLM();
  const [messages, setMessages] = useState([]);
  const [show, setShow] = useState(false);
  const messagesEndRef = useRef(null);
  const lastProgressRef = useRef(0);
  const hasShownWelcomeRef = useRef(false);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isLoading && !show) {
      // Show chat and add welcome message
      setShow(true);
      if (!hasShownWelcomeRef.current) {
        setMessages([
          {
            id: Date.now(),
            type: 'system',
            text: `👋 Hi! I'm preparing ${currentModel?.name || 'your AI model'} for you.`,
            timestamp: new Date()
          }
        ]);
        hasShownWelcomeRef.current = true;
      }
    }

    if (isLoading && progress.progress > 0) {
      const currentProgress = Math.round(progress.progress * 100);
      const progressText = progress.text || 'Processing...';
      
      // Add progress updates at meaningful intervals
      if (currentProgress !== lastProgressRef.current) {
        const shouldUpdate = 
          currentProgress === 0 ||
          currentProgress % 10 === 0 || // Every 10%
          currentProgress === 100 ||
          progressText.toLowerCase().includes('fetch') ||
          progressText.toLowerCase().includes('download') ||
          progressText.toLowerCase().includes('load') ||
          progressText.toLowerCase().includes('init');

        if (shouldUpdate) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'progress',
            text: progressText,
            progress: currentProgress,
            timestamp: new Date()
          }]);
          lastProgressRef.current = currentProgress;
        }
      }

      // Add contextual messages based on progress
      if (currentProgress === 10 && lastProgressRef.current < 10) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: 'info',
            text: '📥 Downloading model weights from the cloud...',
            timestamp: new Date()
          }]);
        }, 500);
      }

      if (currentProgress === 50 && lastProgressRef.current < 50) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: 'info',
            text: '⚡ Halfway there! Optimizing for your device...',
            timestamp: new Date()
          }]);
        }, 500);
      }

      if (currentProgress === 80 && lastProgressRef.current < 80) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: 'info',
            text: '🚀 Almost ready! Initializing the AI engine...',
            timestamp: new Date()
          }]);
        }, 500);
      }
    }

    if (isInitialized && show) {
      // Add success message
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'success',
          text: `✅ ${currentModel?.name || 'Model'} is ready! You can start chatting now.`,
          timestamp: new Date()
        }]);
      }, 300);

      // Hide chat after 5 seconds
      setTimeout(() => {
        setShow(false);
        setMessages([]);
        hasShownWelcomeRef.current = false;
        lastProgressRef.current = 0;
      }, 5000);
    }
  }, [isLoading, progress, isInitialized, show, currentModel]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-20 right-6 z-50 w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-primary overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-sage p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h3 className="text-white font-bold">AI Assistant</h3>
                  <p className="text-white text-xs opacity-90">
                    {isInitialized ? 'Ready' : 'Initializing...'}
                  </p>
                </div>
              </div>
              {isInitialized && (
                <button
                  onClick={() => {
                    setShow(false);
                    setMessages([]);
                    hasShownWelcomeRef.current = false;
                    lastProgressRef.current = 0;
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[85%] rounded-2xl px-4 py-3 shadow-md
                      ${message.type === 'system' ? 'bg-gradient-to-r from-primary to-sage text-white' :
                        message.type === 'success' ? 'bg-green-500 text-white' :
                        message.type === 'info' ? 'bg-blue-500 text-white' :
                        message.type === 'progress' ? 'bg-white border-2 border-gray-200' :
                        'bg-white'}
                    `}>
                      {/* Message Text */}
                      <p className={`text-sm ${message.type === 'progress' ? 'text-gray-800' : ''}`}>
                        {message.text}
                      </p>

                      {/* Progress Bar for progress messages */}
                      {message.type === 'progress' && message.progress !== undefined && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-primary to-sage"
                              initial={{ width: 0 }}
                              animate={{ width: `${message.progress}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-right font-semibold">
                            {message.progress}%
                          </p>
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className={`text-xs mt-1 ${
                        message.type === 'progress' ? 'text-gray-400' : 'opacity-70'
                      }`}>
                        {message.timestamp.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator when loading */}
              {isLoading && !isInitialized && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-md border-2 border-gray-200">
                    <div className="flex gap-1">
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Footer Status */}
            <div className="bg-white border-t border-gray-200 p-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isInitialized ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-700 font-semibold">Online</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-yellow-700 font-semibold">Connecting...</span>
                    </>
                  )}
                </div>
                <span className="text-gray-500">{currentModel?.name || 'AI Model'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProgressChat;
