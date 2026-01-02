/**
 * GLOBAL SEARCH SCREEN
 * 
 * Unified search interface with:
 * - Real-time search across all entities
 * - Autocomplete suggestions
 * - Recent searches
 * - Advanced filters
 * - Category tabs
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GlobalSearchService from '../../services/search/GlobalSearchService';

const GlobalSearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const searchInputRef = useRef(null);

  useEffect(() => {
    loadRecentSearches();
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const debounce = setTimeout(() => {
        performSearch();
        loadSuggestions();
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults(null);
      setSuggestions([]);
    }
  }, [searchQuery]);

  /**
   * Load recent searches
   */
  const loadRecentSearches = async () => {
    try {
      const searches = await GlobalSearchService.getRecentSearches();
      setRecentSearches(searches);
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  /**
   * Load autocomplete suggestions
   */
  const loadSuggestions = async () => {
    try {
      const suggestions = await GlobalSearchService.getSearchSuggestions(searchQuery);
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  /**
   * Perform search
   */
  const performSearch = async () => {
    if (searchQuery.length < 2) return;

    setLoading(true);
    try {
      const results = await GlobalSearchService.searchAll(searchQuery);
      setSearchResults(results);
      
      // Save to history
      await GlobalSearchService.saveSearchHistory(searchQuery, results.totalResults);
      
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle suggestion tap
   */
  const handleSuggestionTap = (suggestion) => {
    setSearchQuery(suggestion.suggestion);
    setSuggestions([]);
  };

  /**
   * Handle recent search tap
   */
  const handleRecentSearchTap = (search) => {
    setSearchQuery(search.search_query);
  };

  /**
   * Clear search
   */
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    searchInputRef.current?.focus();
  };

  /**
   * Navigate to entity details
   */
  const navigateToDetails = (type, item) => {
    switch (type) {
      case 'transaction':
        navigation.navigate('TransactionDetails', { transactionId: item.id });
        break;
      case 'customer':
        navigation.navigate('ContactDetails', { contactId: item.id, type: 'customer' });
        break;
      case 'vendor':
        navigation.navigate('ContactDetails', { contactId: item.id, type: 'vendor' });
        break;
      case 'product':
        navigation.navigate('ProductDetails', { productId: item.id });
        break;
      case 'invoice':
        navigation.navigate('InvoiceDetails', { invoiceId: item.id });
        break;
      case 'expense':
        navigation.navigate('ExpenseDetails', { expenseId: item.id });
        break;
    }
  };

  /**
   * Render search result item
   */
  const renderResultItem = (type, item) => {
    let icon, title, subtitle, amount;

    switch (type) {
      case 'transaction':
        icon = item.type === 'SALES' ? 'arrow-up-circle' : 'arrow-down-circle';
        title = item.description || 'Transaction';
        subtitle = `${item.party_name} • ${new Date(item.date).toLocaleDateString()}`;
        amount = `₹${item.amount.toLocaleString()}`;
        break;
      
      case 'customer':
        icon = 'account';
        title = item.name;
        subtitle = `${item.transaction_count} transactions • ₹${item.total_sales?.toLocaleString() || 0}`;
        amount = item.outstanding_balance > 0 ? `Due: ₹${item.outstanding_balance.toLocaleString()}` : null;
        break;
      
      case 'vendor':
        icon = 'truck';
        title = item.name;
        subtitle = `${item.transaction_count} transactions • ₹${item.total_purchases?.toLocaleString() || 0}`;
        amount = item.outstanding_balance > 0 ? `Due: ₹${item.outstanding_balance.toLocaleString()}` : null;
        break;
      
      case 'product':
        icon = 'package-variant';
        title = item.name;
        subtitle = `SKU: ${item.sku} • Stock: ${item.current_stock || 0}`;
        amount = `₹${item.selling_price?.toLocaleString()}`;
        break;
      
      case 'invoice':
        icon = 'file-document';
        title = item.invoice_number;
        subtitle = `${item.customer_name} • ${new Date(item.invoice_date).toLocaleDateString()}`;
        amount = `₹${item.total_amount.toLocaleString()}`;
        break;
      
      case 'expense':
        icon = 'credit-card';
        title = item.description;
        subtitle = `${item.category} • ${new Date(item.date).toLocaleDateString()}`;
        amount = `₹${item.amount.toLocaleString()}`;
        break;
    }

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => navigateToDetails(type, item)}
      >
        <View style={styles.resultIcon}>
          <Icon name={icon} size={24} color="#4CAF50" />
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle}>{title}</Text>
          <Text style={styles.resultSubtitle}>{subtitle}</Text>
        </View>
        {amount && (
          <Text style={styles.resultAmount}>{amount}</Text>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * Render category results
   */
  const renderCategoryResults = (category, items, type) => {
    if (!items || items.length === 0) return null;

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{category}</Text>
          <Text style={styles.categoryCount}>{items.length}</Text>
        </View>
        {items.map((item, index) => (
          <View key={index}>
            {renderResultItem(type, item)}
          </View>
        ))}
      </View>
    );
  };

  /**
   * Render search results
   */
  const renderSearchResults = () => {
    if (!searchResults) return null;

    if (searchResults.totalResults === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="magnify" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try different keywords</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.resultsContainer}>
        {activeTab === 'all' && (
          <>
            {renderCategoryResults('Transactions', searchResults.transactions, 'transaction')}
            {renderCategoryResults('Customers', searchResults.customers, 'customer')}
            {renderCategoryResults('Vendors', searchResults.vendors, 'vendor')}
            {renderCategoryResults('Products', searchResults.products, 'product')}
            {renderCategoryResults('Invoices', searchResults.invoices, 'invoice')}
            {renderCategoryResults('Expenses', searchResults.expenses, 'expense')}
          </>
        )}
        
        {activeTab === 'transactions' && renderCategoryResults('Transactions', searchResults.transactions, 'transaction')}
        {activeTab === 'customers' && renderCategoryResults('Customers', searchResults.customers, 'customer')}
        {activeTab === 'vendors' && renderCategoryResults('Vendors', searchResults.vendors, 'vendor')}
        {activeTab === 'products' && renderCategoryResults('Products', searchResults.products, 'product')}
        {activeTab === 'invoices' && renderCategoryResults('Invoices', searchResults.invoices, 'invoice')}
        {activeTab === 'expenses' && renderCategoryResults('Expenses', searchResults.expenses, 'expense')}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Icon name="magnify" size={24} color="#757575" style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search transactions, customers, products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Icon name="close-circle" size={20} color="#757575" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Tabs */}
      {searchResults && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All ({searchResults.totalResults})
            </Text>
          </TouchableOpacity>
          
          {searchResults.transactions.length > 0 && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
              onPress={() => setActiveTab('transactions')}
            >
              <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
                Transactions ({searchResults.transactions.length})
              </Text>
            </TouchableOpacity>
          )}
          
          {searchResults.customers.length > 0 && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'customers' && styles.activeTab]}
              onPress={() => setActiveTab('customers')}
            >
              <Text style={[styles.tabText, activeTab === 'customers' && styles.activeTabText]}>
                Customers ({searchResults.customers.length})
              </Text>
            </TouchableOpacity>
          )}
          
          {searchResults.vendors.length > 0 && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'vendors' && styles.activeTab]}
              onPress={() => setActiveTab('vendors')}
            >
              <Text style={[styles.tabText, activeTab === 'vendors' && styles.activeTabText]}>
                Vendors ({searchResults.vendors.length})
              </Text>
            </TouchableOpacity>
          )}
          
          {searchResults.products.length > 0 && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'products' && styles.activeTab]}
              onPress={() => setActiveTab('products')}
            >
              <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
                Products ({searchResults.products.length})
              </Text>
            </TouchableOpacity>
          )}
          
          {searchResults.invoices.length > 0 && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'invoices' && styles.activeTab]}
              onPress={() => setActiveTab('invoices')}
            >
              <Text style={[styles.tabText, activeTab === 'invoices' && styles.activeTabText]}>
                Invoices ({searchResults.invoices.length})
              </Text>
            </TouchableOpacity>
          )}
          
          {searchResults.expenses.length > 0 && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'expenses' && styles.activeTab]}
              onPress={() => setActiveTab('expenses')}
            >
              <Text style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}>
                Expenses ({searchResults.expenses.length})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && !loading && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionTap(suggestion)}
            >
              <Icon name="magnify" size={20} color="#757575" />
              <Text style={styles.suggestionText}>{suggestion.suggestion}</Text>
              <Text style={styles.suggestionType}>{suggestion.type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Searches */}
      {!searchQuery && recentSearches.length > 0 && (
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={() => GlobalSearchService.clearSearchHistory()}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((search, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recentItem}
              onPress={() => handleRecentSearchTap(search)}
            >
              <Icon name="history" size={20} color="#757575" />
              <Text style={styles.recentText}>{search.search_query}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search Results */}
      {!loading && renderSearchResults()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  searchIcon: {
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A'
  },
  clearButton: {
    padding: 4
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50'
  },
  tabText: {
    fontSize: 14,
    color: '#757575'
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 12
  },
  suggestionType: {
    fontSize: 12,
    color: '#757575',
    textTransform: 'capitalize'
  },
  recentContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  clearText: {
    fontSize: 14,
    color: '#4CAF50'
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12
  },
  recentText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 12
  },
  resultsContainer: {
    flex: 1
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5'
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  categoryCount: {
    fontSize: 14,
    color: '#757575'
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  resultContent: {
    flex: 1
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#757575'
  },
  resultAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8
  }
});

export default GlobalSearchScreen;
