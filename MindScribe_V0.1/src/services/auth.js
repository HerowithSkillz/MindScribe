import { userStorage } from './storage';

class AuthService {
  constructor() {
    this.currentUser = null;
  }

  async register(username, password, email = '') {
    try {
      // Check if user already exists
      const existingUser = await userStorage.get(`user_${username}`);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Generate unique salt for this user (CRITICAL SECURITY FIX)
      const { CryptoService } = await import('./storage');
      const userSalt = CryptoService.generateSalt();
      
      // Store salt (not secret, can be stored plainly)
      await userStorage.save(`salt_${username}`, Array.from(userSalt));

      // Hash password with salt for authentication
      const hashedPassword = await this.hashPassword(password, userSalt);

      // Create user object
      const user = {
        username,
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      // Set encryption key for user's data with their unique salt
      await userStorage.setEncryptionKey(password, userSalt);

      // Save user
      await userStorage.save(`user_${username}`, user);

      // Set as current user
      this.currentUser = { username, email };
      
      // Save session
      sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));

      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  async login(username, password) {
    try {
      // Fetch user's unique salt (CRITICAL SECURITY FIX)
      const saltArray = await userStorage.get(`salt_${username}`);
      
      if (!saltArray) {
        throw new Error('Invalid username or password');
      }

      const userSalt = new Uint8Array(saltArray);

      // Set encryption key with user's salt
      await userStorage.setEncryptionKey(password, userSalt);

      // Get user
      const user = await userStorage.get(`user_${username}`);
      
      if (!user) {
        throw new Error('Invalid username or password');
      }

      // Verify password with salt
      const hashedPassword = await this.hashPassword(password, userSalt);
      if (user.password !== hashedPassword) {
        throw new Error('Invalid username or password');
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      await userStorage.save(`user_${username}`, user);

      // Set as current user
      this.currentUser = { username, email: user.email };
      
      // Save session
      sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));

      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('currentUser');
    // Clear encryption keys
    userStorage.encryptionKey = null;
  }

  getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Try to restore from session
    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) {
      this.currentUser = JSON.parse(sessionUser);
      return this.currentUser;
    }

    return null;
  }

  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  async hashPassword(password, salt) {
    // Use PBKDF2 with salt for secure password hashing
    const encoder = new TextEncoder();
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async updatePassword(username, oldPassword, newPassword) {
    try {
      // Fetch user's salt
      const saltArray = await userStorage.get(`salt_${username}`);
      if (!saltArray) {
        throw new Error('User not found');
      }
      
      const userSalt = new Uint8Array(saltArray);

      // Verify old password with salt
      await userStorage.setEncryptionKey(oldPassword, userSalt);
      const user = await userStorage.get(`user_${username}`);
      
      if (!user) {
        throw new Error('User not found');
      }

      const oldHash = await this.hashPassword(oldPassword, userSalt);
      if (user.password !== oldHash) {
        throw new Error('Current password is incorrect');
      }

      // Update password with same salt (salt doesn't change on password update)
      const newHash = await this.hashPassword(newPassword, userSalt);
      user.password = newHash;

      // Re-encrypt with new password and existing salt
      await userStorage.setEncryptionKey(newPassword, userSalt);
      await userStorage.save(`user_${username}`, user);

      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error: error.message };
    }
  }
}

const authService = new AuthService();

export default authService;
