import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TranslationService, { LANGUAGE_METADATA } from '../services/TranslationService';

const { width, height } = Dimensions.get('window');

const LanguageSelectorScreen = ({ navigation }) => {
  const [showSelector, setShowSelector] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState(LANGUAGE_METADATA);

  useEffect(() => {
    checkSavedLanguage();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLanguages(LANGUAGE_METADATA);
    } else {
      const results = TranslationService.searchLanguages(searchQuery);
      setFilteredLanguages(results);
    }
  }, [searchQuery]);

  const checkSavedLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('app_language');
      if (savedLang) {
        setSelectedLanguage(savedLang);
        TranslationService.setLanguage(savedLang);
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
      TranslationService.setLanguage(langCode);
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

  const popularLanguages = LANGUAGE_METADATA.filter(lang => lang.popular);
  const allLanguages = filteredLanguages;

  return (
    <View style={styles.container}>
      <Modal
        visible={showSelector}
        transparent={false}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {TranslationService.t('languageSelector.title')}
            </Text>
            <Text style={styles.headerSubtitle}>
              {TranslationService.t('languageSelector.subtitle')}
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={TranslationService.t('languageSelector.searchLanguage')}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView 
            style={styles.languageList}
            showsVerticalScrollIndicator={false}
          >
            {/* Popular Languages */}
            {searchQuery.trim() === '' && (
              <>
                <Text style={styles.sectionTitle}>
                  {TranslationService.t('languageSelector.popular')}
                </Text>
                <View style={styles.popularGrid}>
                  {popularLanguages.map(lang => (
                    <TouchableOpacity
                      key={lang.code}
                      style={styles.popularLanguageCard}
                      onPress={() => handleLanguageSelect(lang.code)}
                    >
                      <Text style={styles.popularLanguageFlag}>{lang.flag}</Text>
                      <Text style={styles.popularLanguageName}>{lang.name}</Text>
                      <Text style={styles.popularLanguageNative}>{lang.nativeName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionTitle, styles.allLanguagesTitle]}>
                  {TranslationService.t('languageSelector.all')}
                </Text>
              </>
            )}

            {/* All Languages */}
            {allLanguages.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={styles.languageItem}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{lang.name}</Text>
                  <Text style={styles.languageNative}>{lang.nativeName}</Text>
                </View>
                {lang.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>★</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {allLanguages.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No languages found</Text>
                <Text style={styles.noResultsSubtext}>Try a different search term</Text>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {LANGUAGE_METADATA.length} languages available
            </Text>
          </View>
        </View>
      </Modal>
      
      {!showSelector && (
        <View style={styles.content}>
          <Text style={styles.flag}>
            {LANGUAGE_METADATA.find(l => l.code === selectedLanguage)?.flag}
          </Text>
          <Text style={styles.welcome}>
            {TranslationService.t('languageSelector.welcome')}
          </Text>
          <Text style={styles.description}>
            {TranslationService.t('languageSelector.description')}
          </Text>
          
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.replace('SignIn')}
          >
            <Text style={styles.continueText}>
              {TranslationService.t('common.continue')}
            </Text>
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#999',
  },
  languageList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 16,
    marginLeft: 4,
  },
  allLanguagesTitle: {
    marginTop: 24,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  popularLanguageCard: {
    width: (width - 48) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  popularLanguageFlag: {
    fontSize: 40,
    marginBottom: 8,
  },
  popularLanguageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  popularLanguageNative: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  languageNative: {
    fontSize: 14,
    color: '#666',
  },
  popularBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  bottomPadding: {
    height: 24,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
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
