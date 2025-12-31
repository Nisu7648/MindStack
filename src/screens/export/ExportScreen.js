import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const ExportScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Export & CA Access</Text>
        <Text style={styles.subtitle}>Share books with professionals</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Options</Text>
        <Text style={styles.text}>• Export books to PDF</Text>
        <Text style={styles.text}>• Export books to Excel</Text>
        <Text style={styles.text}>• Year-wise export</Text>
        <Text style={styles.text}>• Share with CA (read-only link)</Text>
        <Text style={styles.text}>• Share with CA (file download)</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📌 This builds trust with professionals. Your CA can review your books without accessing your account.
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
    borderLeftColor: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ExportScreen;
