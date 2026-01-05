# 🌍 Translation System Documentation

## Overview

MindStack uses a **hybrid translation system** that combines:
1. **Pre-defined UI translations** (31 languages) - FREE, instant, offline
2. **Live conversation translation** (user-provided API) - Real-time, any text

---

## 🎯 How It Works

### For UI Elements (Buttons, Labels, Menus)
- **Pre-translated** in 31 languages
- Stored in `TranslationService.js`
- Works offline
- Zero cost
- Instant

### For Conversations (Chat with Bot)
- **Real-time translation** using Microsoft Translator API
- User provides their own API key
- User pays Microsoft directly (FREE tier: 2M chars/month)
- You (app owner) pay ZERO

---

## 📦 Files Added

### 1. `src/services/UserAPIKeyManager.js`
Manages user-provided Microsoft Translator API keys with encryption.

**Features:**
- AES-256 encryption for security
- Secure storage using AsyncStorage
- API key validation before saving
- Masked display for privacy

**Usage:**
```javascript
import UserAPIKeyManager from './services/UserAPIKeyManager';

// Save API key
await UserAPIKeyManager.saveAPIKey('your-api-key', 'eastus');

// Check if key exists
const hasKey = await UserAPIKeyManager.hasAPIKey();

// Get API key (decrypted)
const apiKey = await UserAPIKeyManager.getAPIKey();

// Validate before saving
const validation = await UserAPIKeyManager.validateAPIKey(apiKey, region);
if (validation.valid) {
  // Save it
}
```

---

### 2. `src/services/ConversationTranslator.js`
Real-time translation service for conversations.

**Features:**
- Translates user messages to English (for bot)
- Translates bot responses to user's language
- Caching to reduce API calls
- Usage tracking
- Batch translation support
- Error handling with fallbacks

**Usage:**
```javascript
import ConversationTranslator from './services/ConversationTranslator';

// Translate user message to English
const englishMessage = await ConversationTranslator.translateToEnglish(
  'Ich möchte eine Rechnung erstellen',
  'de'
);
// Result: "I want to create an invoice"

// Translate bot response to user's language
const germanResponse = await ConversationTranslator.translateToUserLanguage(
  'Invoice created successfully!',
  'de'
);
// Result: "Rechnung erfolgreich erstellt!"

// Get usage stats
const stats = await ConversationTranslator.getUsageStats();
// { chars: 150000, requests: 500, cost: '0.00', freeRemaining: 1850000 }
```

---

### 3. `src/screens/TranslationSetupScreen.js`
Beautiful UI for users to configure their API key.

**Features:**
- Step-by-step instructions
- Direct links to Azure signup
- API key validation
- Region selection (13 regions)
- Usage statistics display
- Cache management
- Security notes
- Help section

**Navigation:**
```javascript
// Add to your navigation stack
<Stack.Screen 
  name="TranslationSetup" 
  component={TranslationSetupScreen}
  options={{ title: 'Translation Setup' }}
/>

// Navigate from settings
navigation.navigate('TranslationSetup');
```

---

## 🚀 Integration Guide

### Step 1: Install Dependencies

```bash
npm install axios crypto-js
# or
yarn add axios crypto-js
```

Already added to `package.json`!

---

### Step 2: Add to Navigation

In your `App.js` or navigation file:

```javascript
import TranslationSetupScreen from './src/screens/TranslationSetupScreen';

// Add to Stack Navigator
<Stack.Screen 
  name="TranslationSetup" 
  component={TranslationSetupScreen}
  options={{ 
    title: 'Translation Setup',
    headerShown: true 
  }}
/>
```

---

### Step 3: Add to Settings Screen

In `SettingsScreen.js`:

```javascript
import TranslationService from '../services/TranslationService';

// Add this option in your settings list
<TouchableOpacity
  style={styles.settingItem}
  onPress={() => navigation.navigate('TranslationSetup')}
>
  <Text style={styles.settingIcon}>🌍</Text>
  <View style={styles.settingContent}>
    <Text style={styles.settingTitle}>Live Translation</Text>
    <Text style={styles.settingDescription}>
      Configure conversation translation
    </Text>
  </View>
  <Text style={styles.settingArrow}>›</Text>
</TouchableOpacity>
```

