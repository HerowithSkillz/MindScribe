import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useWebLLM } from '../contexts/WebLLMContext';
import ModelSelector from './ModelSelector';
import LoadingProgress from './LoadingProgress';
import ProgressChat from './ProgressChat';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { currentModel, isInitialized } = useWebLLM();
  const [showModelSelector, setShowModelSelector] = useState(false);

  const navItems = [
    { path: '/chat', label: '💬 Chat', icon: '💬' },
    { path: '/voice', label: '🎙️ Voice Therapy', icon: '🎙️' },
    { path: '/journal', label: '📝 Journal', icon: '📝' },
    { path: '/dashboard', label: '📊 Dashboard', icon: '📊' },
    { path: '/report', label: '📋 Report', icon: '📋' },
    { path: '/assessment', label: '📋 Take Assessment', icon: '📋', highlighted: true },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-calm-600">
                🧠 MindScribe
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* AI Model Indicator */}
              <button
                onClick={() => setShowModelSelector(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors group"
                title="Click to change AI model"
              >
                <span className="text-lg">🤖</span>
                <div className="text-left">
                  <div className="text-xs text-gray-500">AI Model</div>
                  <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    {currentModel?.name || 'Not loaded'}
                    {isInitialized && (
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Model active"></span>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <span className="text-sm text-gray-600">
                Welcome, <strong>{user?.username}</strong>
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-calm-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-6 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'text-calm-600 border-b-2 border-calm-500'
                      : item.highlighted
                      ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                      : 'text-gray-600 hover:text-calm-600'
                  }`
                }
                title={item.path === '/assessment' ? 'Help us understand you better' : ''}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            🔒 All data is stored locally on your device. Your privacy is our priority.
          </p>
        </div>
      </footer>

      {/* Progress Chat - Dynamic conversational progress */}
      <ProgressChat />

      {/* Model Selector Modal */}
      <ModelSelector isOpen={showModelSelector} onClose={() => setShowModelSelector(false)} />
    </div>
  );
};

export default Layout;
