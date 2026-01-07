import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import webLLMService from '../services/webllm';
import { useWebLLM } from '../contexts/WebLLMContext';

const Debug = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const { modelStatus } = useWebLLM();

  useEffect(() => {
    // Load initial logs
    loadLogs();

    // Listen for new logs
    const handleNewLog = () => {
      loadLogs();
    };

    window.addEventListener('webllm-debug', handleNewLog);

    return () => {
      window.removeEventListener('webllm-debug', handleNewLog);
    };
  }, []);

  useEffect(() => {
    if (autoScroll) {
      const logContainer = document.getElementById('log-container');
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  const loadLogs = () => {
    try {
      const allLogs = webLLMService.getDebugLogs();
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all debug logs?')) {
      webLLMService.clearDebugLogs();
      setLogs([]);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Clear all WebLLM model cache? This will force models to re-download. Use this if you\'re experiencing model loading issues.')) {
      const success = await webLLMService.clearAllCache();
      if (success) {
        alert('Cache cleared successfully! Please reload the page.');
      } else {
        alert('Failed to clear cache. Please try manually clearing browser data.');
      }
      loadLogs(); // Refresh to see cache clear log
    }
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.type === filter);

  const getTypeColor = (type) => {
    switch (type) {
      case 'info': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'task': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeBg = (type) => {
    switch (type) {
      case 'info': return 'bg-blue-500/10 border-blue-500/30';
      case 'success': return 'bg-green-500/10 border-green-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'error': return 'bg-red-500/10 border-red-500/30';
      case 'task': return 'bg-purple-500/10 border-purple-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const countByType = (type) => logs.filter(log => log.type === type).length;

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-white mb-2">🐛 Debug Console</h1>
        <p className="text-gray-400">Real-time monitoring of WebLLM operations</p>
      </motion.div>

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 mb-6 border border-purple-500/30"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Model Status</p>
            <p className="text-white font-medium">{modelStatus}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total Logs</p>
            <p className="text-white font-medium">{logs.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Errors</p>
            <p className="text-red-400 font-medium">{countByType('error')}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Tasks</p>
            <p className="text-purple-400 font-medium">{countByType('task')}</p>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700"
      >
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('info')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'info'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ℹ️ Info ({countByType('info')})
            </button>
            <button
              onClick={() => setFilter('task')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'task'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📋 Tasks ({countByType('task')})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ✅ Success ({countByType('success')})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'warning'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ⚠️ Warning ({countByType('warning')})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ❌ Error ({countByType('error')})
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                autoScroll
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {autoScroll ? '📌 Auto-scroll ON' : '📌 Auto-scroll OFF'}
            </button>
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              title="Clear all WebLLM model cache (use if models fail to load)"
            >
              💾 Clear Cache
            </button>
            <button
              onClick={handleClearLogs}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              🗑️ Clear
            </button>
          </div>
        </div>
      </motion.div>

      {/* Logs Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
      >
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center gap-2">
          <span className="text-green-400">●</span>
          <span className="text-gray-400 text-sm font-mono">Debug Logs</span>
          <span className="text-gray-500 text-xs ml-auto">
            Showing {filteredLogs.length} of {logs.length} logs
          </span>
        </div>

        <div
          id="log-container"
          className="h-[calc(100vh-400px)] overflow-y-auto p-4 space-y-2 font-mono text-sm"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-4xl mb-4">📭</p>
              <p>No logs to display</p>
              <p className="text-xs mt-2">
                {filter !== 'all' ? 'Try changing the filter' : 'Logs will appear as the AI processes tasks'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={`p-3 rounded border ${getTypeBg(log.type)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{log.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-bold uppercase text-xs ${getTypeColor(log.type)}`}>
                        {log.type}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-gray-200 break-words">{log.message}</p>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="text-gray-400 text-xs cursor-pointer hover:text-gray-300">
                          Show details
                        </summary>
                        <pre className="mt-2 p-2 bg-black/30 rounded text-xs text-gray-400 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Debug;
