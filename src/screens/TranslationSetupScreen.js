import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import UserAPIKeyManager from '../services/UserAPIKeyManager';
import ConversationTranslator from '../services/ConversationTranslator';
import TranslationService from '../services/TranslationService';

/**
 * TranslationSetupScreen - Configure Microsoft Translator API for live translation
 * 
 * This screen helps users set up their own Microsoft Translator API key.
 * 
 * Why user-provided keys?
 * - You (app owner) pay ZERO for translation
 * - Users get FREE tier (2M chars/month = ~20,000 messages)
 * - Users only pay if they exceed free tier
 * - Professional, enterprise-grade translation
 * 
 * User flow:
 * 1. User selects non-English language
 * 2. App shows this setup screen
 * 3. User clicks "Get API Key" → Opens Azure signup
 * 4. User creates FREE Azure account (5 minutes)
 * 5. User copies API key and region
 * 6. User pastes in app
 * 7. App validates and saves (encrypted)
 * 8. Live translation works!
 */
const TranslationSetupScreen = ({ navigation }) => {
  const [apiKey, setApiKey] = useState('');
  const [region, setRegion] = useState('eastus');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [userLanguage, setUserLanguage] = useState('en');
  const [usageStats, setUsageStats] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    checkExistingKey();
    loadUsageStats();
    setUserLanguage(TranslationService.getLanguage());
  }, []);

  const checkExistingKey = async () => {
    const hasKey = await UserAPIKeyManager.hasAPIKey();
    setHasExistingKey(hasKey);
    
    if (hasKey) {
      const maskedKey = await UserAPIKeyManager.getMaskedAPIKey();
      const existingRegion = await UserAPIKeyManager.getAPIRegion();
      setApiKey(maskedKey);
      setRegion(existingRegion);
    }
  };

  const loadUsageStats = async () => {
    const stats = await ConversationTranslator.getUsageStats();
    setUsageStats(stats);
  };

  const openAzureSignup = () => {
    Linking.openURL('https://azure.microsoft.com/free/cognitive-services/');
  };

  const openAzurePortal = () => {
    Linking.openURL('https://portal.azure.com/#create/Microsoft.CognitiveServicesTextTranslation');
  };

  const openDocumentation = () => {
    Linking.openURL('https://learn.microsoft.com/en-us/azure/cognitive-services/translator/');
  };

  const handleSaveAPIKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your API key');
      return;
    }

    // If showing masked key, user needs to enter new key
    if (hasExistingKey && apiKey.includes('•')) {
      Alert.alert(
        'Update API Key',
        'To update your API key, please enter the new key (not the masked version).',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsValidating(true);

    // Validate API key
    const validation = await UserAPIKeyManager.validateAPIKey(apiKey, region);
    
    setIsValidating(false);

    if (validation.valid) {
      // Save API key
      const saved = await UserAPIKeyManager.saveAPIKey(apiKey, region);
      
      if (saved) {
        Alert.alert(
          'Success! ✅',
          'Your API key has been saved securely. Live translation is now enabled!',
          [
            {
              text: 'OK',
              onPress: () => {
                checkExistingKey();
                loadUsageStats();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save API key. Please try again.');
      }
    } else {
      Alert.alert('Invalid API Key', validation.message);
    }
  };

  const handleRemoveAPIKey = () => {
    Alert.alert(
      'Remove API Key?',
      'This will disable live translation. You can add it again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await UserAPIKeyManager.removeAPIKey();
            setApiKey('');
            setHasExistingKey(false);
            Alert.alert('Removed', 'API key has been removed.');
          },
        },
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Translation Cache?',
      'This will remove all cached translations. Useful if you see incorrect translations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            const count = await ConversationTranslator.clearCache();
            Alert.alert('Cache Cleared', `Removed ${count} cached translations.`);
          },
        },
      ]
    );
  };

  const regions = [
    { code: 'eastus', name: 'East US', flag: '🇺🇸' },
    { code: 'westus', name: 'West US', flag: '🇺🇸' },
    { code: 'westeurope', name: 'West Europe', flag: '🇪🇺' },
    { code: 'northeurope', name: 'North Europe', flag: '🇪🇺' },
    { code: 'southeastasia', name: 'Southeast Asia', flag: '🌏' },
    { code: 'eastasia', name: 'East Asia', flag: '🌏' },
    { code: 'australiaeast', name: 'Australia East', flag: '🇦🇺' },
    { code: 'brazilsouth', name: 'Brazil South', flag: '🇧🇷' },
    { code: 'canadacentral', name: 'Canada Central', flag: '🇨🇦' },
    { code: 'centralindia', name: 'Central India', flag: '🇮🇳' },
    { code: 'japaneast', name: 'Japan East', flag: '🇯🇵' },
    { code: 'koreacentral', name: 'Korea Central', flag: '🇰🇷' },
    { code: 'uksouth', name: 'UK South', flag: '🇬🇧' },
  ];

  // If user is using English, no translation needed
  if (userLanguage === 'en') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>🌍 Translation Not Needed</Text>
          <Text style={styles.description}>
            You're using English, so live conversation translation is not required.
            All features work without any additional setup!
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const languageMetadata = TranslationService.getLanguageMetadata(userLanguage);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.title}>🌍 Live Translation Setup</Text>
        <Text style={styles.subtitle}>
          Enable conversation translation for{' '}
          {languageMetadata?.flag} {languageMetadata?.nativeName}
        </Text>

        {/* Status Card */}
        <View style={[
          styles.statusCard,
          hasExistingKey ? styles.statusActive : styles.statusInactive
        ]}>
          <Text style={styles.statusIcon}>
            {hasExistingKey ? '✅' : '❌'}
          </Text>
          <Text style={styles.statusText}>
            {hasExistingKey ? 'Translation Active' : 'Not Configured'}
          </Text>
        </View>

        {/* Usage Stats (if key exists) */}
        {hasExistingKey && usageStats && (
          <View style={styles.usageCard}>
            <Text style={styles.usageTitle}>📊 This Month's Usage</Text>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Characters:</Text>
              <Text style={styles.usageValue}>
                {usageStats.chars.toLocaleString()} / 2,000,000
              </Text>
            </View>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Requests:</Text>
              <Text style={styles.usageValue}>{usageStats.requests}</Text>
            </View>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Free Remaining:</Text>
              <Text style={styles.usageValue}>
                {usageStats.freeRemaining.toLocaleString()} chars
              </Text>
            </View>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Estimated Cost:</Text>
              <Text style={[styles.usageValue, styles.costValue]}>
                ${usageStats.cost}
              </Text>
            </View>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 Setup Instructions</Text>
          
          <Text style={styles.step}>
            <Text style={styles.stepNumber}>1.</Text> Create FREE Microsoft Azure account
          </Text>
          <TouchableOpacity style={styles.linkButton} onPress={openAzureSignup}>
            <Text style={styles.linkButtonText}>
              🔗 Sign Up for Azure (FREE)
            </Text>
          </TouchableOpacity>

          <Text style={styles.step}>
            <Text style={styles.stepNumber}>2.</Text> Create Translator resource
          </Text>
          <TouchableOpacity style={styles.linkButton} onPress={openAzurePortal}>
            <Text style={styles.linkButtonText}>
              🔗 Create Translator Resource
            </Text>
          </TouchableOpacity>

          <Text style={styles.step}>
            <Text style={styles.stepNumber}>3.</Text> Copy your API key and region from Azure portal
          </Text>
          
          <Text style={styles.step}>
            <Text style={styles.stepNumber}>4.</Text> Paste below and save
          </Text>

          <TouchableOpacity 
            style={styles.docButton} 
            onPress={openDocumentation}
          >
            <Text style={styles.docButtonText}>
              📖 View Detailed Documentation
            </Text>
          </TouchableOpacity>

          <View style={styles.costInfo}>
            <Text style={styles.costTitle}>💰 Pricing:</Text>
            <Text style={styles.costText}>
              • First 2M characters/month: <Text style={styles.costFree}>FREE</Text>{'\n'}
              • After that: $10 per 1M characters{'\n'}
              • Average message: 100 chars{'\n'}
              • FREE tier = ~20,000 messages/month{'\n'}
              • You pay Microsoft directly (not us!)
            </Text>
          </View>
        </View>

        {/* API Key Input */}
        <View style={styles.inputCard}>
          <Text style={styles.label}>API Key:</Text>
          <TextInput
            style={styles.input}
            placeholder="Paste your Microsoft Translator API key here"
            placeholderTextColor="#999"
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={hasExistingKey && apiKey.includes('•')}
            multiline={false}
          />
          {hasExistingKey && apiKey.includes('•') && (
            <Text style={styles.hint}>
              💡 To update, clear this field and enter your new API key
            </Text>
          )}

          <Text style={styles.label}>Region:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.regionScroll}
          >
            {regions.map((r) => (
              <TouchableOpacity
                key={r.code}
                style={[
                  styles.regionButton,
                  region === r.code && styles.regionButtonActive
                ]}
                onPress={() => setRegion(r.code)}
              >
                <Text style={styles.regionFlag}>{r.flag}</Text>
                <Text style={[
                  styles.regionButtonText,
                  region === r.code && styles.regionButtonTextActive
                ]}>
                  {r.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.hint}>
            💡 Choose the region closest to you for best performance
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.primaryButton, isValidating && styles.primaryButtonDisabled]}
          onPress={handleSaveAPIKey}
          disabled={isValidating}
        >
          {isValidating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {hasExistingKey ? '🔄 Update API Key' : '💾 Save API Key'}
            </Text>
          )}
        </TouchableOpacity>

        {hasExistingKey && (
          <>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleRemoveAPIKey}
            >
              <Text style={styles.dangerButtonText}>🗑️ Remove API Key</Text>
            </TouchableOpacity>

            {/* Advanced Options */}
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={styles.advancedToggleText}>
                {showAdvanced ? '▼' : '▶'} Advanced Options
              </Text>
            </TouchableOpacity>

            {showAdvanced && (
              <View style={styles.advancedCard}>
                <TouchableOpacity
                  style={styles.advancedButton}
                  onPress={handleClearCache}
                >
                  <Text style={styles.advancedButtonText}>
                    🗑️ Clear Translation Cache
                  </Text>
                </TouchableOpacity>
                <Text style={styles.advancedHint}>
                  Clears cached translations. Use if you see incorrect translations.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Your API key is encrypted using AES-256 and stored securely on your device.
            It's only used for translating your conversations and is never shared with anyone.
          </Text>
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>❓ Need Help?</Text>
          <Text style={styles.helpText}>
            • Can't find your API key? Check Azure Portal → Translator resource → Keys and Endpoint{'\n'}
            • Translation not working? Verify your API key and region are correct{'\n'}
            • Seeing errors? Make sure you have internet connection{'\n'}
            • Still stuck? Contact support at support@mindstack.ch
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statusActive: {
    backgroundColor: '#d4edda',
  },
  statusInactive: {
    backgroundColor: '#f8d7da',
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  usageCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 15,
    color: '#666',
  },
  usageValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  costValue: {
    color: '#28a745',
  },
  instructionsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  step: {
    fontSize: 15,
    color: '#555',
    marginBottom: 12,
    lineHeight: 22,
  },
  stepNumber: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  linkButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  docButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  docButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  costInfo: {
    backgroundColor: '#e7f3ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  costTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  costText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  costFree: {
    fontWeight: 'bold',
    color: '#28a745',
  },
  inputCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    padding: 14,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  regionScroll: {
    marginBottom: 8,
  },
  regionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  regionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  regionFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  regionButtonText: {
    fontSize: 13,
    color: '#666',
  },
  regionButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  advancedToggle: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  advancedToggleText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  advancedCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  advancedButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  advancedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  advancedHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  securityNote: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
  },
  helpCard: {
    backgroundColor: '#e7f3ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  helpText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
});

export default TranslationSetupScreen;