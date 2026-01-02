/**
 * AUTO-RECONCILIATION SCREEN
 * 
 * Zero-click reconciliation interface
 * Shows auto-matched transactions and flags for review
 * Minimal human intervention required
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { BankIntelligenceEngine } from '../../services/autonomous/BankIntelligenceEngine';

const AutoReconciliationScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [reconciliationData, setReconciliationData] = useState({
    autoMatched: [],
    needsReview: [],
    statistics: {
      totalTransactions: 0,
      autoMatchedCount: 0,
      needsReviewCount: 0,
      matchRate: 0
    }
  });

  useEffect(() => {
    loadReconciliationData();
  }, []);

  const loadReconciliationData = async () => {
    setLoading(true);
    try {
      // Mock data - actual implementation would query database
      setReconciliationData({
        autoMatched: [
          {
            id: 1,
            bankDate: '2025-01-05',
            bankAmount: 50000,
            bookAmount: 50000,
            description: 'Payment from Customer A',
            matchType: 'EXACT',
            confidence: 1.0,
            status: 'MATCHED'
          },
          {
            id: 2,
            bankDate: '2025-01-06',
            bankAmount: 15000,
            bookAmount: 15000,
            description: 'Rent payment',
            matchType: 'EXACT',
            confidence: 1.0,
            status: 'MATCHED'
          },
          {
            id: 3,
            bankDate: '2025-01-07',
            bankAmount: 25050,
            bookAmount: 25000,
            description: 'Invoice #INV-001',
            matchType: 'FUZZY',
            confidence: 0.95,
            status: 'MATCHED',
            difference: 50
          }
        ],
        needsReview: [
          {
            id: 4,
            bankDate: '2025-01-08',
            bankAmount: 5000,
            description: 'Unknown transaction',
            reason: 'No matching transaction found',
            suggestions: [
              { type: 'EXPENSE', category: 'Utilities', confidence: 0.75 },
              { type: 'EXPENSE', category: 'Office Supplies', confidence: 0.60 }
            ]
          },
          {
            id: 5,
            bankDate: '2025-01-09',
            bankAmount: 12000,
            description: 'Payment to XYZ',
            reason: 'Multiple possible matches',
            possibleMatches: [
              { id: 101, description: 'Purchase from XYZ', amount: 12000, date: '2025-01-08' },
              { id: 102, description: 'Advance to XYZ', amount: 12000, date: '2025-01-07' }
            ]
          }
        ],
        statistics: {
          totalTransactions: 5,
          autoMatchedCount: 3,
          needsReviewCount: 2,
          matchRate: 60
        }
      });
    } catch (error) {
      console.error('Failed to load reconciliation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoReconcile = async () => {
    Alert.alert(
      'Auto-Reconcile',
      'This will automatically match all bank transactions with your books. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Auto-Reconcile',
          onPress: async () => {
            setLoading(true);
            try {
              // Simulate auto-reconciliation
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              Alert.alert(
                '✅ Reconciliation Complete!',
                `Matched: 3 transactions\nNeed Review: 2 transactions\nMatch Rate: 60%`,
                [{ text: 'OK', onPress: () => loadReconciliationData() }]
              );
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReviewTransaction = (transaction) => {
    navigation.navigate('ReviewTransaction', { transaction });
  };

  const handleAcceptSuggestion = async (transaction, suggestion) => {
    Alert.alert(
      'Accept Suggestion',
      `Classify as ${suggestion.category}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Accept',
          onPress: async () => {
            setLoading(true);
            try {
              // Create expense entry based on suggestion
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              Alert.alert('Success', 'Transaction classified and recorded!');
              loadReconciliationData();
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const getMatchTypeColor = (matchType) => {
    switch (matchType) {
      case 'EXACT': return '#4CAF50';
      case 'FUZZY': return '#FF9800';
      case 'REFERENCE': return '#2196F3';
      case 'PATTERN': return '#9C27B0';
      default: return '#666';
    }
  };

  const getMatchTypeLabel = (matchType) => {
    switch (matchType) {
      case 'EXACT': return '✓ Exact Match';
      case 'FUZZY': return '≈ Close Match';
      case 'REFERENCE': return '# Ref Match';
      case 'PATTERN': return '~ Pattern Match';
      default: return 'Unknown';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadReconciliationData} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔄 Auto-Reconciliation</Text>
        <Text style={styles.subtitle}>Zero-click bank matching</Text>
      </View>

      {/* Statistics Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{reconciliationData.statistics.totalTransactions}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {reconciliationData.statistics.autoMatchedCount}
            </Text>
            <Text style={styles.statLabel}>Auto-Matched</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>
              {reconciliationData.statistics.needsReviewCount}
            </Text>
            <Text style={styles.statLabel}>Need Review</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>
              {reconciliationData.statistics.matchRate}%
            </Text>
            <Text style={styles.statLabel}>Match Rate</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.autoReconcileButton}
          onPress={handleAutoReconcile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.autoReconcileButtonText}>
              ⚡ Run Auto-Reconciliation
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Auto-Matched Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            ✅ Auto-Matched ({reconciliationData.autoMatched.length})
          </Text>
          <Text style={styles.sectionSubtitle}>No action needed</Text>
        </View>

        {reconciliationData.autoMatched.map((transaction) => (
          <View key={transaction.id} style={styles.matchedCard}>
            <View style={styles.matchedHeader}>
              <View style={styles.matchedInfo}>
                <Text style={styles.matchedDate}>{transaction.bankDate}</Text>
                <Text style={styles.matchedDescription}>{transaction.description}</Text>
              </View>
              <View style={styles.matchedBadge}>
                <Text style={[styles.matchedBadgeText, { color: getMatchTypeColor(transaction.matchType) }]}>
                  {getMatchTypeLabel(transaction.matchType)}
                </Text>
              </View>
            </View>

            <View style={styles.matchedDetails}>
              <View style={styles.matchedAmounts}>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Bank</Text>
                  <Text style={styles.amountValue}>{formatCurrency(transaction.bankAmount)}</Text>
                </View>
                <Text style={styles.amountSeparator}>↔</Text>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Books</Text>
                  <Text style={styles.amountValue}>{formatCurrency(transaction.bookAmount)}</Text>
                </View>
              </View>

              {transaction.difference && (
                <View style={styles.differenceNote}>
                  <Text style={styles.differenceText}>
                    ⚠️ Difference: {formatCurrency(transaction.difference)}
                  </Text>
                </View>
              )}

              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceFill, { width: `${transaction.confidence * 100}%` }]} />
              </View>
              <Text style={styles.confidenceText}>
                Confidence: {(transaction.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Needs Review */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            ⚠️ Needs Review ({reconciliationData.needsReview.length})
          </Text>
          <Text style={styles.sectionSubtitle}>Human approval required</Text>
        </View>

        {reconciliationData.needsReview.map((transaction) => (
          <View key={transaction.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewInfo}>
                <Text style={styles.reviewDate}>{transaction.bankDate}</Text>
                <Text style={styles.reviewDescription}>{transaction.description}</Text>
                <Text style={styles.reviewAmount}>{formatCurrency(transaction.bankAmount)}</Text>
              </View>
            </View>

            <View style={styles.reviewReason}>
              <Text style={styles.reviewReasonText}>❓ {transaction.reason}</Text>
            </View>

            {/* AI Suggestions */}
            {transaction.suggestions && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.suggestionsTitle}>💡 AI Suggestions:</Text>
                {transaction.suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionCard}
                    onPress={() => handleAcceptSuggestion(transaction, suggestion)}
                  >
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionType}>{suggestion.type}</Text>
                      <Text style={styles.suggestionCategory}>{suggestion.category}</Text>
                    </View>
                    <View style={styles.suggestionConfidence}>
                      <Text style={styles.suggestionConfidenceText}>
                        {(suggestion.confidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Possible Matches */}
            {transaction.possibleMatches && (
              <View style={styles.matchesSection}>
                <Text style={styles.matchesTitle}>🔍 Possible Matches:</Text>
                {transaction.possibleMatches.map((match) => (
                  <TouchableOpacity
                    key={match.id}
                    style={styles.possibleMatchCard}
                  >
                    <View style={styles.possibleMatchInfo}>
                      <Text style={styles.possibleMatchDescription}>{match.description}</Text>
                      <Text style={styles.possibleMatchDate}>{match.date}</Text>
                    </View>
                    <Text style={styles.possibleMatchAmount}>{formatCurrency(match.amount)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => handleReviewTransaction(transaction)}
            >
              <Text style={styles.reviewButtonText}>Review & Match →</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 How Auto-Reconciliation Works</Text>
        <Text style={styles.infoText}>
          1. <Text style={styles.infoBold}>Exact Match</Text>: Same amount and date
        </Text>
        <Text style={styles.infoText}>
          2. <Text style={styles.infoBold}>Fuzzy Match</Text>: Close amount (within 1%)
        </Text>
        <Text style={styles.infoText}>
          3. <Text style={styles.infoBold}>Reference Match</Text>: Matching reference number
        </Text>
        <Text style={styles.infoText}>
          4. <Text style={styles.infoBold}>Pattern Match</Text>: AI-based description matching
        </Text>
        <Text style={[styles.infoText, { marginTop: 10 }]}>
          Only transactions that can't be auto-matched need your review!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#666'
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666'
  },
  autoReconcileButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  autoReconcileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  section: {
    marginHorizontal: 15,
    marginBottom: 20
  },
  sectionHeader: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666'
  },
  matchedCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  matchedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  matchedInfo: {
    flex: 1
  },
  matchedDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  matchedDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  matchedBadge: {
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  matchedBadgeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  matchedDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12
  },
  matchedAmounts: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  amountItem: {
    alignItems: 'center'
  },
  amountLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  amountSeparator: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 20
  },
  differenceNote: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10
  },
  differenceText: {
    fontSize: 12,
    color: '#F57C00',
    textAlign: 'center'
  },
  confidenceBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 4
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2
  },
  confidenceText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center'
  },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  reviewHeader: {
    marginBottom: 12
  },
  reviewInfo: {
    flex: 1
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  reviewDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6
  },
  reviewAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800'
  },
  reviewReason: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12
  },
  reviewReasonText: {
    fontSize: 13,
    color: '#F57C00'
  },
  suggestionsSection: {
    marginBottom: 12
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8
  },
  suggestionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6
  },
  suggestionInfo: {
    flex: 1
  },
  suggestionType: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2
  },
  suggestionCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  suggestionConfidence: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  suggestionConfidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50'
  },
  matchesSection: {
    marginBottom: 12
  },
  matchesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8
  },
  possibleMatchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6
  },
  possibleMatchInfo: {
    flex: 1
  },
  possibleMatchDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2
  },
  possibleMatchDate: {
    fontSize: 11,
    color: '#666'
  },
  possibleMatchAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3'
  },
  reviewButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 10
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20
  },
  infoBold: {
    fontWeight: '600',
    color: '#1A1A1A'
  }
});

export default AutoReconciliationScreen;
