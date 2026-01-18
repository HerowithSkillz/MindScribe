import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth';
import { userStorage, journalStorage, chatStorage, analysisStorage, assessmentStorage } from '../services/storage';
import webLLMService from '../services/webllm';
import { createError } from '../constants/errorMessages'; // Issue #20

const AuthContext = createContext(null);

// WebLLMContext import to trigger model initialization on login
let webLLMInitialize = null;

export const setWebLLMInitialize = (initFn) => {
  webLLMInitialize = initFn;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw createError('GENERAL', 'CONTEXT_ERROR'); // Issue #20: useAuth outside provider
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedDASS21, setHasCompletedDASS21] = useState(false);

  useEffect(() => {
    // Check for existing session
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    // Check if user has completed DASS-21
    if (currentUser) {
      checkDASS21Completion(currentUser.username);
    }
    
    setLoading(false);
  }, []);

  const checkDASS21Completion = async (username) => {
    const assessment = await assessmentStorage.get(`dass21_${username}`);
    setHasCompletedDASS21(!!assessment);
  };

  const login = async (username, password) => {
    const result = await authService.login(username, password);
    if (result.success) {
      setUser(result.user);
      
      // Fetch user's unique salt for encryption
      const saltArray = await userStorage.get(`salt_${username}`);
      const userSalt = new Uint8Array(saltArray);
      
      // Initialize storage encryption keys with user-specific salt
      await journalStorage.setEncryptionKey(password, userSalt);
      await chatStorage.setEncryptionKey(password, userSalt);
      await analysisStorage.setEncryptionKey(password, userSalt);
      
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
      
      // Fetch user's unique salt (already created by authService.register)
      const saltArray = await userStorage.get(`salt_${username}`);
      const userSalt = new Uint8Array(saltArray);
      
      // Initialize storage encryption keys with user-specific salt
      await journalStorage.setEncryptionKey(password, userSalt);
      await chatStorage.setEncryptionKey(password, userSalt);
      await analysisStorage.setEncryptionKey(password, userSalt);
      await assessmentStorage.setEncryptionKey(password, userSalt);
      
      // DASS-21 will be completed after registration (hasCompletedDASS21 remains false)
      
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
    setHasCompletedDASS21(false);
    
    // Clear encryption keys
    journalStorage.encryptionKey = null;
    chatStorage.encryptionKey = null;
    analysisStorage.encryptionKey = null;
    assessmentStorage.encryptionKey = null;
  };

  const saveDASS21Results = async (results) => {
    if (!user) return false;
    
    try {
      await assessmentStorage.save(`dass21_${user.username}`, results);
      setHasCompletedDASS21(true);
      return true;
    } catch (error) {
      console.error('Error saving DASS-21 results:', error);
      return false;
    }
  };

  const getDASS21Results = async () => {
    if (!user) return null;
    return await assessmentStorage.get(`dass21_${user.username}`);
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading,
    hasCompletedDASS21,
    saveDASS21Results,
    getDASS21Results
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
