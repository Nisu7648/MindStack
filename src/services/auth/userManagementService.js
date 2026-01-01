/**
 * USER MANAGEMENT SERVICE
 * Complete user management with offline support
 * 
 * Features:
 * - User CRUD operations
 * - Role assignment
 * - Password management
 * - Session management
 * - Offline authentication
 * - Activity tracking
 */

import { getDatabase } from '../database/schema';
import permissionService, { ROLES } from '../auth/permissionService';
import offlineSyncService from '../offline/syncService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

/**
 * USER STATUS
 */
export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  LOCKED: 'LOCKED'
};

/**
 * SESSION STATUS
 */
export const SESSION_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  LOGGED_OUT: 'LOGGED_OUT'
};

/**
 * User Management Service
 */
class UserManagementService {
  constructor() {
    this.currentUser = null;
    this.currentSession = null;
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    const db = await getDatabase();
    
    // Validate required fields
    if (!userData.username || !userData.password || !userData.role) {
      throw new Error('Username, password, and role are required');
    }
    
    // Check if username exists
    const existing = await db.executeSql(
      'SELECT id FROM users WHERE username = ?',
      [userData.username]
    );
    
    if (existing.rows.length > 0) {
      throw new Error('Username already exists');
    }
    
    // Hash password
    const passwordHash = await this.hashPassword(userData.password);
    
    // Generate user ID
    const userId = this.generateUserId();
    
    // Insert user
    await db.executeSql(
      `INSERT INTO users (
        id, username, password_hash, email, full_name, phone,
        role, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userData.username,
        passwordHash,
        userData.email || null,
        userData.fullName || null,
        userData.phone || null,
        userData.role,
        USER_STATUS.ACTIVE,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
    
    // Add to sync queue if online
    await offlineSyncService.addToQueue({
      operationType: 'CREATE',
      entityType: 'user',
      entityId: userId,
      data: { ...userData, passwordHash }
    });
    
    return {
      success: true,
      userId,
      message: 'User created successfully'
    };
  }

  /**
   * Update user
   */
  async updateUser(userId, updates) {
    const db = await getDatabase();
    
    // Check if user exists
    const existing = await db.executeSql(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (existing.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = existing.rows.item(0);
    
    // Build update query
    const updateFields = [];
    const updateValues = [];
    
    if (updates.email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(updates.email);
    }
    
    if (updates.fullName !== undefined) {
      updateFields.push('full_name = ?');
      updateValues.push(updates.fullName);
    }
    
    if (updates.phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(updates.phone);
    }
    
    if (updates.role !== undefined) {
      updateFields.push('role = ?');
      updateValues.push(updates.role);
    }
    
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }
    
    if (updates.password) {
      const passwordHash = await this.hashPassword(updates.password);
      updateFields.push('password_hash = ?');
      updateValues.push(passwordHash);
    }
    
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    
    updateValues.push(userId);
    
    // Execute update
    await db.executeSql(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    // Add to sync queue
    await offlineSyncService.addToQueue({
      operationType: 'UPDATE',
      entityType: 'user',
      entityId: userId,
      data: updates
    });
    
    return {
      success: true,
      message: 'User updated successfully'
    };
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    const db = await getDatabase();
    
    // Check if user exists
    const existing = await db.executeSql(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (existing.rows.length === 0) {
      throw new Error('User not found');
    }
    
    // Soft delete (mark as inactive)
    await db.executeSql(
      'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
      [USER_STATUS.INACTIVE, new Date().toISOString(), userId]
    );
    
    // Add to sync queue
    await offlineSyncService.addToQueue({
      operationType: 'DELETE',
      entityType: 'user',
      entityId: userId,
      data: {}
    });
    
    return {
      success: true,
      message: 'User deleted successfully'
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const db = await getDatabase();
    
    const result = await db.executeSql(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows.item(0);
    delete user.password_hash; // Don't return password hash
    
    return user;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username) {
    const db = await getDatabase();
    
    const result = await db.executeSql(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows.item(0);
  }

  /**
   * List all users
   */
  async listUsers(filters = {}) {
    const db = await getDatabase();
    
    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    
    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }
    
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }
    
    const result = await db.executeSql(query, params);
    
    const users = [];
    for (let i = 0; i < result.rows.length; i++) {
      const user = result.rows.item(i);
      delete user.password_hash;
      users.push(user);
    }
    
    return users;
  }

  /**
   * Authenticate user (offline-capable)
   */
  async authenticate(username, password) {
    const db = await getDatabase();
    
    // Get user
    const user = await this.getUserByUsername(username);
    
    if (!user) {
      throw new Error('Invalid username or password');
    }
    
    // Check status
    if (user.status !== USER_STATUS.ACTIVE) {
      throw new Error(`Account is ${user.status.toLowerCase()}`);
    }
    
    // Verify password
    const isValid = await this.verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      // Increment failed attempts
      await this.incrementFailedAttempts(user.id);
      throw new Error('Invalid username or password');
    }
    
    // Reset failed attempts
    await this.resetFailedAttempts(user.id);
    
    // Create session
    const session = await this.createSession(user);
    
    // Set current user
    this.currentUser = user;
    this.currentSession = session;
    
    // Set in permission service
    permissionService.setCurrentUser(user);
    
    // Save to AsyncStorage for offline access
    await AsyncStorage.setItem('@current_user', JSON.stringify(user));
    await AsyncStorage.setItem('@current_session', JSON.stringify(session));
    
    // Log activity
    await this.logActivity(user.id, 'LOGIN', 'User logged in');
    
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      },
      session
    };
  }

  /**
   * Logout user
   */
  async logout() {
    if (!this.currentSession) {
      return { success: true };
    }
    
    const db = await getDatabase();
    
    // Update session
    await db.executeSql(
      'UPDATE sessions SET status = ?, ended_at = ? WHERE id = ?',
      [SESSION_STATUS.LOGGED_OUT, new Date().toISOString(), this.currentSession.id]
    );
    
    // Log activity
    if (this.currentUser) {
      await this.logActivity(this.currentUser.id, 'LOGOUT', 'User logged out');
    }
    
    // Clear current user
    this.currentUser = null;
    this.currentSession = null;
    
    // Clear AsyncStorage
    await AsyncStorage.removeItem('@current_user');
    await AsyncStorage.removeItem('@current_session');
    
    return { success: true };
  }

  /**
   * Restore session from offline storage
   */
  async restoreSession() {
    try {
      const userStr = await AsyncStorage.getItem('@current_user');
      const sessionStr = await AsyncStorage.getItem('@current_session');
      
      if (!userStr || !sessionStr) {
        return null;
      }
      
      const user = JSON.parse(userStr);
      const session = JSON.parse(sessionStr);
      
      // Check if session is still valid
      const expiryDate = new Date(session.expires_at);
      if (expiryDate < new Date()) {
        await this.logout();
        return null;
      }
      
      // Restore current user
      this.currentUser = user;
      this.currentSession = session;
      
      // Set in permission service
      permissionService.setCurrentUser(user);
      
      return { user, session };
    } catch (error) {
      console.error('Failed to restore session:', error);
      return null;
    }
  }

  /**
   * Create session
   */
  async createSession(user) {
    const db = await getDatabase();
    
    const sessionId = this.generateSessionId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session
    
    await db.executeSql(
      `INSERT INTO sessions (
        id, user_id, status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        sessionId,
        user.id,
        SESSION_STATUS.ACTIVE,
        new Date().toISOString(),
        expiresAt.toISOString()
      ]
    );
    
    return {
      id: sessionId,
      userId: user.id,
      status: SESSION_STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    const db = await getDatabase();
    
    // Get user
    const result = await db.executeSql(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = result.rows.item(0);
    
    // Verify old password
    const isValid = await this.verifyPassword(oldPassword, user.password_hash);
    
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);
    
    // Update password
    await db.executeSql(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [newPasswordHash, new Date().toISOString(), userId]
    );
    
    // Log activity
    await this.logActivity(userId, 'PASSWORD_CHANGE', 'Password changed');
    
    return {
      success: true,
      message: 'Password changed successfully'
    };
  }

  /**
   * Reset password (admin only)
   */
  async resetPassword(userId, newPassword) {
    const db = await getDatabase();
    
    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);
    
    // Update password
    await db.executeSql(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [passwordHash, new Date().toISOString(), userId]
    );
    
    // Log activity
    await this.logActivity(userId, 'PASSWORD_RESET', 'Password reset by admin');
    
    return {
      success: true,
      message: 'Password reset successfully'
    };
  }

