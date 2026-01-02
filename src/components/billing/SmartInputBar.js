/**
 * SMART INPUT BAR COMPONENT
 * Core UX - Fixed bottom bar for voice/text input
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Keyboard
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Voice from '@react-native-voice/voice';

const SmartInputBar = ({ onCommand, placeholder = "Type or speak item / amount / action" }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Voice recognition setup
  React.useEffect(() => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechStart = () => {
    setIsListening(true);
    startPulseAnimation();
  };

  const onSpeechEnd = () => {
    setIsListening(false);
    stopPulseAnimation();
  };

  const onSpeechResults = (event) => {
    const text = event.value[0];
    setInputText(text);
    processCommand(text);
  };

  const onSpeechError = (error) => {
    console.error('Speech error:', error);
    setIsListening(false);
    stopPulseAnimation();
  };

  const startVoiceRecognition = async () => {
    try {
      await Voice.start('en-IN');
    } catch (error) {
      console.error('Voice start error:', error);
    }
  };

  const stopVoiceRecognition = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error('Voice stop error:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const processCommand = async (text) => {
    if (!text.trim()) return;

    // Show AI confirmation
    showAIResponse(`Processing: "${text}"`);

    // Parse command
    const command = parseCommand(text);
    
    // Show confirmation
    if (command.type === 'ADD_ITEM') {
      showAIResponse(`✓ Added ${command.quantity} ${command.item}`);
    } else if (command.type === 'PAYMENT') {
      showAIResponse(`✓ Payment mode: ${command.mode}`);
    } else if (command.type === 'REMOVE_ITEM') {
      showAIResponse(`✓ Removed ${command.item}`);
    } else if (command.type === 'GST_BILL') {
      showAIResponse(`✓ Switched to GST invoice`);
    }

    // Execute command
    if (onCommand) {
      onCommand(command);
    }

    // Clear input after 2 seconds
    setTimeout(() => {
      setInputText('');
      setAiResponse('');
    }, 2000);
  };

  const parseCommand = (text) => {
    const lowerText = text.toLowerCase().trim();

    // Add item patterns
    const addPatterns = [
      /(\d+)\s+(.+)/,  // "2 bread"
      /(.+)\s+(\d+)/,  // "bread 2"
      /(.+)\s+(\d+\.?\d*)\s*(kg|litre|liter|l|ml|gram|g)/i  // "milk 1 litre"
    ];

    for (const pattern of addPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        return {
          type: 'ADD_ITEM',
          quantity: parseFloat(match[1]) || 1,
          item: match[2] || match[1],
          unit: match[3] || 'pcs'
        };
      }
    }

    // Payment patterns
    if (lowerText.includes('cash') || lowerText.includes('payment')) {
      return {
        type: 'PAYMENT',
        mode: lowerText.includes('upi') ? 'UPI' : 
              lowerText.includes('bank') ? 'BANK' : 
              lowerText.includes('credit') ? 'CREDIT' : 'CASH'
      };
    }

    // Remove item
    if (lowerText.includes('remove') || lowerText.includes('delete')) {
      const item = lowerText.replace(/remove|delete/g, '').trim();
      return {
        type: 'REMOVE_ITEM',
        item
      };
    }

    // GST bill
    if (lowerText.includes('gst') || lowerText.includes('tax')) {
      return {
        type: 'GST_BILL'
      };
    }

    // Default: search item
    return {
      type: 'SEARCH_ITEM',
      query: text
    };
  };

  const showAIResponse = (message) => {
    setAiResponse(message);
    
    // Slide up animation
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.delay(2000),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setAiResponse('');
    });
  };

  const handleSubmit = () => {
    if (inputText.trim()) {
      processCommand(inputText);
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.container}>
      {/* AI Response Popup */}
      {aiResponse ? (
        <Animated.View
          style={[
            styles.aiResponseContainer,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0]
                })
              }],
              opacity: slideAnim
            }
          ]}
        >
          <Text style={styles.aiResponseText}>{aiResponse}</Text>
        </Animated.View>
      ) : null}

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        {/* Mic Button */}
        <TouchableOpacity
          style={styles.micButton}
          onPress={isListening ? stopVoiceRecognition : startVoiceRecognition}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Icon
              name={isListening ? 'microphone' : 'microphone-outline'}
              size={28}
              color={isListening ? '#F44336' : '#666666'}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
        />

        {/* Camera Button */}
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => {
            // Navigate to barcode scanner
            if (onCommand) {
              onCommand({ type: 'OPEN_SCANNER' });
            }
          }}
        >
          <Icon name="camera-outline" size={28} color="#666666" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent'
  },
  aiResponseContainer: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  aiResponseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  micButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#000000'
  },
  cameraButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  }
});

export default SmartInputBar;
