/**
 * FORECASTING DASHBOARD SCREEN
 * 
 * Features:
 * - Cash flow forecast (6 months)
 * - Revenue predictions
 * - Burn rate analysis
 * - Runway calculator
 * - Scenario planning
 * - Visual charts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import ForecastingService from '../services/analytics/forecastingService';
import moment from 'moment';

const { width } = Dimensions.get('window');

const ForecastingDashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [cashFlowForecast, setCashFlowForecast] = useState(null);
  const [revenueForecast, setRevenueForecast] = useState(null);
  const [burnRate, setBurnRate] = useState(null);
  const [selectedTab, setSelectedTab] = useState('CASH_FLOW');

  useEffect(() => {
    loadForecasts();
  }, []);

  const loadForecasts = async () => {
    try {
      setLoading(true);

      // Load cash flow forecast
      const cashResult = await ForecastingService.forecastCashFlow(6);
      if (cashResult.success) {
        setCashFlowForecast(cashResult);
      }

      // Load revenue forecast
      const revenueResult = await ForecastingService.predictRevenue(6);
      if (revenueResult.success) {
        setRevenueForecast(revenueResult);
      }

      // Load burn rate
      const burnResult = await ForecastingService.calculateBurnRateAndRunway();
      if (burnResult.success) {
        setBurnRate(burnResult);
      }
    } catch (error) {
      console.error('Load forecasts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderHealthIndicator = () => {
    if (!burnRate) return null;

    const colors = {
      HEALTHY: '#10B981',
      GOOD: '#3B82F6',
      WARNING: '#F59E0B',
      CRITICAL: '#DC2626'
    };

    return (
      <View style={[styles.healthCard, { borderLeftColor: colors[burnRate.healthStatus] }]}>
        <View style={styles.healthHeader}>
          <Text style={styles.healthTitle}>Business Health</Text>
          <Text style={[styles.healthStatus, { color: colors[burnRate.healthStatus] }]}>
            {burnRate.healthStatus}
          </Text>
        </View>
        <Text style={styles.healthMessage}>{burnRate.healthMessage}</Text>
        <View style={styles.healthStats}>
          <View style={styles.healthStat}>
            <Text style={styles.healthStatLabel}>Current Cash</Text>
            <Text style={styles.healthStatValue}>
              ₹{burnRate.currentCash.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.healthStat}>
            <Text style={styles.healthStatLabel}>Burn Rate</Text>
            <Text style={styles.healthStatValue}>
              ₹{Math.abs(burnRate.avgBurnRate).toLocaleString('en-IN')}/mo
            </Text>
          </View>
          <View style={styles.healthStat}>
            <Text style={styles.healthStatLabel}>Runway</Text>
            <Text style={styles.healthStatValue}>{burnRate.runway}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCashFlowChart = () => {
    if (!cashFlowForecast || !cashFlowForecast.forecast) return null;

    const maxBalance = Math.max(...cashFlowForecast.forecast.map(f => f.projectedBalance));
    const minBalance = Math.min(...cashFlowForecast.forecast.map(f => f.projectedBalance));
    const range = maxBalance - minBalance;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Cash Flow Forecast (6 Months)</Text>
        <View style={styles.chart}>
          {cashFlowForecast.forecast.map((item, index) => {
            const height = ((item.projectedBalance - minBalance) / range) * 150;
            const isNegative = item.projectedBalance < 0;

            return (
              <View key={index} style={styles.chartBar}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(height, 10),
                      backgroundColor: isNegative ? '#DC2626' : '#10B981'
                    }
                  ]}
                />
                <Text style={styles.barLabel}>
                  {moment(item.month).format('MMM')}
                </Text>
                <Text style={styles.barValue}>
                  {(item.projectedBalance / 100000).toFixed(1)}L
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Positive Balance</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>Negative Balance</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRevenueChart = () => {
    if (!revenueForecast || !revenueForecast.predictions) return null;

    const maxRevenue = Math.max(...revenueForecast.predictions.map(p => p.predictedRevenue));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue Forecast (6 Months)</Text>
        <Text style={styles.chartSubtitle}>
          Growth Rate: {revenueForecast.growthRate}% per month
        </Text>
        <View style={styles.chart}>
          {revenueForecast.predictions.map((item, index) => {
            const height = (item.predictedRevenue / maxRevenue) * 150;

            return (
              <View key={index} style={styles.chartBar}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(height, 10),
                      backgroundColor: '#6366F1'
                    }
                  ]}
                />
                <Text style={styles.barLabel}>
                  {moment(item.month).format('MMM')}
                </Text>
                <Text style={styles.barValue}>
                  {(item.predictedRevenue / 100000).toFixed(1)}L
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.totalForecast}>
          Total Predicted: ₹{revenueForecast.totalPredictedRevenue.toLocaleString('en-IN')}
        </Text>
      </View>
    );
  };

  const renderRiskAlerts = () => {
    if (!cashFlowForecast || !cashFlowForecast.risks || cashFlowForecast.risks.length === 0) {
      return null;
    }

    return (
      <View style={styles.risksContainer}>
        <Text style={styles.sectionTitle}>⚠️ Risk Alerts</Text>
        {cashFlowForecast.risks.map((risk, index) => (
          <View
            key={index}
            style={[
              styles.riskCard,
              { borderLeftColor: risk.severity === 'CRITICAL' ? '#DC2626' : '#F59E0B' }
            ]}
          >
            <View style={styles.riskHeader}>
              <Text style={styles.riskMonth}>
                {moment(risk.month).format('MMMM YYYY')}
              </Text>
              <Text
                style={[
                  styles.riskSeverity,
                  { color: risk.severity === 'CRITICAL' ? '#DC2626' : '#F59E0B' }
                ]}
              >
                {risk.severity}
              </Text>
            </View>
            <Text style={styles.riskMessage}>{risk.message}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'CASH_FLOW' && styles.activeTab]}
        onPress={() => setSelectedTab('CASH_FLOW')}
      >
        <Text style={[styles.tabText, selectedTab === 'CASH_FLOW' && styles.activeTabText]}>
          Cash Flow
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'REVENUE' && styles.activeTab]}
        onPress={() => setSelectedTab('REVENUE')}
      >
        <Text style={[styles.tabText, selectedTab === 'REVENUE' && styles.activeTabText]}>
          Revenue
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'SCENARIOS' && styles.activeTab]}
        onPress={() => setSelectedTab('SCENARIOS')}
      >
        <Text style={[styles.tabText, selectedTab === 'SCENARIOS' && styles.activeTabText]}>
          Scenarios
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Generating forecasts...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {renderHealthIndicator()}
      {renderTabs()}

      {selectedTab === 'CASH_FLOW' && (
        <>
          {renderCashFlowChart()}
          {renderRiskAlerts()}
        </>
      )}

      {selectedTab === 'REVENUE' && renderRevenueChart()}

      {selectedTab === 'SCENARIOS' && (
        <View style={styles.scenariosContainer}>
          <Text style={styles.sectionTitle}>Scenario Planning</Text>
          <TouchableOpacity
            style={styles.scenarioButton}
            onPress={() => navigation.navigate('ScenarioPlanner')}
          >
            <Text style={styles.scenarioButtonText}>
              📊 Create New Scenario
            </Text>
          </TouchableOpacity>
          <Text style={styles.scenarioDescription}>
            Model different business scenarios like hiring, expansion, or cost-cutting to see their financial impact.
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('HiringImpactCalculator')}
        >
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionTitle}>Hiring Impact</Text>
          <Text style={styles.actionSubtitle}>Calculate hiring costs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('BudgetVsActual')}
        >
          <Text style={styles.actionIcon}>📈</Text>
          <Text style={styles.actionTitle}>Budget vs Actual</Text>
          <Text style={styles.actionSubtitle}>Compare forecasts</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  healthCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  healthStatus: {
    fontSize: 14,
    fontWeight: '700'
  },
  healthMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16
  },
  healthStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  healthStat: {
    flex: 1
  },
  healthStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4
  },
  healthStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  activeTab: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280'
  },
  activeTabText: {
    color: '#FFFFFF'
  },
  chartContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 20
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: 4
  },
  barLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280'
  },
  totalForecast: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center'
  },
  risksContainer: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12
  },
  riskCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  riskMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  riskSeverity: {
    fontSize: 12,
    fontWeight: '700'
  },
  riskMessage: {
    fontSize: 14,
    color: '#6B7280'
  },
  scenariosContainer: {
    padding: 16
  },
  scenarioButton: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16
  },
  scenarioButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center'
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  }
});

export default ForecastingDashboardScreen;
