import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CreateInvoiceScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create Invoice Screen - To be implemented</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});

export default CreateInvoiceScreen;
