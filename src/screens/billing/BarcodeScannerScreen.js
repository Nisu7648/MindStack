/**
 * SCREEN 5: BARCODE SCANNER
 * Full-screen camera for barcode scanning
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BarcodeScannerScreen = ({ navigation, route }) => {
  const [scanned, setScanned] = useState(false);
  const [flashMode, setFlashMode] = useState(RNCamera.Constants.FlashMode.off);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;

    setScanned(true);
    Vibration.vibrate(100);

    // TODO: Search product in database
    const product = await searchProduct(data);

    if (product) {
      // Product found - add to bill
      if (route.params?.onScan) {
        route.params.onScan(product);
      }
      navigation.goBack();
    } else {
      // Product not found
      Alert.alert(
        'Product Not Found',
        `Barcode: ${data}\nWould you like to add this product?`,
        [
          {
            text: 'Cancel',
            onPress: () => setScanned(false),
            style: 'cancel'
          },
          {
            text: 'Add Product',
            onPress: () => {
              navigation.replace('AddProduct', { barcode: data });
            }
          }
        ]
      );
    }
  };

  const searchProduct = async (barcode) => {
    // TODO: Search in database
    // Mock response
    return null;
  };

  const toggleFlash = () => {
    setFlashMode(
      flashMode === RNCamera.Constants.FlashMode.off
        ? RNCamera.Constants.FlashMode.torch
        : RNCamera.Constants.FlashMode.off
    );
  };

  return (
    <View style={styles.container}>
      <RNCamera
        style={styles.camera}
        type={RNCamera.Constants.Type.back}
        flashMode={flashMode}
        onBarCodeRead={handleBarCodeScanned}
        barCodeTypes={[
          RNCamera.Constants.BarCodeType.ean13,
          RNCamera.Constants.BarCodeType.ean8,
          RNCamera.Constants.BarCodeType.qr,
          RNCamera.Constants.BarCodeType.code128,
          RNCamera.Constants.BarCodeType.code39
        ]}
        captureAudio={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flashButton}
            onPress={toggleFlash}
          >
            <Icon
              name={flashMode === RNCamera.Constants.FlashMode.off ? 'flash-off' : 'flash'}
              size={32}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Scanning Frame */}
        <View style={styles.scanFrame}>
          <View style={styles.frameCorner} />
          <View style={[styles.frameCorner, styles.frameCornerTopRight]} />
          <View style={[styles.frameCorner, styles.frameCornerBottomLeft]} />
          <View style={[styles.frameCorner, styles.frameCornerBottomRight]} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Scan product barcode
          </Text>
          <Text style={styles.instructionsSubtext}>
            Align barcode within the frame
          </Text>
        </View>

        {/* Manual Entry Button */}
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => {
            Alert.prompt(
              'Enter Barcode',
              'Type barcode number manually',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Search',
                  onPress: (barcode) => {
                    if (barcode) {
                      handleBarCodeScanned({ type: 'manual', data: barcode });
                    }
                  }
                }
              ],
              'plain-text'
            );
          }}
        >
          <Icon name="keyboard" size={24} color="#FFFFFF" />
          <Text style={styles.manualButtonText}>Enter Manually</Text>
        </TouchableOpacity>
      </RNCamera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  camera: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  flashButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanFrame: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: 200,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12
  },
  frameCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4CAF50',
    borderWidth: 4,
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  frameCornerTopRight: {
    left: undefined,
    right: -2,
    borderLeftWidth: 0,
    borderRightWidth: 4
  },
  frameCornerBottomLeft: {
    top: undefined,
    bottom: -2,
    borderTopWidth: 0,
    borderBottomWidth: 4
  },
  frameCornerBottomRight: {
    top: undefined,
    left: undefined,
    right: -2,
    bottom: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4
  },
  instructionsContainer: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  instructionsText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8
  },
  instructionsSubtext: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center'
  },
  manualButton: {
    position: 'absolute',
    bottom: 40,
    left: '25%',
    right: '25%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    paddingVertical: 16,
    borderRadius: 12
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8
  }
});

export default BarcodeScannerScreen;
