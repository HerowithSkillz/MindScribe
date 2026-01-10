/**
 * Centralized Error Message System for MindScribe V0.1
 * Issue #20: Consistent error messaging across the application
 * 
 * Structure:
 * - user: User-friendly message displayed in UI
 * - dev: Technical message for console logging
 * - action: (Optional) Suggested action for the user
 */

export const ERROR_MESSAGES = {
  // ============================================
  // AI MODEL ERRORS
  // ============================================
  MODEL: {
    NOT_INITIALIZED: {
      user: "The AI model is still loading. Please wait a moment.",
      dev: "Model not initialized - engine is null or not ready",
      action: "Wait for model initialization to complete or refresh the page."
    },
    INITIALIZATION_FAILED: {
      user: "Failed to load the AI model. Please check your internet connection and try again.",
      dev: "Model initialization failed during CreateWebWorkerMLCEngine",
      action: "Check network connection, browser compatibility, and try refreshing the page."
    },
    ALREADY_BUSY: {
      user: "The AI is currently processing another request. Please wait or cancel the current operation.",
      dev: "Task queue busy - another operation in progress",
      action: "Wait for the current operation to finish or click Cancel."
    },
    SWITCH_FAILED: {
      user: "Failed to switch AI models. Please try again.",
      dev: "Model selection failed during setModel operation",
      action: "Try selecting the model again or refresh the page."
    },
    UNLOAD_FAILED: {
      user: "Failed to unload the AI model.",
      dev: "Model unload operation failed",
      action: "Try refreshing the page to reset the model."
    },
    CHAT_FAILED: {
      user: "I encountered an error while processing your message. Please try again.",
      dev: "Chat completion failed during streaming or generation",
      action: "Try sending your message again."
    },
    ANALYSIS_FAILED: {
      user: "Failed to analyze your journal entry. Please try again.",
      dev: "Journal analysis operation failed",
      action: "Try analyzing again or check your journal text."
    },
    REPORT_GENERATION_FAILED: {
      user: "Failed to generate your wellness report. Please try again later.",
      dev: "Report generation failed during LLM completion",
      action: "Try generating the report again."
    },
    RECOMMENDATIONS_FAILED: {
      user: "Failed to generate recommendations. Please try again.",
      dev: "Therapy recommendations generation failed",
      action: "Try generating recommendations again."
    }
  },

  // ============================================
  // BROWSER COMPATIBILITY ERRORS
  // ============================================
  BROWSER: {
    WEBGPU_NOT_SUPPORTED: {
      user: "Your browser doesn't support WebGPU. Please use Chrome 113+ or Edge 113+ to run MindScribe.",
      dev: "WebGPU not supported - navigator.gpu is undefined",
      action: "Update your browser to Chrome 113+ or Edge 113+."
    },
    WEBGPU_ADAPTER_UNAVAILABLE: {
      user: "WebGPU is unavailable. Your GPU may be disabled or blocked by your system.",
      dev: "WebGPU adapter request failed - GPU unavailable or blocked",
      action: "Check GPU settings in browser flags or system preferences."
    },
    WEBGPU_INIT_FAILED: {
      user: "WebGPU initialization failed. Please check your GPU drivers and browser settings.",
      dev: "WebGPU initialization error during adapter request",
      action: "Update GPU drivers or check browser WebGPU flags."
    }
  },

  // ============================================
  // AUTHENTICATION ERRORS
  // ============================================
  AUTH: {
    USERNAME_EXISTS: {
      user: "This username is already taken. Please choose a different username.",
      dev: "Registration failed - username already exists in storage",
      action: "Try a different username."
    },
    INVALID_CREDENTIALS: {
      user: "Invalid username or password. Please try again.",
      dev: "Login failed - credentials don't match stored user data",
      action: "Check your username and password and try again."
    },
    USER_NOT_FOUND: {
      user: "User account not found.",
      dev: "User lookup failed - username not in storage",
      action: "Check the username or register a new account."
    },
    INCORRECT_PASSWORD: {
      user: "Current password is incorrect.",
      dev: "Password verification failed during password change",
      action: "Enter the correct current password."
    },
    PASSWORDS_DONT_MATCH: {
      user: "Passwords do not match. Please make sure both passwords are the same.",
      dev: "Password confirmation mismatch during registration",
      action: "Re-enter matching passwords."
    },
    PASSWORD_TOO_SHORT: {
      user: "Password must be at least 6 characters long.",
      dev: "Password validation failed - length < 6",
      action: "Use a longer password (minimum 6 characters)."
    },
    REGISTRATION_FAILED: {
      user: "Registration failed. Please try again.",
      dev: "User registration operation failed",
      action: "Try registering again or use a different username."
    },
    LOGIN_FAILED: {
      user: "Login failed. Please check your credentials and try again.",
      dev: "Login operation failed",
      action: "Verify your username and password."
    },
    CONTEXT_ERROR: {
      user: "Authentication error occurred.",
      dev: "useAuth called outside AuthProvider context",
      action: "This is a developer error - contact support."
    }
  },

  // ============================================
  // STORAGE ERRORS
  // ============================================
  STORAGE: {
    SAVE_FAILED: {
      user: "Failed to save data. Please try again.",
      dev: "Storage save operation failed",
      action: "Try saving again or check browser storage limits."
    },
    LOAD_FAILED: {
      user: "Failed to load data. Your data may be corrupted.",
      dev: "Storage retrieval operation failed",
      action: "Try refreshing the page or clearing browser data."
    },
    DELETE_FAILED: {
      user: "Failed to delete data.",
      dev: "Storage remove operation failed",
      action: "Try deleting again or clear browser data manually."
    },
    CLEAR_FAILED: {
      user: "Failed to clear storage.",
      dev: "Storage clear operation failed",
      action: "Try manually clearing browser data."
    },
    ENCRYPTION_FAILED: {
      user: "Failed to encrypt your data. Please try again.",
      dev: "Encryption operation failed during data save",
      action: "Try again or check browser crypto API support."
    },
    DECRYPTION_FAILED: {
      user: "Failed to decrypt your data. Your data may be corrupted.",
      dev: "Decryption operation failed during data load",
      action: "Your data may be unrecoverable. Try clearing browser data."
    },
    INVALID_SALT: {
      user: "Security configuration error.",
      dev: "Invalid salt provided for key generation - must be Uint8Array",
      action: "This is a developer error - contact support."
    },
    JOURNAL_SAVE_FAILED: {
      user: "Failed to save journal entry. Please try again.",
      dev: "Journal entry save operation failed",
      action: "Try saving your entry again."
    }
  },

  // ============================================
  // VOICE FEATURE ERRORS
  // ============================================
  VOICE: {
    NOT_SUPPORTED: {
      user: "Voice input is not supported in your browser.",
      dev: "SpeechRecognition API not available",
      action: "Use a browser that supports the Web Speech API (Chrome, Edge)."
    },
    RECOGNITION_ERROR: {
      user: "Voice recognition failed. Please try again.",
      dev: "Speech recognition error event triggered",
      action: "Check microphone permissions and try again."
    },
    SYNTHESIS_NOT_SUPPORTED: {
      user: "Voice output is not supported in your browser.",
      dev: "SpeechSynthesis API not available",
      action: "Use a browser that supports Text-to-Speech."
    },
    SYNTHESIS_ERROR: {
      user: "Voice output failed.",
      dev: "Speech synthesis error event triggered",
      action: "Try toggling voice output off and on again."
    },
    MICROPHONE_PERMISSION_DENIED: {
      user: "Microphone access denied. Please allow microphone access in your browser settings.",
      dev: "getUserMedia permission denied or not-allowed error",
      action: "Enable microphone permissions in browser settings."
    }
  },

  // ============================================
  // NETWORK ERRORS
  // ============================================
  NETWORK: {
    DOWNLOAD_FAILED: {
      user: "Failed to download model files. Please check your internet connection.",
      dev: "Model download failed - network fetch error",
      action: "Check your internet connection and firewall settings."
    },
    TIMEOUT: {
      user: "Request timed out. Please try again.",
      dev: "Operation exceeded timeout threshold",
      action: "Check your internet connection and try again."
    },
    OFFLINE: {
      user: "You appear to be offline. Please check your internet connection.",
      dev: "Network offline detected",
      action: "Connect to the internet and try again."
    }
  },

  // ============================================
  // INPUT VALIDATION ERRORS
  // ============================================
  INPUT: {
    EMPTY_MESSAGE: {
      user: "Please enter a message.",
      dev: "Empty message submitted to chat",
      action: "Type a message before sending."
    },
    INVALID_JOURNAL_TEXT: {
      user: "Journal entry is too short. Please write at least a few words.",
      dev: "Journal text validation failed - too short",
      action: "Write a longer journal entry."
    },
    INVALID_FORMAT: {
      user: "Invalid format. Please check your input.",
      dev: "Input format validation failed",
      action: "Correct the input format and try again."
    }
  },

  // ============================================
  // CACHE MANAGEMENT ERRORS
  // ============================================
  CACHE: {
    CLEAR_FAILED: {
      user: "Failed to clear cache. Please try manually clearing browser data.",
      dev: "Cache API clear operation failed",
      action: "Manually clear browser data in settings."
    },
    CLEAR_SUCCESS: {
      user: "Cache cleared successfully! Please reload the page.",
      dev: "Cache cleared successfully",
      action: "Reload the page to see changes."
    },
    PURGE_FAILED: {
      user: "Failed to remove unused model files.",
      dev: "Cache purge operation failed",
      action: "Try clearing all cache or manually clear browser data."
    }
  },

  // ============================================
  // GENERAL ERRORS
  // ============================================
  GENERAL: {
    UNEXPECTED_ERROR: {
      user: "An unexpected error occurred. Please try again.",
      dev: "Unhandled exception caught",
      action: "Try refreshing the page or contact support if the problem persists."
    },
    CONTEXT_ERROR: {
      user: "Application configuration error.",
      dev: "React hook called outside required context provider",
      action: "This is a developer error - contact support."
    },
    FEATURE_UNAVAILABLE: {
      user: "This feature is currently unavailable.",
      dev: "Feature not implemented or disabled",
      action: "This feature may be available in a future update."
    }
  }
};