---

### Step 4: Integrate with Chat

In your `ChatScreen.js` or wherever you handle bot conversations:

```javascript
import ConversationTranslator from '../services/ConversationTranslator';
import TranslationService from '../services/TranslationService';

const ChatScreen = () => {
  const [userLanguage, setUserLanguage] = useState('en');

  useEffect(() => {
    // Get user's selected language
    const lang = TranslationService.getLanguage();
    setUserLanguage(lang);
  }, []);

  const sendMessage = async (userMessage) => {
    try {
      // 1. Show user message in their language
      addMessage(userMessage, 'user');

      // 2. Translate to English (if not English)
      const englishMessage = await ConversationTranslator.translateToEnglish(
        userMessage,
        userLanguage
      );

      // 3. Send to bot (bot understands English)
      const botResponseEnglish = await sendToBhindiBot(englishMessage);

      // 4. Translate bot response to user's language
      const botResponseTranslated = await ConversationTranslator.translateToUserLanguage(
        botResponseEnglish,
        userLanguage
      );

      // 5. Show bot response in user's language
      addMessage(botResponseTranslated, 'bot');

    } catch (error) {
      if (error.message === 'NO_API_KEY') {
        // Show setup prompt
        Alert.alert(
          'Translation Not Configured',
          'To chat in your language, please configure translation.',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Setup Now', 
              onPress: () => navigation.navigate('TranslationSetup')
            }
          ]
        );
      } else if (error.message === 'API_KEY_INVALID') {
        Alert.alert(
          'Invalid API Key',
          'Your translation API key is invalid. Please update it.',
          [
            { text: 'OK', onPress: () => navigation.navigate('TranslationSetup') }
          ]
        );
      } else {
        // Network error or other - show original message
        addMessage(userMessage, 'user');
        addMessage('Sorry, translation failed. Please try again.', 'bot');
      }
    }
  };

  return (
    // Your chat UI
  );
};
```

---

## 💰 Pricing Model

### For Users:

**English Users:**
- ✅ Everything FREE
- ✅ No API key needed
- ✅ Full functionality

**Non-English Users:**
- ✅ UI in their language (FREE)
- ✅ Accounting features (FREE)
- ✅ Live translation requires API key:
  - First 2M characters/month: **FREE**
  - After that: $10 per 1M characters
  - ~20,000 messages = FREE tier
  - User pays Microsoft directly

### For You (App Owner):
- ✅ **ZERO translation costs**
- ✅ Users provide their own API keys
- ✅ Users pay Microsoft directly
- ✅ No liability for translation costs
- ✅ Scalable to unlimited users

---

## 🔒 Security

### API Key Storage:
- Encrypted using AES-256
- Stored in AsyncStorage (device-only)
- Never sent to your servers
- Only used for translation API calls
- Can be removed anytime

### Encryption Key:
**IMPORTANT:** Change the encryption key in `UserAPIKeyManager.js`:

```javascript
const ENCRYPTION_KEY = 'MindStack-Swiss-Accounting-2024-Secret-Key-Change-This';
```

Change to something unique for your app!

---

## 📊 Usage Tracking

The system automatically tracks:
- Characters translated
- Number of requests
- Estimated cost
- Free tier remaining

Users can view stats in TranslationSetupScreen.

---

## 🌍 Supported Languages

### Pre-defined UI (31 languages):
English, Hindi, German, French, Italian, Spanish, Portuguese, Russian, Chinese, Japanese, Arabic, Dutch, Turkish, Polish, Korean, Vietnamese, Thai, Indonesian, Malay, Bengali, Urdu, Swahili, Greek, Hebrew, Romanian, Ukrainian, Czech, Swedish, Norwegian, Danish, Finnish

### Live Translation (100+ languages):
Any language supported by Microsoft Translator API

---

## 🐛 Troubleshooting

