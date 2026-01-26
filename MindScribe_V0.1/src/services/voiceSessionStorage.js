/**
 * Voice Session Storage Service
 * 
 * Manages persistent storage of voice therapy sessions in IndexedDB
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 * 
 * Features:
 * - Store voice session transcripts
 * - Query sessions by date
 * - Export session history
 * - Encrypted storage (same as journal entries)
 */

const DB_NAME = 'mindscribe';
const STORE_NAME = 'voiceSessions';
const DB_VERSION = 7; // Incremented to avoid version conflicts with existing stores

class VoiceSessionStorage {
  constructor() {
    this.db = null;
    this.encryptionKey = null;
  }

  /**
   * Initialize database connection
   * @param {CryptoKey} encryptionKey - Encryption key for session data
   * @returns {Promise<void>}
   */
  async init(encryptionKey = null) {
    this.encryptionKey = encryptionKey;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[VoiceStorage] Database error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[VoiceStorage] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        console.log('[VoiceStorage] Upgrading database...');

        // Create voiceSessions store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });

          // Create indexes
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          
          console.log('[VoiceStorage] Voice sessions store created');
        }
      };
    });
  }

  /**
   * Save voice therapy session
   * @param {Object} session - Session data
   * @returns {Promise<number>} - Session ID
   */
  async saveSession(session) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Prepare session data
      const sessionData = {
        timestamp: session.timestamp || new Date().toISOString(),
        date: session.date || new Date().toISOString().split('T')[0],
        userId: session.userId || 'default',
        duration: session.duration || 0,
        messageCount: session.conversationHistory?.length || 0,
        conversationHistory: session.conversationHistory || [],
        processingMetrics: session.processingMetrics || null,
        metadata: {
          vadEnabled: session.vadEnabled || false,
          whisperModel: session.whisperModel || 'base.en',
          piperVoice: session.piperVoice || 'lessac-medium',
          averageLatency: session.averageLatency || 0
        }
      };

      // Encrypt conversation history if encryption key provided
      if (this.encryptionKey && sessionData.conversationHistory.length > 0) {
        sessionData.conversationHistory = await this.encryptData(
          JSON.stringify(sessionData.conversationHistory)
        );
        sessionData.encrypted = true;
      } else {
        sessionData.encrypted = false;
      }

      // Save to IndexedDB
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(sessionData);

        request.onsuccess = () => {
          console.log(`[VoiceStorage] Session saved with ID: ${request.result}`);
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('[VoiceStorage] Save error:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[VoiceStorage] Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object>} - Session data
   */
  async getSession(sessionId) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(sessionId);

      request.onsuccess = async () => {
        const session = request.result;
        
        if (session && session.encrypted && this.encryptionKey) {
          // Decrypt conversation history
          try {
            const decrypted = await this.decryptData(session.conversationHistory);
            session.conversationHistory = JSON.parse(decrypted);
          } catch (error) {
            console.error('[VoiceStorage] Decryption failed:', error);
            session.conversationHistory = [];
          }
        }
        
        resolve(session);
      };

      request.onerror = () => {
        console.error('[VoiceStorage] Get error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all sessions
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of sessions
   */
  async getAllSessions(options = {}) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const {
      limit = 100,
      offset = 0,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      includeConversations = false
    } = options;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index(sortBy);
      
      const request = sortOrder === 'desc' 
        ? index.openCursor(null, 'prev')
        : index.openCursor(null, 'next');

      const sessions = [];
      let skipped = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && sessions.length < limit) {
          if (skipped < offset) {
            skipped++;
            cursor.continue();
            return;
          }

          const session = cursor.value;
          
          // Remove conversation history if not requested
          if (!includeConversations) {
            delete session.conversationHistory;
          }
          
          sessions.push(session);
          cursor.continue();
        } else {
          resolve(sessions);
        }
      };

      request.onerror = () => {
        console.error('[VoiceStorage] Query error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get sessions by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} - Array of sessions
   */
  async getSessionsByDateRange(startDate, endDate) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('date');
      
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.openCursor(range);

      const sessions = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor) {
          sessions.push(cursor.value);
          cursor.continue();
        } else {
          resolve(sessions);
        }
      };

      request.onerror = () => {
        console.error('[VoiceStorage] Date range query error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete session by ID
   * @param {number} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(sessionId);

      request.onsuccess = () => {
        console.log(`[VoiceStorage] Session ${sessionId} deleted`);
        resolve();
      };

      request.onerror = () => {
        console.error('[VoiceStorage] Delete error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete all sessions
   * @returns {Promise<void>}
   */
  async deleteAllSessions() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[VoiceStorage] All sessions deleted');
        resolve();
      };

      request.onerror = () => {
        console.error('[VoiceStorage] Clear error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} - Statistics
   */
  async getStatistics() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const sessions = await this.getAllSessions({ limit: 1000 });

    const stats = {
      totalSessions: sessions.length,
      totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      totalMessages: sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0),
      averageDuration: 0,
      averageMessages: 0,
      latestSession: null,
      oldestSession: null
    };

    if (stats.totalSessions > 0) {
      stats.averageDuration = stats.totalDuration / stats.totalSessions;
      stats.averageMessages = stats.totalMessages / stats.totalSessions;
      stats.latestSession = sessions[0]?.timestamp;
      stats.oldestSession = sessions[sessions.length - 1]?.timestamp;
    }

    return stats;
  }

  /**
   * Export sessions to JSON
   * @param {Array<number>} sessionIds - Session IDs to export (empty = all)
   * @returns {Promise<string>} - JSON string
   */
  async exportSessions(sessionIds = []) {
    let sessions;
    
    if (sessionIds.length > 0) {
      sessions = await Promise.all(
        sessionIds.map(id => this.getSession(id))
      );
    } else {
      sessions = await this.getAllSessions({ 
        limit: 10000, 
        includeConversations: true 
      });
    }

    // Remove encrypted flag and ensure conversations are readable
    const exportData = sessions.map(session => ({
      ...session,
      encrypted: false,
      exportedAt: new Date().toISOString()
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import sessions from JSON
   * @param {string} jsonData - JSON string
   * @returns {Promise<number>} - Number of sessions imported
   */
  async importSessions(jsonData) {
    try {
      const sessions = JSON.parse(jsonData);
      let imported = 0;

      for (const session of sessions) {
        // Remove ID to generate new one
        delete session.id;
        delete session.encrypted;
        
        await this.saveSession(session);
        imported++;
      }

      console.log(`[VoiceStorage] Imported ${imported} sessions`);
      return imported;
    } catch (error) {
      console.error('[VoiceStorage] Import failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt data using Web Crypto API
   * @param {string} data - Data to encrypt
   * @returns {Promise<Object>} - Encrypted data with IV
   */
  async encryptData(data) {
    if (!this.encryptionKey) {
      return data;
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        dataBuffer
      );

      return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encryptedBuffer))
      };
    } catch (error) {
      console.error('[VoiceStorage] Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using Web Crypto API
   * @param {Object} encryptedData - Encrypted data with IV
   * @returns {Promise<string>} - Decrypted data
   */
  async decryptData(encryptedData) {
    if (!this.encryptionKey || typeof encryptedData === 'string') {
      return encryptedData;
    }

    try {
      const iv = new Uint8Array(encryptedData.iv);
      const data = new Uint8Array(encryptedData.data);

      // Decrypt
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('[VoiceStorage] Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[VoiceStorage] Database closed');
    }
  }
}

// Export singleton instance
const voiceSessionStorage = new VoiceSessionStorage();
export default voiceSessionStorage;

// Export class for testing
export { VoiceSessionStorage };