/**
 * Helper function to get error message object by key path
 * @param {string} category - Error category (e.g., 'MODEL', 'AUTH')
 * @param {string} type - Specific error type (e.g., 'NOT_INITIALIZED')
 * @returns {Object} Error message object with user, dev, and action properties
 */
export function getErrorMessage(category, type) {
  const error = ERROR_MESSAGES[category]?.[type];
  
  if (!error) {
    console.warn(`Error message not found: ${category}.${type}`);
    return ERROR_MESSAGES.GENERAL.UNEXPECTED_ERROR;
  }
  
  return error;
}

/**
 * Helper function to log error with consistent format
 * @param {string} category - Error category
 * @param {string} type - Specific error type
 * @param {Error} originalError - Original error object (optional)
 */
export function logError(category, type, originalError = null) {
  const error = getErrorMessage(category, type);
  const timestamp = new Date().toISOString();
  
  console.error(`[${timestamp}] ${category}.${type}:`, error.dev);
  
  if (originalError) {
    console.error('Original error:', originalError);
  }
}

/**
 * Helper function to create Error object with consistent message
 * @param {string} category - Error category
 * @param {string} type - Specific error type
 * @returns {Error} Error object with user-friendly message
 */
export function createError(category, type) {
  const error = getErrorMessage(category, type);
  const err = new Error(error.user);
  err.technicalMessage = error.dev;
  err.action = error.action;
  err.category = category;
  err.type = type;
  return err;
}

export default ERROR_MESSAGES;
