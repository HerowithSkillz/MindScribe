import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebLLMProvider } from './contexts/WebLLMContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Layout from './components/Layout';
import ModelInitializationModal from './components/ModelInitializationModal';
import Chat from './pages/Chat';
import Journal from './pages/Journal';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Debug from './pages/Debug';

// Protected Route Component
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
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/chat" replace /> : <Login />}
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
          <ModelInitializationModal />
          <AppRoutes />
        </WebLLMProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
