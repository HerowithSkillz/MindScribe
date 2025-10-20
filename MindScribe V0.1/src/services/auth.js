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

      // Hash password (simple approach - in production, use stronger hashing)
      const hashedPassword = await this.hashPassword(password);

      // Create user object
      const user = {
        username,
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      // Set encryption key for user's data
      await userStorage.setEncryptionKey(password);

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
      // Set encryption key
      await userStorage.setEncryptionKey(password);

      // Get user
      const user = await userStorage.get(`user_${username}`);
      
      if (!user) {
        throw new Error('Invalid username or password');
      }

      // Verify password
      const hashedPassword = await this.hashPassword(password);
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

  async hashPassword(password) {
    // Simple hash using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async updatePassword(username, oldPassword, newPassword) {
    try {
      // Verify old password
      await userStorage.setEncryptionKey(oldPassword);
      const user = await userStorage.get(`user_${username}`);
      
      if (!user) {
        throw new Error('User not found');
      }

      const oldHash = await this.hashPassword(oldPassword);
      if (user.password !== oldHash) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const newHash = await this.hashPassword(newPassword);
      user.password = newHash;

      // Re-encrypt with new password
      await userStorage.setEncryptionKey(newPassword);
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
