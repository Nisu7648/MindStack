/**
 * NETWORK MONITOR SERVICE
 * Real-time network status monitoring
 * 
 * Features:
 * - Network connectivity detection
 * - Connection quality monitoring
 * - Bandwidth estimation
 * - Latency measurement
 * - Connection type detection
 * - Offline mode management
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Connection Types
 */
export const CONNECTION_TYPE = {
  WIFI: 'wifi',
  CELLULAR: 'cellular',
  ETHERNET: 'ethernet',
  BLUETOOTH: 'bluetooth',
  WIMAX: 'wimax',
  VPN: 'vpn',
  NONE: 'none',
  UNKNOWN: 'unknown'
};

/**
 * Connection Quality
 */
export const CONNECTION_QUALITY = {
  EXCELLENT: 'EXCELLENT',  // < 50ms latency
  GOOD: 'GOOD',            // 50-150ms latency
  FAIR: 'FAIR',            // 150-300ms latency
  POOR: 'POOR',            // > 300ms latency
  OFFLINE: 'OFFLINE'
};

/**
 * Network Monitor Service
 */
class NetworkMonitorService {
  constructor() {
    this.isOnline = true;
    this.connectionType = CONNECTION_TYPE.UNKNOWN;
    this.connectionQuality = CONNECTION_QUALITY.GOOD;
    this.latency = 0;
    this.listeners = [];
    this.unsubscribe = null;
    this.pingInterval = null;
    this.offlineMode = false;
  }

