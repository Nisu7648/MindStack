import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    flag: '🇬🇧',
    translations: {
      selectLanguage: 'Select Language',
      welcome: 'Welcome to MindStack',
      description: 'Premium Accounting Automation',
      continue: 'Continue',
    }
  },
  de: {
    code: 'de',
    name: 'Deutsch',
    flag: '🇩🇪',
    translations: {
      selectLanguage: 'Sprache wählen',
      welcome: 'Willkommen bei MindStack',
      description: 'Premium Buchhaltungsautomatisierung',
      continue: 'Weiter',
    }
  },
  fr: {
    code: 'fr',
    name: 'Français',
    flag: '🇫🇷',
    translations: {
      selectLanguage: 'Sélectionner la langue',
      welcome: 'Bienvenue sur MindStack',
      description: 'Automatisation comptable premium',
      continue: 'Continuer',
    }
  },
  it: {
    code: 'it',
    name: 'Italiano',
    flag: '🇮🇹',
    translations: {
      selectLanguage: 'Seleziona lingua',
      welcome: 'Benvenuto su MindStack',
      description: 'Automazione contabile premium',
      continue: 'Continua',
    }
  },
};

const LanguageSelector = ({ visible, onSelect }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {LANGUAGES.en.translations.selectLanguage}
          </Text>
          
          <ScrollView style={styles.languageList}>
            {Object.values(LANGUAGES).map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={styles.languageItem}
                onPress={() => onSelect(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={styles.languageName}>{lang.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const LanguageSelectorScreen = ({ navigation }) => {
  const [showSelector, setShowSelector] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    checkSavedLanguage();
  }, []);

  const checkSavedLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('app_language');
      if (savedLang) {
        setSelectedLanguage(savedLang);
        setShowSelector(false);
        // Navigate to next screen
        navigation.replace('SignIn');
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const handleLanguageSelect = async (langCode) => {
    try {
      await AsyncStorage.setItem('app_language', langCode);
      setSelectedLanguage(langCode);
      setShowSelector(false);
      
      // Navigate to next screen
      setTimeout(() => {
        navigation.replace('SignIn');
      }, 500);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const lang = LANGUAGES[selectedLanguage];

  return (
    <View style={styles.container}>
      <LanguageSelector
        visible={showSelector}
        onSelect={handleLanguageSelect}
      />
      
      {!showSelector && (
        <View style={styles.content}>
          <Text style={styles.flag}>{lang.flag}</Text>
          <Text style={styles.welcome}>{lang.translations.welcome}</Text>
          <Text style={styles.description}>{lang.translations.description}</Text>
          
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.replace('SignIn')}
          >
            <Text style={styles.continueText}>{lang.translations.continue}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 24,
    textAlign: 'center',
  },
  languageList: {
    maxHeight: 400,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 12,
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  flag: {
    fontSize: 80,
    marginBottom: 24,
  },
  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#DC143C',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 8,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default LanguageSelectorScreen;
