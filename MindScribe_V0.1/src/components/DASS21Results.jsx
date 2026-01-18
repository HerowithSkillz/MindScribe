import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const DASS21Results = ({ results, onContinue }) => {
  const navigate = useNavigate();
  const { scores, severityLevels } = results;

  const getColorForLevel = (level) => {
    const colors = {
      'green': 'bg-green-50 border-green-200 text-green-800',
      'blue': 'bg-blue-50 border-blue-200 text-blue-800',
      'yellow': 'bg-yellow-50 border-yellow-200 text-yellow-800',
      'orange': 'bg-orange-50 border-orange-200 text-orange-800',
      'red': 'bg-red-50 border-red-200 text-red-800'
    };
    return colors[level] || colors.green;
  };

  const getBadgeColorForLevel = (level) => {
    const colors = {
      'green': 'bg-green-100 text-green-800',
      'blue': 'bg-blue-100 text-blue-800',
      'yellow': 'bg-yellow-100 text-yellow-800',
      'orange': 'bg-orange-100 text-orange-800',
      'red': 'bg-red-100 text-red-800'
    };
    return colors[level] || colors.green;
  };

  const getRecommendations = () => {
    const recommendations = [];
    
    if (severityLevels.depression.level !== 'Normal') {
      recommendations.push({
        icon: '💙',
        title: 'Depression Support',
        text: 'Consider regular journaling to track your mood patterns. Engage in activities you used to enjoy, even if they don\'t feel as rewarding right now.'
      });
    }
    
    if (severityLevels.anxiety.level !== 'Normal') {
      recommendations.push({
        icon: '🫁',
        title: 'Anxiety Management',
        text: 'Practice deep breathing exercises and mindfulness. Try to identify and challenge anxious thoughts when they arise.'
      });
    }
    
    if (severityLevels.stress.level !== 'Normal') {
      recommendations.push({
        icon: '🧘',
        title: 'Stress Reduction',
        text: 'Prioritize self-care and set healthy boundaries. Regular physical activity and adequate sleep can significantly reduce stress levels.'
      });
    }

    // Add general recommendations if all are normal
    if (recommendations.length === 0) {
      recommendations.push({
        icon: '✨',
        title: 'Maintain Well-being',
        text: 'Continue your current self-care practices. Regular check-ins with yourself through journaling can help maintain your mental health.'
      });
    }

    return recommendations;
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    }
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-4xl font-display font-bold text-calm-600 mb-2">
            Assessment Complete
          </h1>
          <p className="text-gray-600">
            Here are your DASS-21 results
          </p>
        </motion.div>

        {/* Scores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <h2 className="text-2xl font-display font-bold text-calm-600 mb-6">
            Your Scores
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Depression */}
            <div className={`p-6 rounded-lg border-2 ${getColorForLevel(severityLevels.depression.color)}`}>
              <div className="text-center">
                <div className="text-5xl mb-3">😔</div>
                <h3 className="font-bold text-lg mb-2">Depression</h3>
                <div className="text-4xl font-bold mb-2">{scores.depression}</div>
                <div className="text-sm opacity-75 mb-3">out of 42</div>
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${getBadgeColorForLevel(severityLevels.depression.color)}`}>
                  {severityLevels.depression.level}
                </span>
              </div>
            </div>

            {/* Anxiety */}
            <div className={`p-6 rounded-lg border-2 ${getColorForLevel(severityLevels.anxiety.color)}`}>
              <div className="text-center">
                <div className="text-5xl mb-3">😰</div>
                <h3 className="font-bold text-lg mb-2">Anxiety</h3>
                <div className="text-4xl font-bold mb-2">{scores.anxiety}</div>
                <div className="text-sm opacity-75 mb-3">out of 42</div>
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${getBadgeColorForLevel(severityLevels.anxiety.color)}`}>
                  {severityLevels.anxiety.level}
                </span>
              </div>
            </div>

            {/* Stress */}
            <div className={`p-6 rounded-lg border-2 ${getColorForLevel(severityLevels.stress.color)}`}>
              <div className="text-center">
                <div className="text-5xl mb-3">😤</div>
                <h3 className="font-bold text-lg mb-2">Stress</h3>
                <div className="text-4xl font-bold mb-2">{scores.stress}</div>
                <div className="text-sm opacity-75 mb-3">out of 42</div>
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${getBadgeColorForLevel(severityLevels.stress.color)}`}>
                  {severityLevels.stress.level}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Interpretation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-blue-50"
        >
          <h2 className="text-xl font-display font-bold text-calm-600 mb-4">
            📊 Understanding Your Results
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>
              The DASS-21 is a standardized assessment used by mental health professionals worldwide. 
              Your scores provide a baseline for understanding your current mental health status.
            </p>
            <p>
              <strong>Important:</strong> These results are not a diagnosis. They are meant to help you and 
              MindScribe better understand your mental health needs and provide more personalized support.
            </p>
            {(severityLevels.depression.level !== 'Normal' && severityLevels.depression.level !== 'Mild') ||
             (severityLevels.anxiety.level !== 'Normal' && severityLevels.anxiety.level !== 'Mild') ||
             (severityLevels.stress.level !== 'Normal' && severityLevels.stress.level !== 'Mild') ? (
              <p className="bg-amber-100 border border-amber-300 rounded-lg p-4 text-amber-900">
                <strong>⚠️ Please Note:</strong> Your results indicate moderate to severe levels in one or more areas. 
                We recommend speaking with a mental health professional for proper assessment and support.
              </p>
            ) : null}
          </div>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-xl font-display font-bold text-calm-600 mb-4">
            💡 Personalized Recommendations
          </h2>
          <div className="space-y-4">
            {getRecommendations().map((rec, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl">{rec.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-800 mb-1">
                    {rec.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {rec.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How MindScribe Will Help */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card bg-gradient-to-r from-purple-50 to-pink-50"
        >
          <h2 className="text-xl font-display font-bold text-calm-600 mb-4">
            🧠 How MindScribe Will Help You
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>
              Based on your assessment, MindScribe's AI companion will:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide empathetic, personalized responses tailored to your needs</li>
              <li>Help you track mood patterns and identify triggers</li>
              <li>Offer coping strategies and mindfulness exercises</li>
              <li>Support you through difficult moments with understanding</li>
              <li>Celebrate your progress and victories, no matter how small</li>
            </ul>
            <p className="mt-4 text-sm bg-white rounded-lg p-3 border border-purple-200">
              <strong>🔒 Privacy First:</strong> All your data stays on your device. Your responses, 
              journals, and conversations are encrypted and never shared.
            </p>
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <button
            onClick={handleContinue}
            className="btn-primary px-12 py-4 text-lg shadow-lg hover:shadow-xl"
          >
            Continue to MindScribe →
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default DASS21Results;