  /**
   * Initialize Network Monitor
   */
  async initialize() {
    try {
      // Get initial state
      const state = await NetInfo.fetch();
      this.updateNetworkState(state);

      // Subscribe to network changes
      this.unsubscribe = NetInfo.addEventListener(state => {
        this.updateNetworkState(state);
      });

      // Start latency monitoring
      this.startLatencyMonitoring();

      // Load offline mode preference
      const offlineMode = await AsyncStorage.getItem('offline_mode');
      this.offlineMode = offlineMode === 'true';

      console.log('Network monitor initialized');

      return { success: true };
    } catch (error) {
      console.error('Network monitor initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update Network State
   */
  updateNetworkState(state) {
    const wasOnline = this.isOnline;
    
    this.isOnline = state.isConnected && state.isInternetReachable;
    this.connectionType = state.type || CONNECTION_TYPE.UNKNOWN;

    // Log state change
    if (wasOnline !== this.isOnline) {
      console.log(`Network status changed: ${this.isOnline ? 'Online' : 'Offline'}`);
      console.log(`Connection type: ${this.connectionType}`);
    }

    // Get connection details
    if (state.details) {
      this.updateConnectionDetails(state.details);
    }

    // Notify listeners
    this.notifyListeners({
      type: 'NETWORK_CHANGE',
      isOnline: this.isOnline,
      connectionType: this.connectionType,
      connectionQuality: this.connectionQuality,
      details: state.details
    });
  }

  /**
   * Update Connection Details
   */
  updateConnectionDetails(details) {
    // WiFi details
    if (details.ssid) {
      console.log(`WiFi SSID: ${details.ssid}`);
    }

    if (details.strength !== undefined) {
      console.log(`Signal strength: ${details.strength}`);
    }

    // Cellular details
    if (details.cellularGeneration) {
      console.log(`Cellular: ${details.cellularGeneration}`);
    }

    if (details.carrier) {
      console.log(`Carrier: ${details.carrier}`);
    }
  }

  /**
   * Start Latency Monitoring
   */
  startLatencyMonitoring(intervalSeconds = 30) {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Initial measurement
    this.measureLatency();

    // Periodic measurement
    this.pingInterval = setInterval(() => {
      if (this.isOnline) {
        this.measureLatency();
      }
    }, intervalSeconds * 1000);
  }

  /**
   * Stop Latency Monitoring
   */
  stopLatencyMonitoring() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Measure Latency
   */
  async measureLatency() {
    try {
      const startTime = Date.now();
      
      // Ping a reliable server (Google DNS)
      const response = await fetch('https://dns.google', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      if (response.ok) {
        const endTime = Date.now();
        this.latency = endTime - startTime;

        // Update connection quality
        this.updateConnectionQuality();

        console.log(`Latency: ${this.latency}ms - Quality: ${this.connectionQuality}`);

        // Notify listeners
        this.notifyListeners({
          type: 'LATENCY_UPDATE',
          latency: this.latency,
          quality: this.connectionQuality
        });
      }
    } catch (error) {
      console.log('Latency measurement failed:', error.message);
      this.connectionQuality = CONNECTION_QUALITY.OFFLINE;
    }
  }

  /**
   * Update Connection Quality
   */
  updateConnectionQuality() {
    if (!this.isOnline) {
      this.connectionQuality = CONNECTION_QUALITY.OFFLINE;
    } else if (this.latency < 50) {
      this.connectionQuality = CONNECTION_QUALITY.EXCELLENT;
    } else if (this.latency < 150) {
      this.connectionQuality = CONNECTION_QUALITY.GOOD;
    } else if (this.latency < 300) {
      this.connectionQuality = CONNECTION_QUALITY.FAIR;
    } else {
      this.connectionQuality = CONNECTION_QUALITY.POOR;
    }
  }

  /**
   * Check Internet Connectivity
   */
  async checkConnectivity() {
    try {
      const state = await NetInfo.fetch();
      this.updateNetworkState(state);
      return {
        success: true,
        isOnline: this.isOnline,
        connectionType: this.connectionType
      };
    } catch (error) {
      console.error('Check connectivity error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Network Status
   */
  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      connectionType: this.connectionType,
      connectionQuality: this.connectionQuality,
      latency: this.latency,
      offlineMode: this.offlineMode
    };
  }

  /**
   * Is WiFi Connected
   */
  isWiFi() {
    return this.connectionType === CONNECTION_TYPE.WIFI;
  }

  /**
   * Is Cellular Connected
   */
  isCellular() {
    return this.connectionType === CONNECTION_TYPE.CELLULAR;
  }

  /**
   * Is Good Connection
   */
  isGoodConnection() {
    return this.isOnline && (
      this.connectionQuality === CONNECTION_QUALITY.EXCELLENT ||
      this.connectionQuality === CONNECTION_QUALITY.GOOD
    );
  }

  /**
   * Should Sync
   */
  shouldSync() {
    // Don't sync if offline mode is enabled
    if (this.offlineMode) {
      return false;
    }

    // Don't sync if offline
    if (!this.isOnline) {
      return false;
    }

    // Sync on WiFi always
    if (this.isWiFi()) {
      return true;
    }

    // Sync on cellular only if good connection
    if (this.isCellular()) {
      return this.isGoodConnection();
    }

    return true;
  }

  /**
   * Should Download Large Files
   */
  shouldDownloadLargeFiles() {
    // Only on WiFi with good connection
    return this.isWiFi() && this.isGoodConnection();
  }

  /**
   * Enable Offline Mode
   */
  async enableOfflineMode() {
    this.offlineMode = true;
    await AsyncStorage.setItem('offline_mode', 'true');
    
    this.notifyListeners({
      type: 'OFFLINE_MODE_CHANGED',
      offlineMode: true
    });

    console.log('Offline mode enabled');
  }

  /**
   * Disable Offline Mode
   */
  async disableOfflineMode() {
    this.offlineMode = false;
    await AsyncStorage.setItem('offline_mode', 'false');
    
    this.notifyListeners({
      type: 'OFFLINE_MODE_CHANGED',
      offlineMode: false
    });

    console.log('Offline mode disabled');
  }

  /**
   * Toggle Offline Mode
   */
  async toggleOfflineMode() {
    if (this.offlineMode) {
      await this.disableOfflineMode();
    } else {
      await this.enableOfflineMode();
    }
  }

  /**
   * Wait For Connection
   */
  async waitForConnection(timeoutSeconds = 30) {
    return new Promise((resolve, reject) => {
      if (this.isOnline) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Connection timeout'));
      }, timeoutSeconds * 1000);

      const unsubscribe = this.addListener((event) => {
        if (event.type === 'NETWORK_CHANGE' && event.isOnline) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  /**
   * Add Listener
   */
  addListener(callback) {
    this.listeners.push(callback);
    
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify Listeners
   */
  notifyListeners(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Listener error:', error);
      }
    }
  }

  /**
   * Get Connection Info
   */
  async getConnectionInfo() {
    try {
      const state = await NetInfo.fetch();
      
      return {
        success: true,
        info: {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
          details: state.details,
          latency: this.latency,
          quality: this.connectionQuality
        }
      };
    } catch (error) {
      console.error('Get connection info error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test Connection Speed
   */
  async testConnectionSpeed() {
    try {
      if (!this.isOnline) {
        return {
          success: false,
          error: 'Device is offline'
        };
      }

      // Download a small file to test speed
      const testUrl = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
      const startTime = Date.now();
      
      const response = await fetch(testUrl);
      const blob = await response.blob();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const sizeBytes = blob.size;
      const speedMbps = (sizeBytes * 8) / (duration * 1000000);

      return {
        success: true,
        speed: {
          mbps: speedMbps.toFixed(2),
          duration,
          size: sizeBytes
        }
      };
    } catch (error) {
      console.error('Test connection speed error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.stopLatencyMonitoring();
    this.listeners = [];
  }
}

// Create singleton instance
const networkMonitor = new NetworkMonitorService();

export default networkMonitor;
export { NetworkMonitorService };
