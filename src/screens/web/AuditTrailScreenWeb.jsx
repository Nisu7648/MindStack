/**
 * WEB/DESKTOP VERSION - AUDIT TRAIL SCREEN
 * Responsive design for laptop/desktop
 * Same functionality as mobile
 */

import React, { useState, useEffect } from 'react';
import './AuditTrailScreen.css';
import auditTrailService, { AUDIT_EVENT_TYPES, AUDIT_SEVERITY } from '../../services/audit/auditTrailService';

const AuditTrailScreenWeb = () => {
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

    if (filters.eventType) {
      filtered = filtered.filter(log => log.event_type === filters.eventType);
    }

    if (filters.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

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

  if (loading) {
    return (
      <div className="audit-trail-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-trail-container">
      {/* Header */}
      <div className="audit-header">
        <div className="header-left">
          <h1>Audit Trail</h1>
          <p className="subtitle">Complete system activity log</p>
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={() => setShowFilters(!showFilters)}>
            <i className="icon-filter"></i> Filters
          </button>
          <button className="btn-icon" onClick={loadAuditLogs}>
            <i className="icon-refresh"></i> Refresh
          </button>
          <button className="btn-primary">
            <i className="icon-download"></i> Export
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{filteredLogs.length}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card critical">
          <div className="stat-value">
            {filteredLogs.filter(l => l.severity === AUDIT_SEVERITY.CRITICAL).length}
          </div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">
            {filteredLogs.filter(l => l.severity === AUDIT_SEVERITY.WARNING).length}
          </div>
          <div className="stat-label">Warnings</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">
            {filteredLogs.filter(l => l.is_financial).length}
          </div>
          <div className="stat-label">Financial</div>
        </div>
      </div>

      <div className="audit-content">
        {/* Sidebar Filters */}
        {showFilters && (
          <div className="filters-sidebar">
            <h3>Filters</h3>
            
            {/* Search */}
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                className="search-input"
                placeholder="Search logs..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              />
            </div>

            {/* Severity */}
            <div className="filter-group">
              <label>Severity</label>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${!filters.severity ? 'active' : ''}`}
                  onClick={() => setFilters({ ...filters, severity: null })}
                >
                  All
                </button>
                <button
                  className={`filter-btn ${filters.severity === AUDIT_SEVERITY.INFO ? 'active' : ''}`}
                  onClick={() => setFilters({ ...filters, severity: AUDIT_SEVERITY.INFO })}
                >
                  Info
                </button>
                <button
                  className={`filter-btn ${filters.severity === AUDIT_SEVERITY.WARNING ? 'active' : ''}`}
                  onClick={() => setFilters({ ...filters, severity: AUDIT_SEVERITY.WARNING })}
                >
                  Warning
                </button>
                <button
                  className={`filter-btn ${filters.severity === AUDIT_SEVERITY.CRITICAL ? 'active' : ''}`}
                  onClick={() => setFilters({ ...filters, severity: AUDIT_SEVERITY.CRITICAL })}
                >
                  Critical
                </button>
              </div>
            </div>

            {/* Clear Filters */}
            <button
              className="btn-secondary full-width"
              onClick={() => setFilters({
                eventType: null,
                severity: null,
                startDate: null,
                endDate: null,
                searchQuery: ''
              })}
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Logs Table */}
        <div className="logs-table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Category</th>
                <th>Description</th>
                <th>User</th>
                <th>Entity</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} className="log-row">
                  <td>
                    <span
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(log.severity) }}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td>
                    <div className="category-cell">
                      {log.event_category}
                      {log.is_financial && (
                        <span className="financial-badge">₹</span>
                      )}
                    </div>
                  </td>
                  <td className="description-cell">{log.description}</td>
                  <td>{log.user_name}</td>
                  <td>
                    {log.entity_name && (
                      <span className="entity-badge">
                        {log.entity_type}: {log.entity_name}
                      </span>
                    )}
                  </td>
                  <td className="timestamp-cell">{formatDate(log.timestamp)}</td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => setSelectedLog(log)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div className="empty-state">
              <i className="icon-file-empty"></i>
              <p>No audit logs found</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Audit Log Details</h2>
              <button className="btn-close" onClick={() => setSelectedLog(null)}>×</button>
            </div>

            <div className="modal-body">
              {/* Event Info */}
              <div className="detail-section">
                <h3>Event Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Event Type</label>
                    <span>{selectedLog.event_type}</span>
                  </div>
                  <div className="detail-item">
                    <label>Category</label>
                    <span>{selectedLog.event_category}</span>
                  </div>
                  <div className="detail-item">
                    <label>Severity</label>
                    <span
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(selectedLog.severity) }}
                    >
                      {selectedLog.severity}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Timestamp</label>
                    <span>{formatDate(selectedLog.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="detail-section">
                <h3>User Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>User</label>
                    <span>{selectedLog.user_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Role</label>
                    <span>{selectedLog.user_role}</span>
                  </div>
                  <div className="detail-item">
                    <label>Session ID</label>
                    <span className="monospace">{selectedLog.session_id}</span>
                  </div>
                </div>
              </div>

              {/* Entity Info */}
              {selectedLog.entity_type && (
                <div className="detail-section">
                  <h3>Entity Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Entity Type</label>
                      <span>{selectedLog.entity_type}</span>
                    </div>
                    <div className="detail-item">
                      <label>Entity Name</label>
                      <span>{selectedLog.entity_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Entity ID</label>
                      <span className="monospace">{selectedLog.entity_id}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Changes */}
              {(selectedLog.old_value || selectedLog.new_value) && (
                <div className="detail-section">
                  <h3>Changes</h3>
                  <div className="changes-container">
                    {selectedLog.old_value && (
                      <div className="change-box old">
                        <label>Old Value:</label>
                        <pre>{JSON.stringify(selectedLog.old_value, null, 2)}</pre>
                      </div>
                    )}
                    {selectedLog.new_value && (
                      <div className="change-box new">
                        <label>New Value:</label>
                        <pre>{JSON.stringify(selectedLog.new_value, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <div className="detail-section">
                  <h3>Additional Information</h3>
                  <pre className="metadata-box">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrailScreenWeb;
