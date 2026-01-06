/**
 * AUDIT TRAIL SCREEN
 * Complete audit log viewer with filters
 * Frontend-Backend fully integrated
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auditTrailService, { AUDIT_EVENT_TYPES, AUDIT_SEVERITY } from '../../services/audit/auditTrailService';

const AuditTrailScreen = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    eventType: null,
    severity: null,
    startDate: null,
    endDate: null,
    searchQuery: ''
  });

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, logs]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const result = await auditTrailService.getAuditTrail({
        limit: 100
      });

      if (result.success) {
        setLogs(result.logs);
      }
    } catch (error) {
      console.error('Load audit logs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Event type filter
    if (filters.eventType) {
      filtered = filtered.filter(log => log.event_type === filters.eventType);
    }

    // Severity filter
    if (filters.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.description?.toLowerCase().includes(query) ||
        log.user_name?.toLowerCase().includes(query) ||
        log.entity_name?.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case AUDIT_SEVERITY.CRITICAL:
        return '#F44336';
      case AUDIT_SEVERITY.WARNING:
        return '#FF9800';
      case AUDIT_SEVERITY.INFO:
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case AUDIT_SEVERITY.CRITICAL:
        return 'alert-circle';
      case AUDIT_SEVERITY.WARNING:
        return 'alert';
      case AUDIT_SEVERITY.INFO:
        return 'information';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderLogItem = ({ item }) => (
    <TouchableOpacity
      style={styles.logCard}
      onPress={() => setSelectedLog(item)}
    >
      <View style={styles.logHeader}>
        <View style={styles.logHeaderLeft}>
          <Icon
            name={getSeverityIcon(item.severity)}
            size={24}
            color={getSeverityColor(item.severity)}
          />
          <View style={styles.logInfo}>
            <Text style={styles.logCategory}>{item.event_category}</Text>
            <Text style={styles.logTime}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>
        {item.is_financial && (
          <View style={styles.financialBadge}>
            <Icon name="currency-inr" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>

      <Text style={styles.logDescription}>{item.description}</Text>

      <View style={styles.logFooter}>
        <Text style={styles.logUser}>
          <Icon name="account" size={14} color="#666666" /> {item.user_name}
        </Text>
        {item.entity_name && (
          <Text style={styles.logEntity}>
            {item.entity_type}: {item.entity_name}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedLog) return null;

    return (
      <Modal
        visible={!!selectedLog}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Audit Log Details</Text>
              <TouchableOpacity onPress={() => setSelectedLog(null)}>
                <Icon name="close" size={28} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Event Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Event Information</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Event Type</Text>
                  <Text style={styles.detailValue}>{selectedLog.event_type}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{selectedLog.event_category}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Severity</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(selectedLog.severity) }]}>
                    <Text style={styles.severityText}>{selectedLog.severity}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Timestamp</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedLog.timestamp)}</Text>
                </View>
              </View>

              {/* User Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>User Information</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>User</Text>
                  <Text style={styles.detailValue}>{selectedLog.user_name}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Role</Text>
                  <Text style={styles.detailValue}>{selectedLog.user_role}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Session ID</Text>
                  <Text style={styles.detailValue}>{selectedLog.session_id}</Text>
                </View>
              </View>

              {/* Entity Info */}
              {selectedLog.entity_type && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Entity Information</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Entity Type</Text>
                    <Text style={styles.detailValue}>{selectedLog.entity_type}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Entity Name</Text>
                    <Text style={styles.detailValue}>{selectedLog.entity_name}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Entity ID</Text>
                    <Text style={styles.detailValue}>{selectedLog.entity_id}</Text>
                  </View>
                </View>
              )}

              {/* Changes */}
              {(selectedLog.old_value || selectedLog.new_value) && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Changes</Text>
                  
                  {selectedLog.old_value && (
                    <View style={styles.changeBox}>
                      <Text style={styles.changeLabel}>Old Value:</Text>
                      <Text style={styles.changeValue}>
                        {JSON.stringify(selectedLog.old_value, null, 2)}
                      </Text>
                    </View>
                  )}

                  {selectedLog.new_value && (
                    <View style={styles.changeBox}>
                      <Text style={styles.changeLabel}>New Value:</Text>
                      <Text style={styles.changeValue}>
                        {JSON.stringify(selectedLog.new_value, null, 2)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Additional Information</Text>
                  <Text style={styles.metadataText}>
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Icon name="close" size={28} color="#000000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Severity Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Severity</Text>
              <View style={styles.filterButtons}>
                {[null, AUDIT_SEVERITY.INFO, AUDIT_SEVERITY.WARNING, AUDIT_SEVERITY.CRITICAL].map(severity => (
                  <TouchableOpacity
                    key={severity || 'all'}
                    style={[
                      styles.filterButton,
                      filters.severity === severity && styles.filterButtonActive
                    ]}
                    onPress={() => setFilters({ ...filters, severity })}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      filters.severity === severity && styles.filterButtonTextActive
                    ]}>
                      {severity || 'ALL'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Search */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Search</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search logs..."
                value={filters.searchQuery}
                onChangeText={(text) => setFilters({ ...filters, searchQuery: text })}
              />
            </View>

            {/* Clear Filters */}
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setFilters({
                  eventType: null,
                  severity: null,
                  startDate: null,
                  endDate: null,
                  searchQuery: ''
                });
                setShowFilters(false);
              }}
            >
              <Text style={styles.clearButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Audit Trail</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowFilters(true)}
          >
            <Icon name="filter" size={24} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={loadAuditLogs}
          >
            <Icon name="refresh" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{filteredLogs.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>
            {filteredLogs.filter(l => l.severity === AUDIT_SEVERITY.CRITICAL).length}
          </Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {filteredLogs.filter(l => l.is_financial).length}
          </Text>
          <Text style={styles.statLabel}>Financial</Text>
        </View>
      </View>

      {/* Logs List */}
      <FlatList
        data={filteredLogs}
        renderItem={renderLogItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-document-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyText}>No audit logs found</Text>
          </View>
        }
      />

      {/* Modals */}
      {renderDetailModal()}
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000'
  },
  headerActions: {
    flexDirection: 'row'
  },
  headerButton: {
    marginLeft: 16
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666666'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  logHeaderLeft: {
    flexDirection: 'row',
    flex: 1
  },
  logInfo: {
    marginLeft: 12,
    flex: 1
  },
  logCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4
  },
  logTime: {
    fontSize: 12,
    color: '#666666'
  },
  financialBadge: {
    backgroundColor: '#4CAF50',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logDescription: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 12,
    lineHeight: 20
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12
  },
  logUser: {
    fontSize: 12,
    color: '#666666'
  },
  logEntity: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    marginTop: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000'
  },
  modalBody: {
    padding: 20
  },
  detailSection: {
    marginBottom: 24
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 2,
    textAlign: 'right'
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  changeBox: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  changeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8
  },
  changeValue: {
    fontSize: 12,
    color: '#000000',
    fontFamily: 'monospace'
  },
  metadataText: {
    fontSize: 12,
    color: '#000000',
    fontFamily: 'monospace',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8
  },
  filterSection: {
    marginBottom: 24
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    marginBottom: 8
  },
  filterButtonActive: {
    backgroundColor: '#2196F3'
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666'
  },
  filterButtonTextActive: {
    color: '#FFFFFF'
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F8F9FA'
  },
  clearButton: {
    backgroundColor: '#F44336',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});

export default AuditTrailScreen;
