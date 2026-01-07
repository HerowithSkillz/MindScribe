import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebLLM } from '../contexts/WebLLMContext';
import { useAuth } from '../contexts/AuthContext';
import { chatStorage } from '../services/storage';
import voiceService from '../services/voice';
import ModelSelector from '../components/ModelSelector';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  const messagesEndRef = useRef(null);
  const streamBufferRef = useRef('');
  const { chat, cancelChat, isInitialized, isLoading: modelLoading, initialize, progress, currentModel } = useWebLLM();
  const { user } = useAuth();

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    // Initialize model if not already initialized
    if (!isInitialized && !modelLoading) {
      initialize();
    }
  }, [isInitialized, modelLoading, initialize]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    const history = await chatStorage.get(`chat_${user.username}`);
    if (history && Array.isArray(history)) {
      setMessages(history);
    }
  };

  const saveChatHistory = async (newMessages) => {
    await chatStorage.save(`chat_${user.username}`, newMessages);
  };

  // Direct streaming update - no throttling for smooth, water-like flow
  // WebLLM chunks are already optimized, no need to batch
  const updateStreamingMessage = (chunk) => {
    streamBufferRef.current += chunk;
    // Update React state immediately for each chunk
    setStreamingMessage(streamBufferRef.current);
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading || !isInitialized) return;

    const userMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);
    setStreamingMessage('');
    streamBufferRef.current = ''; // Reset stream buffer

    try {
      // Convert messages to chat format
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      let aiResponse = '';
      
      // Stream the response with optimized batching
      await chat(
        userMessage.content,
        conversationHistory,
        (chunk) => {
          aiResponse += chunk;
          updateStreamingMessage(chunk); // Use optimized streaming update
        }
      );

      // Ensure final update with complete message
      setStreamingMessage(streamBufferRef.current);

      const aiMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      setStreamingMessage('');
      streamBufferRef.current = ''; // Clear buffer
      
      // Save to storage
      await saveChatHistory(updatedMessages);

      // Speak response if voice enabled
      if (voiceEnabled && aiResponse) {
        setIsSpeaking(true);
        voiceService.speak(aiResponse, () => setIsSpeaking(false));
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Always cleanup streaming state on error
      setStreamingMessage('');
      streamBufferRef.current = '';
      lastUpdateTimeRef.current = 0;
      
      // Handle cancellation differently
      if (error.message === "Request cancelled") {
        // Don't add error message for cancelled requests
      } else {
        const errorMessage = {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.',
          timestamp: new Date().toISOString()
        };
        setMessages([...newMessages, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelChat = () => {
    const cancelled = cancelChat();
    if (cancelled) {
      setIsLoading(false);
      setStreamingMessage('');
      streamBufferRef.current = '';
      lastUpdateTimeRef.current = 0;
    }
  };

  const handleVoiceInput = () => {
    if (!voiceService.isSupported()) {
      alert('Voice input is not supported in your browser');
      return;
    }

    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    voiceService.startListening(
      (transcript) => {
        setInputMessage(transcript);
        setIsListening(false);
      },
      (error) => {
        console.error('Voice input error:', error);
        setIsListening(false);
        alert(`Voice input error: ${error}`);
      }
    );
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = async () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      await chatStorage.remove(`chat_${user.username}`);
    }
  };

  if (modelLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card max-w-md w-full text-center"
        >
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-2xl font-display font-semibold text-calm-600 mb-4">
            Loading AI Model
          </h2>
          <p className="text-gray-600 mb-4">{progress.text}</p>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              className="bg-calm-500 h-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.progress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {Math.round(progress.progress * 100)}%
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      <div className="card flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-display font-semibold text-calm-600">
              Chat with MindScribe
            </h2>
            <p className="text-sm text-gray-600">
              Your supportive AI companion
              {currentModel && (
                <span className="ml-2 text-xs text-gray-500">
                  • Using {currentModel.name}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowModelSelector(true)}
              className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
              title="Change AI model"
            >
              <span>🤖</span>
              <span className="hidden sm:inline">Change Model</span>
            </button>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                voiceEnabled
                  ? 'bg-calm-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Toggle voice responses"
            >
              🔊 Voice {voiceEnabled ? 'On' : 'Off'}
            </button>
            <button
              onClick={clearChat}
              className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0 max-h-[calc(100vh-400px)]">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-500 py-12"
            >
              <p className="text-4xl mb-4">👋</p>
              <p className="text-lg mb-2">Hello! I'm MindScribe.</p>
              <p className="text-sm">How are you feeling today?</p>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={
                    message.role === 'user'
                      ? 'chat-message-user'
                      : 'chat-message-ai'
                  }
                >
                  {message.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {streamingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="chat-message-ai">
                {streamingMessage}
                <span className="inline-block w-2 h-4 bg-calm-500 ml-1 animate-pulse" />
              </div>
            </motion.div>
          )}

          {isLoading && !streamingMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="chat-message-ai">
                <span className="loading-dots text-calm-500">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="pt-4 border-t border-gray-200">
          {/* Cancel button - shown when generating */}
          {isLoading && (
            <div className="mb-3 flex justify-center">
              <button
                onClick={handleCancelChat}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Response
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={handleVoiceInput}
              disabled={!isInitialized || isLoading}
              className={`p-3 rounded-lg transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Voice input"
            >
              🎤
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isListening
                  ? 'Listening...'
                  : isInitialized
                  ? 'Type your message...'
                  : 'Please wait for model to load...'
              }
              disabled={!isInitialized || isLoading || isListening}
              className="input-field flex-1"
            />
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || isLoading || !isInitialized}
              className="btn-primary"
            >
              Send
            </button>
          </div>
          {isListening && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              🎤 Listening... Click the microphone again to stop
            </p>
          )}
        </div>
      </div>

      {/* Model Selector Modal */}
      <ModelSelector isOpen={showModelSelector} onClose={() => setShowModelSelector(false)} />
    </div>
  );
};

export default Chat;
