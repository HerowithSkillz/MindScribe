import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebLLMProvider } from './contexts/WebLLMContext';
import { VoiceProvider } from './contexts/VoiceContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import DASS21 from './components/DASS21';
import Layout from './components/Layout';
import ModelInitializationModal from './components/ModelInitializationModal';
import Chat from './pages/Chat';
import VoiceTherapy from './pages/VoiceTherapy';
import Journal from './pages/Journal';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Debug from './pages/Debug';

// Protected Route Component - requires authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🧠</div>
          <p className="text-gray-600">Loading MindScribe...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// App Routes Component
const AppRoutes = () => {
  const { isAuthenticated, hasCompletedDASS21, saveDASS21Results, user } = useAuth();
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleDASS21Complete = async (results) => {
    setSaving(true);
    setSaveError(null);
    
    try {
      const saved = await saveDASS21Results(results);
      if (saved) {
        // Navigation will happen automatically via hasCompletedDASS21 state change
        console.log('DASS-21 completed successfully');
      } else {
        // saveDASS21Results returned false - save failed
        setSaveError('Failed to save your assessment results. Please try again.');
      }
    } catch (error) {
      console.error('Unexpected error saving DASS-21:', error);
      setSaveError('An unexpected error occurred while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/chat" replace /> : <Login />}
      />
      <Route
        path="/assessment"
        element={
          <ProtectedRoute>
            {saveError && (
              <div className="fixed top-4 right-4 z-50 max-w-md">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">⚠️</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800 mb-1">Save Failed</h3>
                      <p className="text-sm text-red-700 mb-3">{saveError}</p>
                      <button
                        onClick={() => setSaveError(null)}
                        className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {saving && (
              <div className="fixed top-4 right-4 z-50">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin text-2xl">⏳</div>
                    <p className="text-sm text-blue-800 font-medium">Saving assessment...</p>
                  </div>
                </div>
              </div>
            )}
            <DASS21 onComplete={handleDASS21Complete} userName={user?.username} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ErrorBoundary pageName="Chat">
              <Layout>
                <Chat />
              </Layout>
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/voice"
        element={
          <ProtectedRoute>
            <ErrorBoundary pageName="Voice Therapy">
              <Layout>
                <VoiceTherapy />
              </Layout>
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/journal"
        element={
          <ProtectedRoute>
            <ErrorBoundary pageName="Journal">
              <Layout>
                <Journal />
              </Layout>
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ErrorBoundary pageName="Dashboard">
              <Layout>
                <Dashboard />
              </Layout>
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <ErrorBoundary pageName="Report">
              <Layout>
                <Report />
              </Layout>
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/debug"
        element={
          <ProtectedRoute>
            <ErrorBoundary pageName="Debug">
              <Layout>
                <Debug />
              </Layout>
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <Router>
      <AuthProvider>
        <WebLLMProvider>
          <VoiceProvider>
            <ModelInitializationModal />
            <AppRoutes />
          </VoiceProvider>
        </WebLLMProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
