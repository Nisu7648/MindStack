import axios from 'axios';
import UserAPIKeyManager from './UserAPIKeyManager';
import TranslationService from './TranslationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'translation_cache_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * ConversationTranslator - Real-time conversation translation using user's API key
 * 
 * This service translates user messages and bot responses in real-time.
 * It uses the user's own Microsoft Translator API key (they pay, not you!).
 * 
 * Features:
 * - Translates user messages to English (for bot to understand)
 * - Translates bot responses to user's language
 * - Caching to reduce API calls and costs
 * - Error handling with fallbacks
 * - Usage tracking
 * 
 * Flow:
 * User (German): "Ich möchte eine Rechnung erstellen"
 *   ↓ translateToEnglish()
 * Bot receives: "I want to create an invoice"
 *   ↓ Bot processes in English
 * Bot responds: "Invoice created successfully!"
 *   ↓ translateToUserLanguage()
 * User sees: "Rechnung erfolgreich erstellt!"
 */
class ConversationTranslator {
  static ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

  /**
   * Check if translation is available for current user
   * @returns {Promise<boolean>}
   */
  static async isAvailable() {
    const userLang = TranslationService.getLanguage();
    
    // English doesn't need translation
    if (userLang === 'en') return true;
    
    // Check if user has configured API key
    return await UserAPIKeyManager.hasAPIKey();
  }

