import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useWebLLM } from '../contexts/WebLLMContext';
import { journalStorage, analysisStorage } from '../services/storage';

const Journal = () => {
  const [entries, setEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showEntries, setShowEntries] = useState(true);
  
  const { user } = useAuth();
  const { analyzeJournal, isInitialized, isLoading: modelLoading, initialize } = useWebLLM();

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    // Initialize model if not already initialized
    if (!isInitialized && !modelLoading) {
      initialize();
    }
  }, [isInitialized, modelLoading, initialize]);

  const loadEntries = async () => {
    const allEntries = await journalStorage.getAllItems();
    const userEntries = allEntries
      .filter(item => item.key.startsWith(`journal_${user.username}_`))
      .map(item => ({ id: item.key, ...item.value }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setEntries(userEntries);
  };

  const handleSave = async () => {
    if (!currentEntry.trim()) return;

    setIsAnalyzing(true);

    try {
      // Analyze journal entry if model is ready
      let analysis = {
        emotion: 'neutral',
        sentiment: 5,
        stress: 'moderate',
        themes: ['reflection']
      };

      if (isInitialized) {
        try {
          analysis = await analyzeJournal(currentEntry);
        } catch (error) {
          console.error('Analysis error:', error);
        }
      }

      const entry = {
        content: currentEntry,
        date: new Date().toISOString(),
        analysis,
        wordCount: currentEntry.trim().split(/\s+/).length
      };

      const entryId = editingId || `journal_${user.username}_${Date.now()}`;
      
      await journalStorage.save(entryId, entry);

      // Save analysis for dashboard
      await analysisStorage.save(`analysis_${entryId}`, {
        entryId,
        date: entry.date,
        ...analysis
      });

      setCurrentEntry('');
      setEditingId(null);
      await loadEntries();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save journal entry');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEdit = (entry) => {
    setCurrentEntry(entry.content);
    setEditingId(entry.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    await journalStorage.remove(entryId);
    await analysisStorage.remove(`analysis_${entryId}`);
    await loadEntries();
  };

  const handleCancel = () => {
    setCurrentEntry('');
    setEditingId(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmotionEmoji = (emotion) => {
    const emojiMap = {
      happy: '😊',
      sad: '😢',
      anxious: '😰',
      angry: '😠',
      calm: '😌',
      stressed: '😫',
      excited: '🤗',
      peaceful: '☮️',
      worried: '😟',
      content: '😊',
      frustrated: '😤',
      neutral: '😐'
    };
    return emojiMap[emotion.toLowerCase()] || '😐';
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment >= 7) return 'text-green-600';
    if (sentiment >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Writing Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h2 className="text-2xl font-display font-semibold text-calm-600 mb-4">
          {editingId ? '✏️ Edit Entry' : '📝 New Journal Entry'}
        </h2>
        
        <textarea
          value={currentEntry}
          onChange={(e) => setCurrentEntry(e.target.value)}
          placeholder="How are you feeling today? Write your thoughts here..."
          className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg focus:border-calm-500 focus:outline-none resize-none transition-colors"
          style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: '1.6' }}
        />

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            {currentEntry.trim() ? `${currentEntry.trim().split(/\s+/).length} words` : '0 words'}
          </div>
          <div className="flex gap-2">
            {editingId && (
              <button
                onClick={handleCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!currentEntry.trim() || isAnalyzing}
              className="btn-primary"
            >
              {isAnalyzing ? (
                <span className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              ) : (
                editingId ? 'Update Entry' : 'Save Entry'
              )}
            </button>
          </div>
        </div>

        {isAnalyzing && (
          <p className="text-sm text-gray-600 mt-2 text-center">
            🤖 Analyzing your entry...
          </p>
        )}
      </motion.div>

      {/* Entries List */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-display font-semibold text-calm-600">
            📚 Your Journal Entries
          </h2>
          <button
            onClick={() => setShowEntries(!showEntries)}
            className="text-sm text-calm-600 hover:text-calm-700"
          >
            {showEntries ? 'Hide' : 'Show'} ({entries.length})
          </button>
        </div>

        <AnimatePresence>
          {showEntries && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {entries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-4">📝</p>
                  <p>No journal entries yet. Start writing!</p>
                </div>
              ) : (
                entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-sage-50 p-4 rounded-lg border border-sage-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {getEmotionEmoji(entry.analysis.emotion)}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {formatDate(entry.date)}
                          </p>
                          <div className="flex gap-3 text-xs text-gray-600 mt-1">
                            <span className="capitalize">
                              Mood: <strong>{entry.analysis.emotion}</strong>
                            </span>
                            <span className={getSentimentColor(entry.analysis.sentiment)}>
                              Sentiment: <strong>{entry.analysis.sentiment}/10</strong>
                            </span>
                            <span>
                              Stress: <strong className="capitalize">{entry.analysis.stress}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-sm text-calm-600 hover:text-calm-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-sm line-clamp-3 mb-2">
                      {entry.content}
                    </p>
                    
                    {entry.analysis.themes && entry.analysis.themes.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {entry.analysis.themes.map((theme, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-calm-100 text-calm-700 text-xs rounded-full"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Journal;
