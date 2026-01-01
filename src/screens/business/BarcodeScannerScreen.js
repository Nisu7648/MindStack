/**
 * BARCODE SCANNER SCREEN
 * Fast item scanning with camera
 * 
 * Features:
 * - Continuous scanning
 * - Auto-add to cart
 * - Manual barcode entry
 * - Item not found handling
 * - Quick add new item
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Vibration,
  Alert
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import stockManagementService from '../../services/business/stockManagementService';

const BarcodeScannerScreen = ({ navigation, route }) => {
  const { onScan, addToCart = false } = route.params || {};
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || data === lastScanned) return;

    setScanned(true);
    setLastScanned(data);
    Vibration.vibrate(100);

    try {
      const item = await stockManagementService.getItemByBarcode(data);

      if (item) {
        if (onScan) {
          onScan(item);
          navigation.goBack();
        } else if (addToCart) {
          // Add to current invoice
          navigation.navigate('POSBilling', {
            scannedItem: item
          });
        } else {
          // Show item details
          showItemDetails(item);
        }
      } else {
        // Item not found
        Alert.alert(
          'Item Not Found',
          `Barcode: ${data}\n\nThis item is not in your stock. Would you like to add it?`,
          [
            {
              text: 'Cancel',
              onPress: () => {
                setScanned(false);
                setLastScanned(null);
              },
              style: 'cancel'
            },
            {
              text: 'Add Item',
              onPress: () => {
                navigation.navigate('AddProduct', {
                  barcode: data,
                  onSave: () => {
                    setScanned(false);
                    setLastScanned(null);
                  }
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      setScanned(false);
      setLastScanned(null);
    }
  };

  const showItemDetails = (item) => {
    Alert.alert(
      item.item_name,
      `Code: ${item.item_code}\nPrice: ₹${item.selling_price}\nStock: ${item.current_stock} ${item.unit}\nGST: ${item.gst_rate}%`,
      [
        {
          text: 'OK',
          onPress: () => {
            setScanned(false);
            setLastScanned(null);
          }
        },
        {
          text: 'Add to Bill',
          onPress: () => {
            navigation.navigate('POSBilling', {
              scannedItem: item
            });
          }
        }
      ]
    );
  };

  const handleManualEntry = async () => {
    if (!manualBarcode.trim()) return;

    const item = await stockManagementService.getItemByBarcode(manualBarcode);

    if (item) {
      if (onScan) {
        onScan(item);
        navigation.goBack();
      } else {
        showItemDetails(item);
      }
    } else {
      Alert.alert(
        'Item Not Found',
        'Would you like to add this item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Item',
            onPress: () => {
              navigation.navigate('AddProduct', {
                barcode: manualBarcode
              });
            }
          }
        ]
      );
    }

    setManualBarcode('');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.noPermissionText}>No access to camera</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.back}
        flashMode={flashOn ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
        barCodeScannerSettings={{
          barCodeTypes: [
            BarCodeScanner.Constants.BarCodeType.ean13,
            BarCodeScanner.Constants.BarCodeType.ean8,
            BarCodeScanner.Constants.BarCodeType.qr,
            BarCodeScanner.Constants.BarCodeType.code128,
            BarCodeScanner.Constants.BarCodeType.code39,
            BarCodeScanner.Constants.BarCodeType.upc_a,
            BarCodeScanner.Constants.BarCodeType.upc_e
          ]
        }}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Ionicons
              name={flashOn ? "flash" : "flash-off"}
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Scanning Frame */}
        <View style={styles.scanFrame}>
          <View style={styles.scanCorner} />
          <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
          <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
          <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {scanned ? 'Processing...' : 'Point camera at barcode'}
          </Text>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setShowManualInput(!showManualInput)}
          >
            <Ionicons name="keypad" size={24} color="#FFFFFF" />
            <Text style={styles.manualButtonText}>Manual Entry</Text>
          </TouchableOpacity>

          {scanned && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => {
                setScanned(false);
                setLastScanned(null);
              }}
            >
              <Ionicons name="refresh" size={24} color="#FFFFFF" />
              <Text style={styles.rescanButtonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </Camera>

      {/* Manual Input Modal */}
      {showManualInput && (
        <View style={styles.manualInputModal}>
          <View style={styles.manualInputContent}>
            <Text style={styles.manualInputTitle}>Enter Barcode</Text>
            <TextInput
              style={styles.manualInput}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Enter barcode number"
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={handleManualEntry}
            />
            <View style={styles.manualInputButtons}>
              <TouchableOpacity
                style={[styles.manualInputButton, styles.cancelButton]}
                onPress={() => {
                  setShowManualInput(false);
                  setManualBarcode('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualInputButton, styles.submitButton]}
                onPress={handleManualEntry}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  scanFrame: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    width: '70%',
    height: '25%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)'
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4CAF50',
    borderWidth: 4,
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  scanCornerTopRight: {
    left: undefined,
    right: -2,
    borderLeftWidth: 0,
    borderRightWidth: 4
  },
  scanCornerBottomLeft: {
    top: undefined,
    bottom: -2,
    borderTopWidth: 0,
    borderBottomWidth: 4
  },
  scanCornerBottomRight: {
    top: undefined,
    bottom: -2,
    left: undefined,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4
  },
  instructions: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  instructionText: {
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  bottomActions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25
  },
  manualButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25
  },
  rescanButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8
  },
  manualInputModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  manualInputContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%'
  },
  manualInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
    textAlign: 'center'
  },
  manualInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  manualInputButtons: {
    flexDirection: 'row',
    gap: 12
  },
  manualInputButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F5F5F5'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600'
  },
  submitButton: {
    backgroundColor: '#2196F3'
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600'
  },
  noPermissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600'
  }
});

export default BarcodeScannerScreen;