  /**
   * Get cached translation if available and not expired
   * @param {string} text - Text to translate
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {Promise<string|null>}
   */
  static async getCachedTranslation(text, fromLang, toLang) {
    try {
      const cacheKey = `${CACHE_PREFIX}${fromLang}_${toLang}_${text}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const { translation, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_EXPIRY) {
          console.log('✅ Using cached translation');
          return translation;
        } else {
          // Expired, remove it
          await AsyncStorage.removeItem(cacheKey);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Cache translation for future use
   * @param {string} text - Original text
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @param {string} translation - Translated text
   */
  static async cacheTranslation(text, fromLang, toLang, translation) {
    try {
      const cacheKey = `${CACHE_PREFIX}${fromLang}_${toLang}_${text}`;
      const cacheData = {
        translation,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('✅ Translation cached');
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Translate text from one language to another
   * @param {string} text - Text to translate
   * @param {string} fromLang - Source language code (e.g., 'en', 'de', 'fr')
   * @param {string} toLang - Target language code
   * @returns {Promise<string>} - Translated text
   */
  static async translate(text, fromLang, toLang) {
    // Same language, no translation needed
    if (fromLang === toLang) return text;

    // Check cache first
    const cached = await this.getCachedTranslation(text, fromLang, toLang);
    if (cached) return cached;

    try {
      // Get user's API credentials
      const apiKey = await UserAPIKeyManager.getAPIKey();
      const region = await UserAPIKeyManager.getAPIRegion();

      if (!apiKey) {
        throw new Error('NO_API_KEY');
      }

      console.log(`🌍 Translating: ${fromLang} → ${toLang}`);

      const response = await axios.post(
        `${this.ENDPOINT}/translate?api-version=3.0&from=${fromLang}&to=${toLang}`,
        [{ text }],
        {
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Ocp-Apim-Subscription-Region': region,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      const translation = response.data[0].translations[0].text;
      
      // Cache the translation
      await this.cacheTranslation(text, fromLang, toLang, translation);
      
      // Track usage
      await this.trackUsage(text.length);

      console.log('✅ Translation successful');
      return translation;

    } catch (error) {
      console.error('❌ Translation error:', error);
      
      // Handle specific errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('API_KEY_INVALID');
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('TIMEOUT');
      }
      
      if (!error.response) {
        throw new Error('NETWORK_ERROR');
      }
      
      // Fallback to original text
      return text;
    }
  }

  /**
   * Translate user message to English (for bot to understand)
   * @param {string} text - User's message in their language
   * @param {string} userLang - User's language code
   * @returns {Promise<string>} - Message in English
   */
  static async translateToEnglish(text, userLang) {
    if (userLang === 'en') return text;
    
    const hasKey = await UserAPIKeyManager.hasAPIKey();
    if (!hasKey) {
      throw new Error('NO_API_KEY');
    }
    
    return await this.translate(text, userLang, 'en');
  }

  /**
   * Translate bot response to user's language
   * @param {string} text - Bot's response in English
   * @param {string} userLang - User's language code
   * @returns {Promise<string>} - Response in user's language
   */
  static async translateToUserLanguage(text, userLang) {
    if (userLang === 'en') return text;
    
    const hasKey = await UserAPIKeyManager.hasAPIKey();
    if (!hasKey) {
      throw new Error('NO_API_KEY');
    }
    
    return await this.translate(text, 'en', userLang);
  }

  /**
   * Detect language of text
   * @param {string} text - Text to analyze
   * @returns {Promise<string>} - Detected language code
   */
  static async detectLanguage(text) {
    try {
      const apiKey = await UserAPIKeyManager.getAPIKey();
      const region = await UserAPIKeyManager.getAPIRegion();

      if (!apiKey) {
        return 'en'; // Default to English
      }

      const response = await axios.post(
        `${this.ENDPOINT}/detect?api-version=3.0`,
        [{ text }],
        {
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Ocp-Apim-Subscription-Region': region,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data[0].language;
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en'; // Fallback to English
    }
  }

  /**
   * Track translation usage (character count)
   * @param {number} charCount - Number of characters translated
   */
  static async trackUsage(charCount) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const usageKey = `translation_usage_${currentMonth}`;
      
      const currentUsage = await AsyncStorage.getItem(usageKey);
      const usage = currentUsage ? JSON.parse(currentUsage) : { chars: 0, requests: 0 };
      
      usage.chars += charCount;
      usage.requests += 1;
      
      await AsyncStorage.setItem(usageKey, JSON.stringify(usage));
    } catch (error) {
      console.error('Usage tracking error:', error);
    }
  }

  /**
   * Get current month's usage statistics
   * @returns {Promise<{chars: number, requests: number, cost: number}>}
   */
  static async getUsageStats() {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usageKey = `translation_usage_${currentMonth}`;
      
      const currentUsage = await AsyncStorage.getItem(usageKey);
      const usage = currentUsage ? JSON.parse(currentUsage) : { chars: 0, requests: 0 };
      
      // Calculate cost (Microsoft pricing: $10 per 1M chars after 2M free)
      const freeChars = 2000000; // 2M free
      const paidChars = Math.max(0, usage.chars - freeChars);
      const cost = (paidChars / 1000000) * 10; // $10 per 1M
      
      return {
        chars: usage.chars,
        requests: usage.requests,
        cost: cost.toFixed(2),
        freeRemaining: Math.max(0, freeChars - usage.chars),
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return { chars: 0, requests: 0, cost: '0.00', freeRemaining: 2000000 };
    }
  }

  /**
   * Clear translation cache (useful for troubleshooting)
   */
  static async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`✅ Cleared ${cacheKeys.length} cached translations`);
      return cacheKeys.length;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Batch translate multiple texts (more efficient)
   * @param {string[]} texts - Array of texts to translate
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {Promise<string[]>} - Array of translated texts
   */
  static async batchTranslate(texts, fromLang, toLang) {
    if (fromLang === toLang) return texts;

    try {
      const apiKey = await UserAPIKeyManager.getAPIKey();
      const region = await UserAPIKeyManager.getAPIRegion();

      if (!apiKey) {
        throw new Error('NO_API_KEY');
      }

      const body = texts.map(text => ({ text }));

      const response = await axios.post(
        `${this.ENDPOINT}/translate?api-version=3.0&from=${fromLang}&to=${toLang}`,
        body,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Ocp-Apim-Subscription-Region': region,
            'Content-Type': 'application/json',
          },
        }
      );

      const translations = response.data.map(item => item.translations[0].text);
      
      // Track total usage
      const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
      await this.trackUsage(totalChars);

      return translations;
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts; // Fallback to original
    }
  }
}

export default ConversationTranslator;