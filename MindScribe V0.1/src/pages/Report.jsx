import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { useWebLLM } from '../contexts/WebLLMContext';
import { analysisStorage, journalStorage } from '../services/storage';
import webLLMService from '../services/webllm';

const Report = () => {
  const [reportData, setReportData] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebugDetails, setShowDebugDetails] = useState(false);
  
  const { user } = useAuth();
  const { generateReport, generateRecommendations, isInitialized, isLoading: modelLoading, initialize } = useWebLLM();

  useEffect(() => {
    loadReportData();
  }, []);

  useEffect(() => {
    // Initialize model if not already initialized
    if (!isInitialized && !modelLoading) {
      initialize();
    }
  }, [isInitialized, modelLoading, initialize]);

  useEffect(() => {
    // Listen for debug logs during generation
    const handleDebugLog = () => {
      try {
        const logs = webLLMService.getDebugLogs();
        // Only show last 10 logs relevant to report generation
        const recentLogs = logs.slice(-10).filter(log => 
          log.message.toLowerCase().includes('report') ||
          log.message.toLowerCase().includes('recommendation') ||
          log.type === 'error' ||
          log.type === 'warning'
        );
        setDebugLogs(recentLogs);
      } catch (error) {
        console.error('Failed to load debug logs:', error);
      }
    };

    window.addEventListener('webllm-debug', handleDebugLog);
    
    return () => {
      window.removeEventListener('webllm-debug', handleDebugLog);
    };
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const allAnalysis = await analysisStorage.getAllItems();
      const userAnalysis = allAnalysis
        .filter(item => item.key.includes(user.username))
        .map(item => item.value)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (userAnalysis.length === 0) {
        setReportData(null);
        setLoading(false);
        return;
      }

      // Calculate statistics
      const last30Days = userAnalysis.filter(analysis => {
        const daysAgo = (Date.now() - new Date(analysis.date)) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30;
      });

      const emotionCounts = {};
      const stressCounts = { low: 0, moderate: 0, high: 0 };
      let totalSentiment = 0;

      last30Days.forEach(analysis => {
        const emotion = analysis.emotion || 'neutral';
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        
        const stress = analysis.stress || 'moderate';
        stressCounts[stress] = (stressCounts[stress] || 0) + 1;
        
        totalSentiment += analysis.sentiment || 5;
      });

      const avgSentiment = (totalSentiment / last30Days.length).toFixed(1);
      const topEmotions = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emotion]) => emotion);

      const data = {
        journalCount: last30Days.length,
        avgSentiment,
        stressDistribution: `Low: ${stressCounts.low}, Moderate: ${stressCounts.moderate}, High: ${stressCounts.high}`,
        topEmotions,
        timePeriod: 'Last 30 days',
        dateRange: {
          start: new Date(last30Days[last30Days.length - 1].date).toLocaleDateString(),
          end: new Date(last30Days[0].date).toLocaleDateString()
        }
      };

      setReportData(data);

      // Don't auto-generate AI summary anymore - wait for user to click button
      // if (isInitialized) {
      //   await generateAISummary(data);
      // }
    } catch (error) {
      console.error('Report loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async (data) => {
    if (!isInitialized) return;
    
    setGenerating(true);
    setGenerationProgress(0);
    setGenerationStep('Preparing data...');
    setStartTime(Date.now());
    
    // Total estimated time: ~8-12 seconds
    const totalEstimatedTime = 10000; // 10 seconds
    
    try {
      // Step 1: Prepare (10%) - ~1s
      setGenerationProgress(10);
      setGenerationStep('Analyzing journal entries...');
      setEstimatedTimeRemaining(9);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 2: Generate Summary (30%) - ~3s
      setGenerationProgress(30);
      setGenerationStep('Generating AI summary...');
      setEstimatedTimeRemaining(7);
      
      const summaryStartTime = Date.now();
      const summary = await generateReport(data);
      const summaryDuration = Date.now() - summaryStartTime;
      
      setAiSummary(summary);
      
      // Step 3: Prepare Recommendations (60%) - ~5s
      setGenerationProgress(60);
      setGenerationStep('Creating personalized recommendations...');
      const elapsed = (Date.now() - startTime) / 1000;
      setEstimatedTimeRemaining(Math.max(0, Math.ceil(totalEstimatedTime / 1000 - elapsed)));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 4: Generate Recommendations (80%) - ~8s
      setGenerationProgress(80);
      setGenerationStep('Finalizing recommendations...');
      setEstimatedTimeRemaining(2);
      
      const recs = await generateRecommendations({
        avgSentiment: data.avgSentiment,
        stressLevel: data.stressDistribution,
        commonEmotions: data.topEmotions
      });
      setRecommendations(recs);
      
      // Step 5: Complete (100%)
      setGenerationProgress(100);
      setGenerationStep('Report complete!');
      setEstimatedTimeRemaining(0);
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('AI generation error:', error);
      setGenerationStep('Error generating report');
      setEstimatedTimeRemaining(0);
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStep('');
      setEstimatedTimeRemaining(0);
      setStartTime(null);
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(24);
    doc.setTextColor(139, 92, 246); // calm-500
    doc.text('MindScribe Mental Health Report', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128); // gray-600
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setDrawColor(229, 231, 235);
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    // Summary Section
    yPos += 10;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Overview', 20, yPos);
    
    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text(`Period: ${reportData.timePeriod}`, 20, yPos);
    yPos += 7;
    doc.text(`Date Range: ${reportData.dateRange.start} - ${reportData.dateRange.end}`, 20, yPos);
    yPos += 7;
    doc.text(`Total Journal Entries: ${reportData.journalCount}`, 20, yPos);
    yPos += 7;
    doc.text(`Average Sentiment: ${reportData.avgSentiment}/10`, 20, yPos);
    yPos += 7;
    doc.text(`Top Emotions: ${reportData.topEmotions.join(', ')}`, 20, yPos);
    yPos += 7;
    doc.text(`Stress Distribution: ${reportData.stressDistribution}`, 20, yPos);
    
    // AI Summary
    if (aiSummary) {
      yPos += 15;
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('AI Analysis', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      const summaryLines = doc.splitTextToSize(aiSummary, pageWidth - 40);
      doc.text(summaryLines, 20, yPos);
      yPos += summaryLines.length * 7;
    }
    
    // Recommendations
    if (recommendations) {
      yPos += 15;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Recommendations', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      const recLines = doc.splitTextToSize(recommendations, pageWidth - 40);
      doc.text(recLines, 20, yPos);
    }
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text('This report is for personal use only and is not a substitute for professional mental health care.', pageWidth / 2, footerY, { align: 'center' });
    doc.text('All data is stored locally on your device. MindScribe respects your privacy.', pageWidth / 2, footerY + 5, { align: 'center' });
    
    // Save
    doc.save(`MindScribe_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <span className="loading-dots text-calm-500 text-xl">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <p className="text-gray-600 mt-4">Generating your report...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card text-center py-12"
      >
        <p className="text-6xl mb-4">📋</p>
        <h2 className="text-2xl font-display font-semibold text-calm-600 mb-2">
          No Report Available
        </h2>
        <p className="text-gray-600">
          Start journaling to generate your mental health report!
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-display font-bold text-calm-600">
          📋 Mental Health Screening Report
        </h2>
        <button
          onClick={exportToPDF}
          className="btn-primary flex items-center gap-2"
        >
          📥 Export to PDF
        </button>
      </div>

      {/* Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h3 className="text-xl font-display font-semibold text-calm-600 mb-4">
          Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-sage-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Period</p>
            <p className="text-lg font-semibold text-calm-600">{reportData.timePeriod}</p>
          </div>
          <div className="bg-sage-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Journal Entries</p>
            <p className="text-lg font-semibold text-calm-600">{reportData.journalCount}</p>
          </div>
          <div className="bg-sage-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Average Mood</p>
            <p className="text-lg font-semibold text-calm-600">{reportData.avgSentiment}/10</p>
          </div>
          <div className="bg-sage-50 p-4 rounded-lg col-span-2">
            <p className="text-sm text-gray-600 mb-1">Top Emotions</p>
            <p className="text-lg font-semibold text-calm-600 capitalize">
              {reportData.topEmotions.join(', ')}
            </p>
          </div>
          <div className="bg-sage-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Date Range</p>
            <p className="text-sm font-semibold text-calm-600">
              {reportData.dateRange.start} - {reportData.dateRange.end}
            </p>
          </div>
        </div>
      </motion.div>

      {/* AI Summary */}
      {generating ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card py-8"
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-calm-600 mb-2">
              Generating Report
            </h3>
            <p className="text-gray-600 mb-2">{generationStep}</p>
            {estimatedTimeRemaining > 0 && (
              <p className="text-sm text-gray-500">
                Estimated time remaining: ~{estimatedTimeRemaining} seconds
              </p>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
              <motion.div
                className="bg-gradient-to-r from-calm-500 to-primary-500 h-full rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${generationProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
              </motion.div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-gray-500">Progress</span>
              <span className="text-sm font-semibold text-calm-600">
                {generationProgress}%
              </span>
            </div>
          </div>
          
          {/* Progress Steps Visual */}
          <div className="max-w-md mx-auto mt-6">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div className={`flex flex-col items-center ${generationProgress >= 10 ? 'text-calm-600 font-semibold' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${generationProgress >= 10 ? 'bg-calm-500 text-white' : 'bg-gray-200'}`}>
                  {generationProgress >= 10 ? '✓' : '1'}
                </div>
                <span>Analyze</span>
              </div>
              <div className={`flex-1 h-1 mx-2 ${generationProgress >= 30 ? 'bg-calm-500' : 'bg-gray-200'}`}></div>
              <div className={`flex flex-col items-center ${generationProgress >= 30 ? 'text-calm-600 font-semibold' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${generationProgress >= 30 ? 'bg-calm-500 text-white' : 'bg-gray-200'}`}>
                  {generationProgress >= 30 ? '✓' : '2'}
                </div>
                <span>Summary</span>
              </div>
              <div className={`flex-1 h-1 mx-2 ${generationProgress >= 60 ? 'bg-calm-500' : 'bg-gray-200'}`}></div>
              <div className={`flex flex-col items-center ${generationProgress >= 60 ? 'text-calm-600 font-semibold' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${generationProgress >= 60 ? 'bg-calm-500 text-white' : 'bg-gray-200'}`}>
                  {generationProgress >= 60 ? '✓' : '3'}
                </div>
                <span>Recommend</span>
              </div>
              <div className={`flex-1 h-1 mx-2 ${generationProgress >= 100 ? 'bg-calm-500' : 'bg-gray-200'}`}></div>
              <div className={`flex flex-col items-center ${generationProgress >= 100 ? 'text-calm-600 font-semibold' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${generationProgress >= 100 ? 'bg-calm-500 text-white' : 'bg-gray-200'}`}>
                  {generationProgress >= 100 ? '✓' : '4'}
                </div>
                <span>Complete</span>
              </div>
            </div>
          </div>
          
          {/* Loading dots */}
          <div className="flex justify-center mt-6">
            <span className="loading-dots text-calm-500 text-xl">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>

          {/* Debug Information Toggle */}
          <div className="max-w-2xl mx-auto mt-6">
            <button
              onClick={() => setShowDebugDetails(!showDebugDetails)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2 transition-colors"
            >
              <span>🐛</span>
              <span>{showDebugDetails ? 'Hide' : 'Show'} Technical Details</span>
              <span className="transform transition-transform" style={{ transform: showDebugDetails ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>

            {/* Debug Logs Display */}
            {showDebugDetails && debugLogs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-auto max-h-60"
              >
                <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
                  <span className="text-green-400">● Live Debug Console</span>
                  <span className="text-gray-500">{debugLogs.length} recent events</span>
                </div>
                <div className="space-y-2">
                  {debugLogs.map((log, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <span className="text-gray-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}.{new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0')}
                      </span>
                      <span>{log.emoji}</span>
                      <span className={
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        log.type === 'success' ? 'text-green-400' :
                        log.type === 'task' ? 'text-purple-400' :
                        'text-blue-400'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center">
                  <a href="/debug" className="text-blue-400 hover:text-blue-300 text-xs">
                    → View Full Debug Console
                  </a>
                </div>
              </motion.div>
            )}

            {/* No logs message */}
            {showDebugDetails && debugLogs.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 bg-gray-100 rounded-lg p-4 text-center text-sm text-gray-500"
              >
                <p>No debug logs available yet.</p>
                <p className="text-xs mt-1">Technical details will appear here during generation.</p>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : aiSummary ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-gradient-to-br from-calm-50 to-primary-50"
        >
          <h3 className="text-xl font-display font-semibold text-calm-600 mb-4">
            🤖 AI Analysis
          </h3>
          <div className="bg-white p-6 rounded-lg">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {aiSummary}
            </p>
          </div>
        </motion.div>
      ) : isInitialized ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card bg-gradient-to-br from-calm-50 to-primary-50 text-center py-12"
        >
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-2xl font-display font-semibold text-calm-600 mb-3">
            AI-Powered Analysis Ready
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Generate a comprehensive mental health report with personalized insights and recommendations based on your journal entries.
          </p>
          <button
            onClick={() => generateAISummary(reportData)}
            className="btn-primary text-lg px-8 py-4 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
          >
            🎯 Generate AI Analysis & Report
          </button>
          <p className="text-sm text-gray-500 mt-4">
            ⏱️ Estimated time: 8-12 seconds
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card text-center py-8 bg-yellow-50 border-2 border-yellow-200"
        >
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            AI Model Loading
          </h3>
          <p className="text-gray-600 text-sm">
            Please wait while the AI model initializes...
          </p>
        </motion.div>
      )}

      {/* Recommendations */}
      {recommendations && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="text-xl font-display font-semibold text-calm-600 mb-4">
            💡 Self-Care Recommendations
          </h3>
          <div className="bg-sage-50 p-6 rounded-lg">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {recommendations}
            </p>
          </div>
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="card bg-yellow-50 border-2 border-yellow-200"
      >
        <div className="flex gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Important Notice</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              This report is generated based on your journal entries and is for personal reflection only. 
              It is <strong>not a clinical diagnosis</strong> and should not replace professional mental health care. 
              If you're experiencing persistent mental health concerns, please consult a licensed therapist or healthcare provider.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Report;
