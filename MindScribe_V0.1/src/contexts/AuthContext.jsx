import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth';
import { journalStorage, chatStorage, analysisStorage } from '../services/storage';
import webLLMService from '../services/webllm';

const AuthContext = createContext(null);

// WebLLMContext import to trigger model initialization on login
let webLLMInitialize = null;

export const setWebLLMInitialize = (initFn) => {
  webLLMInitialize = initFn;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const result = await authService.login(username, password);
    if (result.success) {
      setUser(result.user);
      
      // Initialize storage encryption keys
      await journalStorage.setEncryptionKey(password);
      await chatStorage.setEncryptionKey(password);
      await analysisStorage.setEncryptionKey(password);
      
      // Initialize AI model immediately (no delay)
      if (webLLMInitialize) {
        // Use Promise to not block navigation, but start immediately
        webLLMInitialize().catch(err => 
          console.warn('AI model initialization error:', err)
        );
      }
    }
    return result;
  };

  const register = async (username, password, email) => {
    const result = await authService.register(username, password, email);
    if (result.success) {
      setUser(result.user);
      
      // Initialize storage encryption keys
      await journalStorage.setEncryptionKey(password);
      await chatStorage.setEncryptionKey(password);
      await analysisStorage.setEncryptionKey(password);
      
      // Initialize AI model immediately (no delay)
      if (webLLMInitialize) {
        // Use Promise to not block navigation, but start immediately
        webLLMInitialize().catch(err => 
          console.warn('AI model initialization error:', err)
        );
      }
    }
    return result;
  };

  const logout = async () => {
    // Unload AI model and clean up resources
    try {
      await webLLMService.unloadModel();
      console.log('AI model unloaded successfully on logout');
    } catch (error) {
      console.warn('Error unloading AI model on logout:', error);
    }
    
    authService.logout();
    setUser(null);
    
    // Clear encryption keys
    journalStorage.encryptionKey = null;
    chatStorage.encryptionKey = null;
    analysisStorage.encryptionKey = null;
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
