/**
 * GLOBAL MARKET DASHBOARD SCREEN
 * 
 * Features:
 * - Market indices (NSE, BSE, S&P 500, NASDAQ)
 * - Forex rates
 * - Commodity prices (Gold, Silver, Oil)
 * - Cryptocurrency prices
 * - Watchlist
 * - Real-time updates
 * - Market news
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput
} from 'react-native';
import GlobalMarketDataService from '../services/global/GlobalMarketDataService';

const GlobalMarketDashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [selectedTab, setSelectedTab] = useState('INDICES');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMarketData();
    loadWatchlist();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadMarketData();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const loadMarketData = async () => {
    try {
      const result = await GlobalMarketDataService.getMarketOverview();
      if (result.success) {
        setMarketData(result.overview);
      }
    } catch (error) {
      console.error('Load market data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWatchlist = async () => {
    try {
      const result = await GlobalMarketDataService.getWatchlistWithPrices();
      if (result.success) {
        setWatchlist(result.watchlist);
      }
    } catch (error) {
      console.error('Load watchlist error:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMarketData();
    await loadWatchlist();
    setRefreshing(false);
  };

  const renderChangeIndicator = (change, changePercent) => {
    const isPositive = change >= 0;
    return (
      <View style={styles.changeContainer}>
        <Text style={[styles.change, { color: isPositive ? '#10B981' : '#DC2626' }]}>
          {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}
        </Text>
        <Text style={[styles.changePercent, { color: isPositive ? '#10B981' : '#DC2626' }]}>
          ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
        </Text>
      </View>
    );
  };

  const renderIndexCard = (index) => (
    <TouchableOpacity
      key={index.symbol}
      style={styles.indexCard}
      onPress={() => navigation.navigate('StockDetail', { symbol: index.symbol })}
    >
      <View style={styles.indexHeader}>
        <Text style={styles.indexName}>{index.name}</Text>
        <Text style={styles.indexExchange}>{index.exchange}</Text>
      </View>
      <Text style={styles.indexPrice}>
        {index.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </Text>
      {renderChangeIndicator(index.change, index.changePercent)}
    </TouchableOpacity>
  );

  const renderForexCard = (currency, rate) => (
    <View key={currency} style={styles.forexCard}>
      <View style={styles.forexHeader}>
        <Text style={styles.forexCurrency}>{currency}</Text>
        <Text style={styles.forexRate}>
          {typeof rate === 'number' ? rate.toFixed(4) : rate}
        </Text>
      </View>
    </View>
  );

  const renderCommodityCard = (commodity) => (
    <View key={commodity.name} style={styles.commodityCard}>
      <Text style={styles.commodityName}>{commodity.name}</Text>
      <Text style={styles.commodityPrice}>
        ${commodity.price?.toFixed(2)}
      </Text>
      <Text style={styles.commodityUnit}>{commodity.unit}</Text>
    </View>
  );

  const renderCryptoCard = (crypto) => (
    <TouchableOpacity
      key={crypto.id}
      style={styles.cryptoCard}
      onPress={() => navigation.navigate('CryptoDetail', { id: crypto.id })}
    >
      <View style={styles.cryptoHeader}>
        <Text style={styles.cryptoSymbol}>{crypto.symbol}</Text>
        <Text style={styles.cryptoName}>{crypto.name}</Text>
      </View>
      <Text style={styles.cryptoPrice}>
        ${crypto.priceUSD?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </Text>
      <Text style={styles.cryptoPriceINR}>
        ₹{crypto.priceINR?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </Text>
      {crypto.change24h && (
        <Text style={[styles.cryptoChange, { color: crypto.change24h >= 0 ? '#10B981' : '#DC2626' }]}>
          {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}% (24h)
        </Text>
      )}
    </View>
  );

  const renderWatchlistItem = (item) => (
    <TouchableOpacity
      key={item.symbol}
      style={styles.watchlistItem}
      onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol })}
    >
      <View style={styles.watchlistInfo}>
        <Text style={styles.watchlistSymbol}>{item.symbol}</Text>
        <Text style={styles.watchlistName}>{item.name}</Text>
      </View>
      {item.price && (
        <View style={styles.watchlistPriceContainer}>
          <Text style={styles.watchlistPrice}>
            {item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
          {renderChangeIndicator(item.change, item.changePercent)}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      {['INDICES', 'FOREX', 'COMMODITIES', 'CRYPTO', 'WATCHLIST'].map(tab => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, selectedTab === tab && styles.activeTab]}
          onPress={() => setSelectedTab(tab)}
        >
          <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Loading market data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stocks, crypto..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => navigation.navigate('SearchResults', { query: searchQuery })}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('SearchResults', { query: searchQuery })}
        >
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {renderTabs()}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {selectedTab === 'INDICES' && marketData?.indices && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Market Indices</Text>
            <View style={styles.grid}>
              {marketData.indices.map(renderIndexCard)}
            </View>
          </View>
        )}

        {selectedTab === 'FOREX' && marketData?.forex && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Forex Rates (USD Base)</Text>
            <View style={styles.grid}>
              {Object.entries(marketData.forex)
                .filter(([currency]) => ['INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'].includes(currency))
                .map(([currency, rate]) => renderForexCard(currency, rate))}
            </View>
          </View>
        )}

        {selectedTab === 'COMMODITIES' && marketData?.commodities && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Commodity Prices</Text>
            <View style={styles.grid}>
              {Object.values(marketData.commodities).map(renderCommodityCard)}
            </View>
          </View>
        )}

        {selectedTab === 'CRYPTO' && marketData?.crypto && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cryptocurrency Prices</Text>
            <View style={styles.grid}>
              {marketData.crypto.map(renderCryptoCard)}
            </View>
          </View>
        )}

        {selectedTab === 'WATCHLIST' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Watchlist</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddToWatchlist')}
              >
                <Text style={styles.addButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {watchlist.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No items in watchlist
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Add stocks or crypto to track
                </Text>
              </View>
            ) : (
              watchlist.map(renderWatchlistItem)
            )}
          </View>
        )}

        {/* Market Status */}
        <View style={styles.marketStatus}>
          <Text style={styles.marketStatusText}>
            Last updated: {new Date().toLocaleTimeString()}
          </Text>
          <Text style={styles.marketStatusSubtext}>
            Auto-refreshes every 5 minutes
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchButtonText: {
    fontSize: 18
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 8
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTab: {
    borderBottomColor: '#1A1A1A'
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280'
  },
  activeTabText: {
    color: '#1A1A1A'
  },
  content: {
    flex: 1
  },
  section: {
    padding: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12
  },
  addButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  grid: {
    gap: 12
  },
  indexCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  indexHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  indexName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  indexExchange: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  indexPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  change: {
    fontSize: 14,
    fontWeight: '600'
  },
  changePercent: {
    fontSize: 13,
    fontWeight: '600'
  },
  forexCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  forexHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  forexCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  forexRate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1'
  },
  commodityCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  commodityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8
  },
  commodityPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4
  },
  commodityUnit: {
    fontSize: 12,
    color: '#6B7280'
  },
  cryptoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  cryptoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cryptoSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  cryptoName: {
    fontSize: 13,
    color: '#6B7280'
  },
  cryptoPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4
  },
  cryptoPriceINR: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  cryptoChange: {
    fontSize: 13,
    fontWeight: '600'
  },
  watchlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  watchlistInfo: {
    flex: 1
  },
  watchlistSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  watchlistName: {
    fontSize: 13,
    color: '#6B7280'
  },
  watchlistPriceContainer: {
    alignItems: 'flex-end'
  },
  watchlistPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4
  },
  emptyState: {
    padding: 48,
    alignItems: 'center'
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  marketStatus: {
    padding: 16,
    alignItems: 'center'
  },
  marketStatusText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  marketStatusSubtext: {
    fontSize: 11,
    color: '#9CA3AF'
  }
});

export default GlobalMarketDashboardScreen;
