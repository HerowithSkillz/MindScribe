import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { analysisStorage } from '../services/storage';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // days
  
  const { user } = useAuth();

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const allAnalysis = await analysisStorage.getAllItems();
      const userAnalysis = allAnalysis
        .filter(item => item.key.includes(user.username))
        .map(item => item.value)
        .filter(analysis => {
          const daysAgo = (Date.now() - new Date(analysis.date)) / (1000 * 60 * 60 * 24);
          return daysAgo <= timeRange;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (userAnalysis.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      // Calculate statistics
      const emotionCounts = {};
      const stressCounts = { low: 0, moderate: 0, high: 0 };
      const sentimentByDay = {};
      
      let totalSentiment = 0;

      userAnalysis.forEach(analysis => {
        // Count emotions
        const emotion = analysis.emotion || 'neutral';
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;

        // Count stress levels
        const stress = analysis.stress || 'moderate';
        stressCounts[stress] = (stressCounts[stress] || 0) + 1;

        // Sentiment by day
        const date = new Date(analysis.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!sentimentByDay[date]) {
          sentimentByDay[date] = { date, sentiments: [], avg: 0 };
        }
        sentimentByDay[date].sentiments.push(analysis.sentiment || 5);

        totalSentiment += analysis.sentiment || 5;
      });

      // Calculate average sentiment per day
      Object.values(sentimentByDay).forEach(day => {
        day.avg = day.sentiments.reduce((a, b) => a + b, 0) / day.sentiments.length;
      });

      const avgSentiment = totalSentiment / userAnalysis.length;

      // Prepare chart data
      const emotionData = Object.entries(emotionCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const stressData = [
        { name: 'Low', value: stressCounts.low },
        { name: 'Moderate', value: stressCounts.moderate },
        { name: 'High', value: stressCounts.high }
      ];

      const trendData = Object.values(sentimentByDay);

      setStats({
        totalEntries: userAnalysis.length,
        avgSentiment: avgSentiment.toFixed(1),
        emotionData,
        stressData,
        trendData,
        topEmotions: emotionData.slice(0, 3).map(e => e.name),
        stressDistribution: stressCounts
      });
    } catch (error) {
      console.error('Stats loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];
  const STRESS_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <span className="loading-dots text-calm-500 text-xl">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <p className="text-gray-600 mt-4">Loading your insights...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card text-center py-12"
      >
        <p className="text-6xl mb-4">📊</p>
        <h2 className="text-2xl font-display font-semibold text-calm-600 mb-2">
          No Data Yet
        </h2>
        <p className="text-gray-600">
          Start journaling to see your emotional insights and trends!
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-display font-bold text-calm-600">
          📊 Your Mental Health Dashboard
        </h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-calm-500 focus:outline-none"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center"
        >
          <p className="text-4xl mb-2">📝</p>
          <p className="text-3xl font-bold text-calm-600">{stats.totalEntries}</p>
          <p className="text-gray-600">Journal Entries</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card text-center"
        >
          <p className="text-4xl mb-2">
            {stats.avgSentiment >= 7 ? '😊' : stats.avgSentiment >= 4 ? '😐' : '😔'}
          </p>
          <p className="text-3xl font-bold text-calm-600">{stats.avgSentiment}/10</p>
          <p className="text-gray-600">Average Mood</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card text-center"
        >
          <p className="text-4xl mb-2">🎭</p>
          <p className="text-xl font-bold text-calm-600 capitalize">
            {stats.topEmotions[0] || 'Neutral'}
          </p>
          <p className="text-gray-600">Most Common Emotion</p>
        </motion.div>
      </div>

      {/* Mood Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h3 className="text-xl font-display font-semibold text-calm-600 mb-4">
          📈 Mood Trend Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis domain={[0, 10]} stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#8b5cf6"
              strokeWidth={3}
              name="Sentiment Score"
              dot={{ fill: '#8b5cf6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Emotion Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h3 className="text-xl font-display font-semibold text-calm-600 mb-4">
            🎭 Emotion Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.emotionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.emotionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h3 className="text-xl font-display font-semibold text-calm-600 mb-4">
            😰 Stress Levels
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.stressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" name="Count">
                {stats.stressData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STRESS_COLORS[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card bg-gradient-to-br from-calm-50 to-primary-50"
      >
        <h3 className="text-xl font-display font-semibold text-calm-600 mb-4">
          💡 Quick Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Most Common Emotions</p>
            <p className="text-lg font-semibold text-calm-600 capitalize">
              {stats.topEmotions.join(', ')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Stress Pattern</p>
            <p className="text-lg font-semibold text-calm-600">
              {stats.stressDistribution.high > stats.stressDistribution.low
                ? 'Higher stress recently'
                : 'Managing stress well'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
