import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DASS21Results from './DASS21Results';

const DASS21 = ({ onComplete, userName }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState({});
  const [showInstructions, setShowInstructions] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState(null);

  // DASS-21 Questions grouped by subscale
  const sections = [
    {
      name: 'Depression',
      color: 'blue',
      questions: [
        { id: 3, text: 'I couldn\'t seem to experience any positive feeling at all' },
        { id: 5, text: 'I found it difficult to work up the initiative to do things' },
        { id: 10, text: 'I felt that I had nothing to look forward to' },
        { id: 13, text: 'I felt down-hearted and blue' },
        { id: 16, text: 'I was unable to become enthusiastic about anything' },
        { id: 17, text: 'I felt I wasn\'t worth much as a person' },
        { id: 21, text: 'I felt that life was meaningless' }
      ]
    },
    {
      name: 'Anxiety',
      color: 'amber',
      questions: [
        { id: 2, text: 'I was aware of dryness of my mouth' },
        { id: 4, text: 'I experienced breathing difficulty (e.g., excessively rapid breathing, breathlessness)' },
        { id: 7, text: 'I experienced trembling (e.g., in the hands)' },
        { id: 9, text: 'I was worried about situations in which I might panic and make a fool of myself' },
        { id: 15, text: 'I felt I was close to panic' },
        { id: 19, text: 'I was aware of the action of my heart in the absence of physical exertion (e.g., sense of heart rate increase, heart missing a beat)' },
        { id: 20, text: 'I felt scared without any good reason' }
      ]
    },
    {
      name: 'Stress',
      color: 'rose',
      questions: [
        { id: 1, text: 'I found it hard to wind down' },
        { id: 6, text: 'I tended to over-react to situations' },
        { id: 8, text: 'I felt that I was using a lot of nervous energy' },
        { id: 11, text: 'I found myself getting agitated' },
        { id: 12, text: 'I found it difficult to relax' },
        { id: 14, text: 'I was intolerant of anything that kept me from getting on with what I was doing' },
        { id: 18, text: 'I felt that I was rather touchy' }
      ]
    }
  ];

  const scaleOptions = [
    { value: 0, label: 'Did not apply to me at all', short: 'Not at all' },
    { value: 1, label: 'Applied to me to some degree, or some of the time', short: 'Sometimes' },
    { value: 2, label: 'Applied to me to a considerable degree, or a good part of time', short: 'Often' },
    { value: 3, label: 'Applied to me very much, or most of the time', short: 'Almost Always' }
  ];

  const handleResponse = (questionId, value) => {
    setResponses({ ...responses, [questionId]: value });
  };

  const isCurrentSectionComplete = () => {
    const currentQuestions = sections[currentSection].questions;
    return currentQuestions.every(q => responses[q.id] !== undefined);
  };

  const calculateScores = () => {
    let depression = 0;
    let anxiety = 0;
    let stress = 0;

    sections[0].questions.forEach(q => { depression += responses[q.id] || 0; });
    sections[1].questions.forEach(q => { anxiety += responses[q.id] || 0; });
    sections[2].questions.forEach(q => { stress += responses[q.id] || 0; });

    // Multiply by 2 to get DASS-21 scores (aligned with DASS-42)
    return {
      depression: depression * 2,
      anxiety: anxiety * 2,
      stress: stress * 2
    };
  };

  const getSeverityLevel = (score, type) => {
    const ranges = {
      depression: [
        { max: 9, level: 'Normal', color: 'green' },
        { max: 13, level: 'Mild', color: 'blue' },
        { max: 20, level: 'Moderate', color: 'yellow' },
        { max: 27, level: 'Severe', color: 'orange' },
        { max: Infinity, level: 'Extremely Severe', color: 'red' }
      ],
      anxiety: [
        { max: 7, level: 'Normal', color: 'green' },
        { max: 9, level: 'Mild', color: 'blue' },
        { max: 14, level: 'Moderate', color: 'yellow' },
        { max: 19, level: 'Severe', color: 'orange' },
        { max: Infinity, level: 'Extremely Severe', color: 'red' }
      ],
      stress: [
        { max: 14, level: 'Normal', color: 'green' },
        { max: 18, level: 'Mild', color: 'blue' },
        { max: 25, level: 'Moderate', color: 'yellow' },
        { max: 33, level: 'Severe', color: 'orange' },
        { max: Infinity, level: 'Extremely Severe', color: 'red' }
      ]
    };

    return ranges[type].find(range => score <= range.max);
  };

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      // Complete assessment and show results
      const scores = calculateScores();
      const results = {
        scores,
        severityLevels: {
          depression: getSeverityLevel(scores.depression, 'depression'),
          anxiety: getSeverityLevel(scores.anxiety, 'anxiety'),
          stress: getSeverityLevel(scores.stress, 'stress')
        },
        responses,
        completedAt: new Date().toISOString(),
        userName
      };
      setAssessmentResults(results);
      setShowResults(true);
    }
  };

  const handleResultsContinue = () => {
    onComplete(assessmentResults);
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      amber: 'bg-amber-50 border-amber-200 text-amber-800',
      rose: 'bg-rose-50 border-rose-200 text-rose-800'
    };
    return colors[color] || colors.blue;
  };

  const getButtonColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-500 hover:bg-blue-600',
      amber: 'bg-amber-500 hover:bg-amber-600',
      rose: 'bg-rose-500 hover:bg-rose-600'
    };
    return colors[color] || colors.blue;
  };

  // Show results page if assessment is complete
  if (showResults && assessmentResults) {
    return <DASS21Results results={assessmentResults} onContinue={handleResultsContinue} />;
  }

  if (showInstructions) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card w-full max-w-2xl"
        >
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-3xl font-display font-bold text-calm-600 mb-2">
              Welcome to DASS-21
            </h2>
            <p className="text-gray-600">
              Depression, Anxiety, and Stress Scale
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3 text-lg">
              📖 Instructions
            </h3>
            <div className="space-y-3 text-blue-800 text-sm">
              <p>
                Please read each statement and select how much the statement applied to you <strong>over the past week</strong>.
              </p>
              <p>
                There are no right or wrong answers. Do not spend too much time on any statement.
              </p>
              <p className="font-medium">
                This assessment takes approximately 5-10 minutes to complete.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-amber-900 mb-3 text-lg">
              🔒 Your Privacy
            </h3>
            <p className="text-amber-800 text-sm">
              Your responses are stored locally on your device and are encrypted. The results will help MindScribe provide personalized support tailored to your mental health needs.
            </p>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="btn-primary w-full py-4 text-lg"
          >
            Start Assessment
          </button>
        </motion.div>
      </div>
    );
  }

  const section = sections[currentSection];
  const progress = ((currentSection + 1) / sections.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Section {currentSection + 1} of {sections.length}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="bg-calm-500 h-full rounded-full"
            />
          </div>
        </div>

        {/* Section Header */}
        <motion.div
          key={currentSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="card mb-6"
        >
          <div className={`${getColorClasses(section.color)} border rounded-lg p-4 mb-4`}>
            <h2 className="text-2xl font-bold font-display">
              {section.name} Assessment
            </h2>
            <p className="text-sm mt-1 opacity-80">
              Please indicate how much each statement applied to you over the past week
            </p>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {section.questions.map((question, idx) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border-b border-gray-200 pb-6 last:border-0"
              >
                <p className="font-medium text-gray-800 mb-4">
                  {idx + 1}. {question.text}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scaleOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleResponse(question.id, option.value)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        responses[question.id] === option.value
                          ? `${getButtonColorClasses(section.color)} text-white border-transparent shadow-md`
                          : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">{option.short}</div>
                      <div className="text-xs mt-1 opacity-80">{option.label}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between items-center gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentSection === 0}
            className="btn-secondary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="text-sm text-gray-600 text-center">
            {section.questions.filter(q => responses[q.id] !== undefined).length} of{' '}
            {section.questions.length} answered
          </div>

          <button
            onClick={handleNext}
            disabled={!isCurrentSectionComplete()}
            className={`${getButtonColorClasses(section.color)} text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg`}
          >
            {currentSection === sections.length - 1 ? 'Complete' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DASS21;