### Translation not working?
1. Check if user has configured API key
2. Verify API key is valid
3. Check internet connection
4. Verify region is correct
5. Check Azure portal for API status

### Cache issues?
Users can clear cache in TranslationSetupScreen → Advanced Options

### API key invalid?
User needs to:
1. Go to Azure Portal
2. Check Translator resource
3. Verify key and region
4. Update in app

---

## 📚 Microsoft Translator Setup Guide

### For Users:

1. **Create Azure Account (FREE)**
   - Go to: https://azure.microsoft.com/free/
   - Sign up with email
   - No credit card required for free tier

2. **Create Translator Resource**
   - Go to: https://portal.azure.com
   - Click "Create a resource"
   - Search "Translator"
   - Click "Create"
   - Select FREE tier (F0)
   - Choose region closest to you

3. **Get API Key**
   - Go to your Translator resource
   - Click "Keys and Endpoint"
   - Copy "Key 1" or "Key 2"
   - Note the "Location/Region"

4. **Add to MindStack**
   - Open MindStack app
   - Go to Settings → Translation Setup
   - Paste API key
   - Select region
   - Click "Save"

Done! Live translation now works!

---

## 🎯 Best Practices

### For App Owner:
1. ✅ Clearly explain users need their own API key
2. ✅ Provide setup instructions in-app
3. ✅ Link directly to Azure signup
4. ✅ Show usage stats to users
5. ✅ Handle errors gracefully
6. ✅ Offer English as fallback

### For Users:
1. ✅ Use FREE tier (2M chars/month)
2. ✅ Monitor usage in app
3. ✅ Clear cache if seeing wrong translations
4. ✅ Choose region closest to you
5. ✅ Keep API key secure

---

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  TRANSLATION FLOW                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. User selects German                                 │
│     ↓                                                    │
│     UI instantly in German (pre-defined) ✅             │
│                                                          │
│  2. User tries to chat                                  │
│     ↓                                                    │
│     Check: Has API key?                                 │
│     ├─ Yes → Continue                                   │
│     └─ No → Show setup prompt                           │
│                                                          │
│  3. User types: "Ich möchte eine Rechnung erstellen"   │
│     ↓                                                    │
│     ConversationTranslator.translateToEnglish()         │
│     ↓                                                    │
│     Uses user's API key                                 │
│     ↓                                                    │
│     "I want to create an invoice" (English)             │
│     ↓                                                    │
│     Send to bot                                         │
│                                                          │
│  4. Bot processes in English                            │
│     ↓                                                    │
│     Bot: "Invoice created successfully!"                │
│     ↓                                                    │
│     ConversationTranslator.translateToUserLanguage()    │
│     ↓                                                    │
│     Uses user's API key                                 │
│     ↓                                                    │
│     "Rechnung erfolgreich erstellt!" (German)           │
│     ↓                                                    │
│     Show to user ✅                                      │
│                                                          │
│  5. Track usage                                         │
│     ↓                                                    │
│     Update character count                              │
│     ↓                                                    │
│     Show in stats                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

- [ ] User can select non-English language
- [ ] UI translates to selected language
- [ ] Translation setup screen appears
- [ ] Links to Azure work
- [ ] API key validation works
- [ ] Invalid key shows error
- [ ] Valid key saves successfully
- [ ] Chat translates user messages
- [ ] Chat translates bot responses
- [ ] Usage stats display correctly
- [ ] Cache can be cleared
- [ ] API key can be removed
- [ ] Error handling works
- [ ] Offline fallback works

---

## 🎉 Summary

You now have a **complete translation system** where:
- ✅ UI is pre-translated (31 languages)
- ✅ Live translation uses user's API key
- ✅ You pay ZERO for translation
- ✅ Users get FREE tier (2M chars/month)
- ✅ Professional, enterprise-grade quality
- ✅ Secure, encrypted storage
- ✅ Beautiful, user-friendly setup
- ✅ Complete error handling
- ✅ Usage tracking
- ✅ Scalable to unlimited users

**Your CHF 99/month plan now includes multi-language support with ZERO translation costs!** 🚀