  /**
   * Log user activity
   */
  async logActivity(userId, activityType, description) {
    const db = await getDatabase();
    
    await db.executeSql(
      `INSERT INTO user_activity (
        user_id, activity_type, description, created_at
      ) VALUES (?, ?, ?, ?)`,
      [userId, activityType, description, new Date().toISOString()]
    );
  }

  /**
   * Get user activity log
   */
  async getUserActivity(userId, limit = 50) {
    const db = await getDatabase();
    
    const result = await db.executeSql(
      `SELECT * FROM user_activity 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );
    
    const activities = [];
    for (let i = 0; i < result.rows.length; i++) {
      activities.push(result.rows.item(i));
    }
    
    return activities;
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedAttempts(userId) {
    const db = await getDatabase();
    
    await db.executeSql(
      `UPDATE users 
       SET failed_attempts = failed_attempts + 1,
           last_failed_attempt = ?
       WHERE id = ?`,
      [new Date().toISOString(), userId]
    );
    
    // Check if should lock account
    const result = await db.executeSql(
      'SELECT failed_attempts FROM users WHERE id = ?',
      [userId]
    );
    
    if (result.rows.length > 0) {
      const attempts = result.rows.item(0).failed_attempts;
      
      if (attempts >= 5) {
        await db.executeSql(
          'UPDATE users SET status = ? WHERE id = ?',
          [USER_STATUS.LOCKED, userId]
        );
        
        await this.logActivity(userId, 'ACCOUNT_LOCKED', 'Account locked due to failed login attempts');
      }
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedAttempts(userId) {
    const db = await getDatabase();
    
    await db.executeSql(
      'UPDATE users SET failed_attempts = 0 WHERE id = ?',
      [userId]
    );
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  /**
   * Generate user ID
   */
  generateUserId() {
    return `USER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current session
   */
  getCurrentSession() {
    return this.currentSession;
  }
}

/**
 * Create user management tables
 */
export const createUserManagementTables = async (db) => {
  // Users table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      full_name TEXT,
      phone TEXT,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      failed_attempts INTEGER DEFAULT 0,
      last_failed_attempt DATETIME,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    );
  `);
  
  // Sessions table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      ended_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  
  // User activity table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  
  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity(user_id);');
};

// Create singleton instance
const userManagementService = new UserManagementService();

export default userManagementService;
export { UserManagementService };
