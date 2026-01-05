import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

// IMPORTANT: Change this to a unique secret key for your app
const ENCRYPTION_KEY = 'MindStack-Swiss-Accounting-2024-Secret-Key-Change-This';
const API_KEY_STORAGE = 'user_translation_api_key';
const API_REGION_STORAGE = 'user_translation_api_region';

/**
 * UserAPIKeyManager - Manages user-provided Microsoft Translator API keys
 * 
 * This allows users to provide their own API keys so YOU don't pay for translation.
 * Keys are encrypted before storage for security.
 * 
 * Flow:
 * 1. User gets FREE API key from Microsoft Azure
 * 2. User pastes key in app
 * 3. We encrypt and store it securely
 * 4. We use their key for translations
 * 5. They pay Microsoft directly (FREE tier: 2M chars/month)
 */
class UserAPIKeyManager {
  /**
   * Encrypt API key before storing
   * Uses AES encryption for security
   */
  static encrypt(text) {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  }

  /**
   * Decrypt API key when retrieving
   */
  static decrypt(ciphertext) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Save user's API key (encrypted)
   * @param {string} apiKey - Microsoft Translator API key
   * @param {string} region - Azure region (e.g., 'eastus', 'westeurope')
   * @returns {Promise<boolean>} - Success status
   */
  static async saveAPIKey(apiKey, region = 'eastus') {
    try {
      const encrypted = this.encrypt(apiKey);
      await AsyncStorage.setItem(API_KEY_STORAGE, encrypted);
      await AsyncStorage.setItem(API_REGION_STORAGE, region);
      console.log('✅ API key saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Error saving API key:', error);
      return false;
    }
  }

  /**
   * Get user's API key (decrypted)
   * @returns {Promise<string|null>} - Decrypted API key or null
   */
  static async getAPIKey() {
    try {
      const encrypted = await AsyncStorage.getItem(API_KEY_STORAGE);
      if (!encrypted) return null;
      return this.decrypt(encrypted);
    } catch (error) {
      console.error('❌ Error getting API key:', error);
      return null;
    }
  }

  /**
   * Get user's API region
   * @returns {Promise<string>} - Azure region
   */
  static async getAPIRegion() {
    try {
      const region = await AsyncStorage.getItem(API_REGION_STORAGE);
      return region || 'eastus';
    } catch (error) {
      console.error('❌ Error getting API region:', error);
      return 'eastus';
    }
  }

  /**
   * Check if user has configured API key
   * @returns {Promise<boolean>}
   */
  static async hasAPIKey() {
    const key = await this.getAPIKey();
    return key !== null && key !== '';
  }

  /**
   * Remove API key (user wants to disable translation)
   * @returns {Promise<boolean>}
   */
  static async removeAPIKey() {
    try {
      await AsyncStorage.removeItem(API_KEY_STORAGE);
      await AsyncStorage.removeItem(API_REGION_STORAGE);
      console.log('✅ API key removed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error removing API key:', error);
      return false;
    }
  }

  /**
   * Validate API key by making a test translation
   * This ensures the key works before saving it
   * @param {string} apiKey - API key to validate
   * @param {string} region - Azure region
   * @returns {Promise<{valid: boolean, message: string}>}
   */
  static async validateAPIKey(apiKey, region) {
    try {
      const response = await fetch(
        `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=de`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Ocp-Apim-Subscription-Region': region,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{ text: 'test' }]),
        }
      );

      if (response.ok) {
        return { valid: true, message: 'API key is valid! ✅' };
      } else {
        const error = await response.json();
        return { 
          valid: false, 
          message: error.error?.message || 'Invalid API key ❌' 
        };
      }
    } catch (error) {
      return { 
        valid: false, 
        message: 'Network error. Please check your connection. 🌐' 
      };
    }
  }

  /**
   * Get masked API key for display (shows only last 4 characters)
   * @returns {Promise<string|null>}
   */
  static async getMaskedAPIKey() {
    const key = await this.getAPIKey();
    if (!key) return null;
    
    const length = key.length;
    if (length <= 4) return '****';
    
    return '•'.repeat(length - 4) + key.slice(-4);
  }
}

export default UserAPIKeyManager;