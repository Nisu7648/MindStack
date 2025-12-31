import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StockManagementScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Stock Management Screen - To be implemented</Text>
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

export default StockManagementScreen;
