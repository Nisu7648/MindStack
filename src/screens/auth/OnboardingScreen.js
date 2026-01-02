/**
 * ONBOARDING SCREEN
 * 
 * First-time user experience with:
 * - App introduction
 * - Feature highlights
 * - Swipeable slides
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Welcome to MindStack',
    description: 'The world\'s first autonomous accounting system that runs in the background',
    icon: 'rocket-launch',
    color: '#4CAF50'
  },
  {
    id: '2',
    title: 'Auto-Capture Everything',
    description: '90% automated transaction entry from POS, invoices, bank, text, and bills',
    icon: 'auto-fix',
    color: '#2196F3'
  },
  {
    id: '3',
    title: 'Global Tax Compliance',
    description: 'Auto-calculates taxes for 78 jurisdictions: India, USA, and Europe',
    icon: 'earth',
    color: '#FF9800'
  },
  {
    id: '4',
    title: 'Self-Healing System',
    description: 'Automatically fixes errors, learns patterns, and only escalates what matters',
    icon: 'auto-fix',
    color: '#9C27B0'
  },
  {
    id: '5',
    title: 'Plain Language View',
    description: 'No accounting jargon. Just simple money language you understand',
    icon: 'lightbulb-on',
    color: '#F44336'
  }
];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  /**
   * Handle next button
   */
  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true
      });
    } else {
      handleGetStarted();
    }
  };

  /**
   * Handle skip button
   */
  const handleSkip = () => {
    handleGetStarted();
  };

  /**
   * Complete onboarding
   */
  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  /**
   * Handle scroll
   */
  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  /**
   * Render slide item
   */
  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Icon name={item.icon} size={80} color={item.color} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  /**
   * Render pagination dots
   */
  const renderPagination = () => (
    <View style={styles.pagination}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex && styles.activeDot
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
      />

      {renderPagination()}

      <View style={styles.footer}>
        {currentIndex < slides.length - 1 ? (
          <>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextText}>Next</Text>
              <Icon name="arrow-right" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  slide: {
    width,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16
  },
  description: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 24
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4
  },
  activeDot: {
    width: 24,
    backgroundColor: '#4CAF50'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40
  },
  skipText: {
    fontSize: 16,
    color: '#757575'
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24
  },
  nextText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 8
  },
  getStartedButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center'
  },
  getStartedText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600'
  }
});

export default OnboardingScreen;
