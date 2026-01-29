import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useWebLLM } from '../contexts/WebLLMContext';
import { useAuth } from '../contexts/AuthContext';
import { chatStorage } from '../services/storage';
import voiceService from '../services/voice';
import webLLMService from '../services/webllm';
import ModelSelector from '../components/ModelSelector';
import ModelInitializationModal from '../components/ModelInitializationModal';
import { getErrorMessage } from '../constants/errorMessages'; // Issue #20

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showAssessmentPrompt, setShowAssessmentPrompt] = useState(false);
  const [sessionStats, setSessionStats] = useState({ // Issue #18: Track session-wide token usage
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    messageCount: 0
  });
  const [contextWarning, setContextWarning] = useState(null); // Track context window warnings
  
  const messagesEndRef = useRef(null);
  const streamBufferRef = useRef('');
  const { chat, cancelChat, isInitialized, isLoading: modelLoading, initialize, progress, currentModel } = useWebLLM();
  const { user, getDASS21Results, hasCompletedDASS21 } = useAuth();

  useEffect(() => {
    loadChatHistory();
    loadDassBaseline();
  }, []);

  const loadDassBaseline = async () => {
    const dassResults = await getDASS21Results();
    if (dassResults) {
      webLLMService.setDassBaseline(dassResults);
    } else {
      // Show prompt if user hasn't taken assessment
      setShowAssessmentPrompt(true);
    }
  };

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
      
      // Issue #18: Recalculate session stats from loaded history
      const stats = history.reduce((acc, msg) => {
        if (msg.role === 'assistant' && msg.usage) {
          return {
            totalPromptTokens: acc.totalPromptTokens + (msg.usage.prompt_tokens || 0),
            totalCompletionTokens: acc.totalCompletionTokens + (msg.usage.completion_tokens || 0),
            totalTokens: acc.totalTokens + (msg.usage.total_tokens || 0),
            messageCount: acc.messageCount + 1
          };
        }
        return acc;
      }, { totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0, messageCount: 0 });
      
      setSessionStats(stats);
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
      let usageData = null; // Issue #18: Capture usage statistics
      
      // Stream the response with optimized batching
      const result = await chat(
        userMessage.content,
        conversationHistory,
        (chunk) => {
          aiResponse += chunk;
          updateStreamingMessage(chunk); // Use optimized streaming update
        }
      );

      // Issue #18: Extract usage data from result (webllm.js now returns {content, usage})
      if (result && typeof result === 'object') {
        aiResponse = result.content || aiResponse;
        usageData = result.usage;
        
        // Check if context was pruned
        if (result.contextPruned) {
          setContextWarning('⚠️ Old messages were removed to fit context window. Consider clearing chat for better performance.');
          // Auto-clear warning after 10 seconds
          setTimeout(() => setContextWarning(null), 10000);
        }
      }

      // Ensure final update with complete message
      setStreamingMessage(streamBufferRef.current);

      const aiMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        usage: usageData // Issue #18: Store usage statistics with message
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      setStreamingMessage('');
      streamBufferRef.current = ''; // Clear buffer
      
      // Issue #18: Update session statistics
      if (usageData) {
        setSessionStats(prev => ({
          totalPromptTokens: prev.totalPromptTokens + (usageData.prompt_tokens || 0),
          totalCompletionTokens: prev.totalCompletionTokens + (usageData.completion_tokens || 0),
          totalTokens: prev.totalTokens + (usageData.total_tokens || 0),
          messageCount: prev.messageCount + 1
        }));
      }
      
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
      
      // Handle cancellation differently
      if (error.message === "Request cancelled") {
        // Don't add error message for cancelled requests
      } else if (error.message.includes('CONTEXT_WINDOW_EXCEEDED')) {
        // Context window exhausted - prompt user to clear history
        setContextWarning('🚨 Context window full! Please clear chat history to continue.');
        const errorMessage = {
          role: 'assistant',
          content: 'The conversation has become too long. Please clear the chat history using the button below to continue.',
          timestamp: new Date().toISOString()
        };
        setMessages([...newMessages, errorMessage]);
      } else {
        // Generic error
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
    }
  };

  const handleVoiceInput = () => {
    if (!voiceService.isSupported()) {
      const error = getErrorMessage('VOICE', 'NOT_SUPPORTED'); // Issue #20
      alert(error.user);
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
      setContextWarning(null); // Clear context warning
      setSessionStats({ // Issue #18: Reset session stats when clearing chat
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        messageCount: 0
      });
      await chatStorage.remove(`chat_${user.username}`);
    }
  };

  return (
    <>
      {/* Model Initialization Modal */}
      <ModelInitializationModal />
      
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
            {/* Issue #18: Display session statistics */}
            {sessionStats.messageCount > 0 && (
              <div className="mt-2 flex gap-3 text-xs text-gray-500">
                <span title="Total tokens used in this session">
                  📊 {sessionStats.totalTokens.toLocaleString()} tokens
                </span>
                <span title="Input tokens">
                  📥 {sessionStats.totalPromptTokens.toLocaleString()}
                </span>
                <span title="Output tokens">
                  📤 {sessionStats.totalCompletionTokens.toLocaleString()}
                </span>
                <span title="Number of AI responses">
                  💬 {sessionStats.messageCount} {sessionStats.messageCount === 1 ? 'response' : 'responses'}
                </span>
              </div>
            )}
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
          {/* Context Window Warning */}
          {contextWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 mb-4"
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{contextWarning.includes('🚨') ? '🚨' : '⚠️'}</span>
                <div className="flex-1">
                  <p className="text-sm text-yellow-800 font-medium">
                    {contextWarning}
                  </p>
                  {contextWarning.includes('full') && (
                    <button
                      onClick={clearChat}
                      className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                    >
                      Clear Chat History
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setContextWarning(null)}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
          
          {/* Assessment Prompt Banner */}
          {showAssessmentPrompt && !hasCompletedDASS21 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 mb-4"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">💡</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-1">
                    Help us understand you better
                  </h3>
                  <p className="text-sm text-purple-800 mb-3">
                    Taking the DASS-21 assessment helps MindScribe provide more personalized 
                    support tailored to your needs. It only takes 5-10 minutes.
                  </p>
                  <div className="flex gap-2">
                    <Link
                      to="/assessment"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      Take Assessment
                    </Link>
                    <button
                      onClick={() => setShowAssessmentPrompt(false)}
                      className="px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors"
                    >
                      Maybe Later
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

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
                <div className="flex flex-col max-w-[80%]">
                  <div
                    className={
                      message.role === 'user'
                        ? 'chat-message-user'
                        : 'chat-message-ai'
                    }
                  >
                    {message.content}
                  </div>
                  {/* Issue #18: Display token usage for AI messages */}
                  {message.role === 'assistant' && message.usage && (
                    <div className="text-xs text-gray-400 mt-1 px-2 flex gap-2">
                      <span title="Tokens used in this response">
                        {message.usage.total_tokens} tokens
                      </span>
                      <span title="Input tokens">
                        ({message.usage.prompt_tokens} in
                      </span>
                      <span title="Output tokens">
                        + {message.usage.completion_tokens} out)
                      </span>
                    </div>
                  )}
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
    </>
  );
};

export default Chat;
