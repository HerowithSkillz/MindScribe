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
      const stressCounts = { low: 0, medium: 0, high: 0 };
      const sentimentByDay = {};
      const moodByDay = {}; // FR-008: Mood trends
      const journalFrequency = {}; // FR-008: Journaling consistency
      
      let totalSentiment = 0;
      let positiveCount = 0; // sentiment >= 6
      let negativeCount = 0; // sentiment < 4
      let neutralCount = 0; // sentiment 4-5.9

      userAnalysis.forEach(analysis => {
        // Count emotions
        const emotion = analysis.emotion || analysis.mood || 'neutral';
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;

        // Count stress levels (handle both 'moderate' and 'medium')
        let stress = analysis.stress || analysis.stressLevel || 'medium';
        if (stress === 'moderate') stress = 'medium';
        stressCounts[stress] = (stressCounts[stress] || 0) + 1;

        // Sentiment by day
        const date = new Date(analysis.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!sentimentByDay[date]) {
          sentimentByDay[date] = { date, sentiments: [], avg: 0 };
        }
        sentimentByDay[date].sentiments.push(analysis.sentiment || 5);
        
        // FR-008: Mood tracking by day
        if (!moodByDay[date]) {
          moodByDay[date] = { date, moods: [] };
        }
        moodByDay[date].moods.push(emotion);
        
        // FR-008: Journal frequency (entries per day)
        journalFrequency[date] = (journalFrequency[date] || 0) + 1;

        // FR-008: Emotional balance calculation
        const sentimentScore = analysis.sentiment || 5;
        totalSentiment += sentimentScore;
        if (sentimentScore >= 6) positiveCount++;
        else if (sentimentScore < 4) negativeCount++;
        else neutralCount++;
      });

      // Calculate average sentiment per day
      Object.values(sentimentByDay).forEach(day => {
        day.avg = day.sentiments.reduce((a, b) => a + b, 0) / day.sentiments.length;
      });

      const avgSentiment = totalSentiment / userAnalysis.length;
      
      // FR-008: Calculate emotional balance percentage
      const totalEmotions = positiveCount + negativeCount + neutralCount;
      const emotionalBalance = {
        positive: ((positiveCount / totalEmotions) * 100).toFixed(1),
        negative: ((negativeCount / totalEmotions) * 100).toFixed(1),
        neutral: ((neutralCount / totalEmotions) * 100).toFixed(1)
      };
      
      // FR-008: Journaling consistency (entries per day average)
      const uniqueDays = Object.keys(journalFrequency).length;
      const avgEntriesPerDay = (userAnalysis.length / uniqueDays).toFixed(1);
      const consistencyScore = uniqueDays >= (timeRange * 0.7) ? 'Excellent' 
        : uniqueDays >= (timeRange * 0.4) ? 'Good' 
        : 'Needs Improvement';

      // Prepare chart data
      const emotionData = Object.entries(emotionCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const stressData = [
        { name: 'Low', value: stressCounts.low },
        { name: 'Medium', value: stressCounts.medium },
        { name: 'High', value: stressCounts.high }
      ];

      const trendData = Object.values(sentimentByDay);
      
      // FR-008: Emotional balance chart data
      const balanceData = [
        { name: 'Positive', value: positiveCount, percentage: emotionalBalance.positive },
        { name: 'Neutral', value: neutralCount, percentage: emotionalBalance.neutral },
        { name: 'Negative', value: negativeCount, percentage: emotionalBalance.negative }
      ];
      
      // FR-008: Journaling frequency data
      const frequencyData = Object.entries(journalFrequency)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setStats({
        totalEntries: userAnalysis.length,
        avgSentiment: avgSentiment.toFixed(1),
        emotionData,
        stressData,
        trendData,
        topEmotions: emotionData.slice(0, 3).map(e => e.name),
        stressDistribution: stressCounts,
        // FR-008: Additional metrics
        emotionalBalance,
        balanceData,
        frequencyData,
        avgEntriesPerDay,
        consistencyScore,
        uniqueDays,
        positiveCount,
        negativeCount,
        neutralCount
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

      {/* Summary Cards - FR-008 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <p className="text-4xl mb-2">�</p>
          <p className="text-xl font-bold text-calm-600">{stats.consistencyScore}</p>
          <p className="text-gray-600">Consistency</p>
          <p className="text-xs text-gray-500">{stats.uniqueDays} days active</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card text-center"
        >
          <p className="text-4xl mb-2">⚖️</p>
          <p className="text-2xl font-bold text-green-600">{stats.emotionalBalance.positive}%</p>
          <p className="text-gray-600">Positive Balance</p>
          <p className="text-xs text-gray-500">
            <span className="text-yellow-600">{stats.emotionalBalance.neutral}%</span> neutral, 
            <span className="text-red-600"> {stats.emotionalBalance.negative}%</span> negative
          </p>
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

      {/* Emotion Distribution & Emotional Balance */}
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

        {/* FR-008: Emotional Balance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h3 className="text-xl font-display font-semibold text-calm-600 mb-4">
            ⚖️ Emotional Balance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.balanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value, name, props) => [
                  `${value} entries (${props.payload.percentage}%)`,
                  name
                ]}
              />
              <Bar dataKey="value" name="Count">
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
                <Cell fill="#ef4444" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Stress Levels & Journaling Consistency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
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

        {/* FR-008: Journaling Consistency Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card"
        >
          <h3 className="text-xl font-display font-semibold text-calm-600 mb-4">
            📅 Journaling Consistency
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.frequencyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" name="Entries per Day" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 text-center text-sm text-gray-600">
            Average: {stats.avgEntriesPerDay} entries/day
          </div>
        </motion.div>
      </div>

      {/* FR-008: Enhanced Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="card bg-gradient-to-br from-calm-50 to-primary-50"
      >
        <h3 className="text-xl font-display font-semibold text-calm-600 mb-4">
          💡 Your Mental Health Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Most Common Emotions</p>
            <p className="text-lg font-semibold text-calm-600 capitalize">
              {stats.topEmotions.join(', ') || 'Neutral'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Stress Pattern</p>
            <p className="text-lg font-semibold text-calm-600">
              {stats.stressDistribution.high > stats.stressDistribution.low
                ? '⚠️ Higher stress detected'
                : '✅ Managing stress well'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              High: {stats.stressDistribution.high} | Medium: {stats.stressDistribution.medium} | Low: {stats.stressDistribution.low}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Emotional Trend</p>
            <p className="text-lg font-semibold text-calm-600">
              {stats.positiveCount > stats.negativeCount 
                ? '📈 Mostly Positive'
                : stats.positiveCount === stats.negativeCount
                ? '⚖️ Balanced'
                : '📉 Needs Attention'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.positiveCount} positive, {stats.neutralCount} neutral, {stats.negativeCount} negative
            </p>
          </div>
        </div>
        
        {/* Additional recommendations based on data */}
        <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-calm-500">
          <p className="text-sm font-medium text-gray-700 mb-2">💭 Personalized Recommendation:</p>
          <p className="text-sm text-gray-600">
            {stats.consistencyScore === 'Excellent' 
              ? "Great job maintaining your journaling habit! Your consistency is helping you track your emotional patterns effectively."
              : stats.consistencyScore === 'Good'
              ? "You're doing well! Try to journal a bit more regularly to get better insights into your mental health patterns."
              : "Consider journaling more frequently to better understand your emotional patterns and mental health trends."}
            {stats.stressDistribution.high > stats.totalEntries * 0.4 && 
              " Your stress levels have been elevated. Consider incorporating relaxation techniques like deep breathing or meditation."}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
