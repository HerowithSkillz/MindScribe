import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import piperService from '../services/piper.js';

/**
 * Voice Selector Component
 * 
 * Allows users to choose between different therapeutic voices
 * Supports ASMR-style voices for relaxation and therapy sessions
 */
const VoiceSelector = ({ onVoiceChange, disabled = false }) => {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isChanging, setIsChanging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.25);

  // Load available voices on mount
  useEffect(() => {
    const availableVoices = piperService.getAvailableVoices();
    setVoices(availableVoices);
    
    // Get current voice
    const currentVoiceId = piperService.getCurrentVoice() || piperService.selectedVoice;
    const currentVoice = availableVoices.find(v => v.id === currentVoiceId);
    setSelectedVoice(currentVoice || availableVoices[0]);
    
    // Get current speech rate
    setSpeechRate(piperService.getSpeechRate());
  }, []);

  // Handle voice selection
  const handleVoiceSelect = async (voice) => {
    if (disabled || isChanging || voice.id === selectedVoice?.id) return;
    
    setIsChanging(true);
    try {
      console.log(`🎙️ Switching voice to: ${voice.name}`);
      await piperService.loadModel(voice.id);
      setSelectedVoice(voice);
      setIsExpanded(false);
      
      if (onVoiceChange) {
        onVoiceChange(voice);
      }
    } catch (error) {
      console.error('Failed to switch voice:', error);
    } finally {
      setIsChanging(false);
    }
  };

  // Handle speech rate change
  const handleRateChange = (newRate) => {
    setSpeechRate(newRate);
    piperService.setSpeechRate(newRate);
  };

  // Group voices by gender
  const femaleVoices = voices.filter(v => v.gender === 'female');
  const maleVoices = voices.filter(v => v.gender === 'male');

  if (!selectedVoice) return null;

  return (
    <div className="relative">
      {/* Current Voice Display / Toggle Button */}
      <button
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
        disabled={disabled || isChanging}
        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
          disabled 
            ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' 
            : 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 hover:shadow-md cursor-pointer'
        } border border-purple-200 dark:border-purple-700`}
      >
        {/* Voice Icon */}
        <div className="text-2xl">{selectedVoice.icon}</div>
        
        {/* Voice Info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">
              {selectedVoice.name}
            </span>
            {selectedVoice.recommended && (
              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                ✨ ASMR
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {selectedVoice.description}
          </p>
        </div>
        
        {/* Expand Icon */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-gray-400"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
        
        {/* Loading Indicator */}
        {isChanging && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>

      {/* Expanded Voice Selector */}
      <AnimatePresence>
        {isExpanded && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-3 max-h-80 overflow-y-auto">
              {/* Female Voices */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                  👩 Female Voices
                </h4>
                <div className="space-y-1">
                  {femaleVoices.map(voice => (
                    <VoiceOption
                      key={voice.id}
                      voice={voice}
                      isSelected={selectedVoice?.id === voice.id}
                      onClick={() => handleVoiceSelect(voice)}
                    />
                  ))}
                </div>
              </div>

              {/* Male Voices */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                  👨 Male Voices
                </h4>
                <div className="space-y-1">
                  {maleVoices.map(voice => (
                    <VoiceOption
                      key={voice.id}
                      voice={voice}
                      isSelected={selectedVoice?.id === voice.id}
                      onClick={() => handleVoiceSelect(voice)}
                    />
                  ))}
                </div>
              </div>

              {/* Speed Control */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                  ⚡ Speech Speed
                </h4>
                <div className="flex items-center gap-3 px-1">
                  <span className="text-xs text-gray-500">🐢</span>
                  <input
                    type="range"
                    min="0.8"
                    max="1.6"
                    step="0.05"
                    value={speechRate}
                    onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <span className="text-xs text-gray-500">🐇</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                    {speechRate.toFixed(2)}x
                  </span>
                </div>
                <div className="flex justify-between px-1 mt-1">
                  <button
                    onClick={() => handleRateChange(1.0)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Slow
                  </button>
                  <button
                    onClick={() => handleRateChange(1.25)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => handleRateChange(1.5)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Fast
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close selector */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

/**
 * Individual Voice Option Component
 */
const VoiceOption = ({ voice, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
      isSelected
        ? 'bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-600'
        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
    }`}
  >
    <div className="text-xl">{voice.icon}</div>
    <div className="flex-1 text-left">
      <div className="flex items-center gap-2">
        <span className={`font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'}`}>
          {voice.name}
        </span>
        {voice.recommended && (
          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
            ASMR
          </span>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {voice.language === 'en-GB' ? '🇬🇧' : '🇺🇸'}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{voice.description}</p>
    </div>
    {isSelected && (
      <div className="text-purple-600 dark:text-purple-400">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    )}
  </button>
);

export default VoiceSelector;
