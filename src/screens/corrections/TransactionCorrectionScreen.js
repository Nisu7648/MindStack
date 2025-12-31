import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { CorrectionService } from '../../services/CorrectionService';

const TransactionCorrectionScreen = ({ route, navigation }) => {
  const { transaction } = route.params;
  const [correctionRequest, setCorrectionRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState(null);

  const handleCorrection = async () => {
    if (!correctionRequest.trim()) {
      Alert.alert('Error', 'Please describe what needs to be corrected');
      return;
    }

    setLoading(true);
    try {
      const result = await CorrectionService.handleCorrection(
        transaction,
        correctionRequest
      );

      if (result.success) {
        Alert.alert(
          'Success',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (result.action === 'CLARIFY') {
        setClarificationQuestion(result.clarificationQuestion);
      } else {
        Alert.alert('Error', result.error || 'Correction failed');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClarificationAnswer = async (answer) => {
    const fullRequest = `${correctionRequest} ${answer}`;
    setCorrectionRequest(fullRequest);
    setClarificationQuestion(null);
    
    // Retry correction with clarification
    setLoading(true);
    try {
      const result = await CorrectionService.handleCorrection(
        transaction,
        fullRequest
      );

      if (result.success) {
        Alert.alert(
          'Success',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Correction failed');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Correct Transaction</Text>
        <Text style={styles.subtitle}>
          Describe what needs to be fixed. Your original entry will be preserved.
        </Text>
      </View>

      {/* Original Transaction */}
      <View style={styles.originalCard}>
        <Text style={styles.cardTitle}>Original Entry</Text>
        <View style={styles.transactionDetails}>
          <Text style={styles.detailLabel}>Description:</Text>
          <Text style={styles.detailValue}>{transaction.description}</Text>
        </View>
        {transaction.amount && (
          <View style={styles.transactionDetails}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.detailValue}>
              ₹{transaction.amount.toLocaleString('en-IN')}
            </Text>
          </View>
        )}
        {transaction.party && (
          <View style={styles.transactionDetails}>
            <Text style={styles.detailLabel}>Party:</Text>
            <Text style={styles.detailValue}>{transaction.party}</Text>
          </View>
        )}
        {transaction.paymentMode && (
          <View style={styles.transactionDetails}>
            <Text style={styles.detailLabel}>Payment Mode:</Text>
            <Text style={styles.detailValue}>
              {transaction.paymentMode === 'cash' ? 'Cash' : 'Bank'}
            </Text>
          </View>
        )}
      </View>

      {/* Clarification Question */}
      {clarificationQuestion && (
        <View style={styles.clarificationCard}>
          <Text style={styles.clarificationIcon}>⚠</Text>
          <Text style={styles.clarificationTitle}>I need one detail</Text>
          <Text style={styles.clarificationQuestion}>{clarificationQuestion}</Text>
          
          <View style={styles.clarificationButtons}>
            <TouchableOpacity
              style={styles.clarificationButton}
              onPress={() => handleClarificationAnswer('cash')}
            >
              <Text style={styles.clarificationButtonText}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clarificationButton}
              onPress={() => handleClarificationAnswer('bank')}
            >
              <Text style={styles.clarificationButtonText}>Bank</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Correction Input */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>What needs to be corrected?</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., 'Amount should be 5000' or 'Cancel this entry' or 'Wrong party name'"
          placeholderTextColor="#999"
          value={correctionRequest}
          onChangeText={setCorrectionRequest}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.helperText}>
          Examples: "Amount is wrong, should be ₹5000" • "Cancel this entry" • 
          "Payment was in bank, not cash" • "Party name is wrong"
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setCorrectionRequest('Cancel this entry')}
        >
          <Text style={styles.quickActionIcon}>❌</Text>
          <Text style={styles.quickActionText}>Cancel Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setCorrectionRequest('Change payment mode to bank')}
        >
          <Text style={styles.quickActionIcon}>🏦</Text>
          <Text style={styles.quickActionText}>Change to Bank</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setCorrectionRequest('Change payment mode to cash')}
        >
          <Text style={styles.quickActionIcon}>💰</Text>
          <Text style={styles.quickActionText}>Change to Cash</Text>
        </TouchableOpacity>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!correctionRequest.trim() || loading) && styles.submitButtonDisabled,
        ]}
        onPress={handleCorrection}
        disabled={!correctionRequest.trim() || loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Processing...' : 'Correct Entry'}
        </Text>
      </TouchableOpacity>

      {/* Safety Notice */}
      <View style={styles.safetyNotice}>
        <Text style={styles.safetyIcon}>🔒</Text>
        <Text style={styles.safetyText}>
          Your original entry will be preserved in the audit trail. 
          All corrections are fully traceable and maintain accounting integrity.
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  originalCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1A1A1A',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  transactionDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
  },
  clarificationCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  clarificationIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  clarificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  clarificationQuestion: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 16,
  },
  clarificationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clarificationButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  clarificationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  quickActions: {
    marginBottom: 24,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickActionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  submitButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  safetyNotice: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  safetyIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  safetyText: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
});

export default TransactionCorrectionScreen;
