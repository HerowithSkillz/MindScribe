import localforage from 'localforage';

// Initialize storage instances
const userStore = localforage.createInstance({
  name: 'mindscribe',
  storeName: 'users'
});

const journalStore = localforage.createInstance({
  name: 'mindscribe',
  storeName: 'journals'
});

const chatStore = localforage.createInstance({
  name: 'mindscribe',
  storeName: 'chats'
});

const settingsStore = localforage.createInstance({
  name: 'mindscribe',
  storeName: 'settings'
});

const analysisStore = localforage.createInstance({
  name: 'mindscribe',
  storeName: 'analysis'
});

// Encryption utilities using Web Crypto API
class CryptoService {
  static async generateKey(password) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('mindscribe-salt-2025'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data, key) {
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(JSON.stringify(data))
    );

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }

  static async decrypt(encryptedData, key) {
    const decoder = new TextDecoder();
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
      key,
      new Uint8Array(encryptedData.data)
    );

    return JSON.parse(decoder.decode(decrypted));
  }
}

// Storage service with encryption
class StorageService {
  constructor(store, useEncryption = false) {
    this.store = store;
    this.useEncryption = useEncryption;
    this.encryptionKey = null;
  }

  async setEncryptionKey(password) {
    if (this.useEncryption && password) {
      this.encryptionKey = await CryptoService.generateKey(password);
    }
  }

  async save(key, value) {
    try {
      let dataToSave = value;
      
      if (this.useEncryption && this.encryptionKey) {
        dataToSave = await CryptoService.encrypt(value, this.encryptionKey);
      }
      
      await this.store.setItem(key, dataToSave);
      return true;
    } catch (error) {
      console.error('Storage save error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const data = await this.store.getItem(key);
      
      if (!data) return null;
      
      if (this.useEncryption && this.encryptionKey && data.iv && data.data) {
        return await CryptoService.decrypt(data, this.encryptionKey);
      }
      
      return data;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  async remove(key) {
    try {
      await this.store.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  async clear() {
    try {
      await this.store.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  async keys() {
    try {
      return await this.store.keys();
    } catch (error) {
      console.error('Storage keys error:', error);
      return [];
    }
  }

  async getAllItems() {
    try {
      const keys = await this.keys();
      const items = [];
      
      for (const key of keys) {
        const value = await this.get(key);
        if (value) {
          items.push({ key, value });
        }
      }
      
      return items;
    } catch (error) {
      console.error('Storage getAllItems error:', error);
      return [];
    }
  }
}

// Export storage services
export const userStorage = new StorageService(userStore, true);
export const journalStorage = new StorageService(journalStore, true);
export const chatStorage = new StorageService(chatStore, true);
export const settingsStorage = new StorageService(settingsStore, false);
export const analysisStorage = new StorageService(analysisStore, true);

export default StorageService;
