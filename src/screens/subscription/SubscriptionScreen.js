import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const SubscriptionScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription & Plan</Text>
        <Text style={styles.subtitle}>You're using a professional accounting system</Text>
      </View>

      <View style={styles.planCard}>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>PREMIUM</Text>
        </View>
        <Text style={styles.planTitle}>Premium Plan</Text>
        <Text style={styles.planPrice}>₹999/month</Text>
        <Text style={styles.planRenewal}>Renews on December 31, 2025</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features Included</Text>
        <Text style={styles.text}>✓ Unlimited transactions</Text>
        <Text style={styles.text}>✓ Voice input in all Indian languages</Text>
        <Text style={styles.text}>✓ GST reports and summaries</Text>
        <Text style={styles.text}>✓ All accounting books</Text>
        <Text style={styles.text}>✓ Export to Excel/PDF</Text>
        <Text style={styles.text}>✓ CA access and sharing</Text>
        <Text style={styles.text}>✓ Priority support</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📌 No dark patterns. Cancel anytime from this screen.
        </Text>
      </View>
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
  },
  planCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  planBadge: {
    backgroundColor: '#FFD700',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 1,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  planRenewal: {
    fontSize: 14,
    color: '#CCC',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 8,
  },
  infoBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default SubscriptionScreen;
