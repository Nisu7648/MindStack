/**
 * ADVANCED FORECASTING & PREDICTIVE ANALYTICS SERVICE
 * 
 * Features:
 * - Cash flow forecasting
 * - Revenue prediction
 * - Expense forecasting
 * - Scenario planning
 * - Growth modeling
 * - Burn rate analysis
 * - Runway calculation
 * - Hiring impact simulation
 * - Budget vs actual predictions
 */

import { DatabaseService } from '../database/databaseService';
import moment from 'moment';

export class ForecastingService {
  /**
   * Forecast cash flow for next N months
   */
  static async forecastCashFlow(months = 6) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get historical cash flow data (last 12 months)
      const [historical] = await db.executeSql(
        `SELECT 
          strftime('%Y-%m', transaction_date) as month,
          SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) as inflow,
          SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END) as outflow
        FROM journal_entries
        WHERE account_name LIKE '%Cash%' OR account_name LIKE '%Bank%'
        AND transaction_date >= DATE('now', '-12 months')
        GROUP BY month
        ORDER BY month`
      );

      const historicalData = [];
      for (let i = 0; i < historical.rows.length; i++) {
        historicalData.push(historical.rows.item(i));
      }

      // Calculate trends
      const inflowTrend = this.calculateTrend(historicalData.map(d => d.inflow));
      const outflowTrend = this.calculateTrend(historicalData.map(d => d.outflow));

      // Get current cash balance
      const [currentBalance] = await db.executeSql(
        `SELECT SUM(debit_amount - credit_amount) as balance
        FROM journal_entries
        WHERE account_name LIKE '%Cash%' OR account_name LIKE '%Bank%'`
      );

      let balance = currentBalance.rows.item(0).balance || 0;

      // Generate forecast
      const forecast = [];
      const lastInflow = historicalData[historicalData.length - 1]?.inflow || 0;
      const lastOutflow = historicalData[historicalData.length - 1]?.outflow || 0;

      for (let i = 1; i <= months; i++) {
        const forecastMonth = moment().add(i, 'months').format('YYYY-MM');
        
        // Apply trend to predict future values
        const predictedInflow = lastInflow * (1 + (inflowTrend * i));
        const predictedOutflow = lastOutflow * (1 + (outflowTrend * i));
        const netFlow = predictedInflow - predictedOutflow;
        
        balance += netFlow;

        forecast.push({
          month: forecastMonth,
          predictedInflow,
          predictedOutflow,
          netFlow,
          projectedBalance: balance,
          confidence: this.calculateConfidence(i, months)
        });
      }

      // Identify risks
      const risks = [];
      forecast.forEach((f, index) => {
        if (f.projectedBalance < 0) {
          risks.push({
            month: f.month,
            severity: 'CRITICAL',
            message: `Projected negative balance: ₹${Math.abs(f.projectedBalance).toLocaleString('en-IN')}`
          });
        } else if (f.projectedBalance < 100000) {
          risks.push({
            month: f.month,
            severity: 'WARNING',
            message: `Low cash balance: ₹${f.projectedBalance.toLocaleString('en-IN')}`
          });
        }
      });

      return {
        success: true,
        currentBalance: currentBalance.rows.item(0).balance,
        forecast,
        trends: {
          inflow: inflowTrend,
          outflow: outflowTrend
        },
        risks,
        summary: {
          averageMonthlyInflow: forecast.reduce((sum, f) => sum + f.predictedInflow, 0) / months,
          averageMonthlyOutflow: forecast.reduce((sum, f) => sum + f.predictedOutflow, 0) / months,
          projectedBalanceEndOfPeriod: forecast[forecast.length - 1].projectedBalance
        }
      };
    } catch (error) {
      console.error('Forecast cash flow error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Predict revenue for next N months
   */
  static async predictRevenue(months = 6) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get historical revenue (last 12 months)
      const [historical] = await db.executeSql(
        `SELECT 
          strftime('%Y-%m', transaction_date) as month,
          SUM(credit_amount) as revenue
        FROM journal_entries
        WHERE account_type = 'REVENUE'
        AND transaction_date >= DATE('now', '-12 months')
        GROUP BY month
        ORDER BY month`
      );

      const historicalData = [];
      for (let i = 0; i < historical.rows.length; i++) {
        historicalData.push(historical.rows.item(i));
      }

      // Calculate growth rate
      const growthRate = this.calculateGrowthRate(historicalData.map(d => d.revenue));
      
      // Seasonal factors
      const seasonalFactors = this.calculateSeasonalFactors(historicalData);

      // Generate predictions
      const predictions = [];
      const lastRevenue = historicalData[historicalData.length - 1]?.revenue || 0;

      for (let i = 1; i <= months; i++) {
        const forecastMonth = moment().add(i, 'months');
        const monthIndex = forecastMonth.month();
        const seasonalFactor = seasonalFactors[monthIndex] || 1;
        
        const baseRevenue = lastRevenue * Math.pow(1 + growthRate, i);
        const predictedRevenue = baseRevenue * seasonalFactor;

        predictions.push({
          month: forecastMonth.format('YYYY-MM'),
          predictedRevenue,
          growthFromPrevious: i === 1 ? ((predictedRevenue - lastRevenue) / lastRevenue * 100) : 
                              ((predictedRevenue - predictions[i-2].predictedRevenue) / predictions[i-2].predictedRevenue * 100),
          confidence: this.calculateConfidence(i, months),
          seasonalFactor
        });
      }

      return {
        success: true,
        predictions,
        growthRate: (growthRate * 100).toFixed(2),
        totalPredictedRevenue: predictions.reduce((sum, p) => sum + p.predictedRevenue, 0)
      };
    } catch (error) {
      console.error('Predict revenue error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Scenario planning - simulate different scenarios
   */
  static async scenarioPlanning(scenarios) {
    try {
      const results = [];

      for (const scenario of scenarios) {
        const result = await this.simulateScenario(scenario);
        results.push({
          scenarioName: scenario.name,
          ...result
        });
      }

      // Compare scenarios
      const comparison = this.compareScenarios(results);

      return {
        success: true,
        scenarios: results,
        comparison,
        recommendation: this.recommendBestScenario(results)
      };
    } catch (error) {
      console.error('Scenario planning error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Simulate a scenario
   */
  static async simulateScenario(scenario) {
    const db = await DatabaseService.getDatabase();
    
    // Get current financials
    const [current] = await db.executeSql(
      `SELECT 
        SUM(CASE WHEN account_type = 'REVENUE' THEN credit_amount ELSE 0 END) as revenue,
        SUM(CASE WHEN account_type = 'EXPENSE' THEN debit_amount ELSE 0 END) as expenses
      FROM journal_entries
      WHERE transaction_date >= DATE('now', '-1 month')`
    );

    const currentRevenue = current.rows.item(0).revenue || 0;
    const currentExpenses = current.rows.item(0).expenses || 0;

    // Apply scenario changes
    const projectedRevenue = currentRevenue * (1 + (scenario.revenueChange || 0) / 100);
    const projectedExpenses = currentExpenses * (1 + (scenario.expenseChange || 0) / 100);
    
    // Add new costs (e.g., hiring)
    const additionalCosts = scenario.additionalCosts || 0;
    const totalExpenses = projectedExpenses + additionalCosts;

    const projectedProfit = projectedRevenue - totalExpenses;
    const profitMargin = (projectedProfit / projectedRevenue) * 100;

    return {
      projectedRevenue,
      projectedExpenses: totalExpenses,
      projectedProfit,
      profitMargin,
      breakEvenRevenue: totalExpenses,
      revenueGapToBreakEven: totalExpenses - projectedRevenue
    };
  }

  /**
   * Calculate hiring impact
   */
  static async calculateHiringImpact(numberOfEmployees, averageSalary, months = 12) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get current financials
      const [current] = await db.executeSql(
        `SELECT 
          AVG(monthly_revenue) as avg_revenue,
          AVG(monthly_expenses) as avg_expenses
        FROM (
          SELECT 
            strftime('%Y-%m', transaction_date) as month,
            SUM(CASE WHEN account_type = 'REVENUE' THEN credit_amount ELSE 0 END) as monthly_revenue,
            SUM(CASE WHEN account_type = 'EXPENSE' THEN debit_amount ELSE 0 END) as monthly_expenses
          FROM journal_entries
          WHERE transaction_date >= DATE('now', '-6 months')
          GROUP BY month
        )`
      );

      const avgRevenue = current.rows.item(0).avg_revenue || 0;
      const avgExpenses = current.rows.item(0).avg_expenses || 0;

      // Calculate hiring costs
      const monthlySalaryCost = numberOfEmployees * averageSalary;
      const monthlyOverhead = monthlySalaryCost * 0.2; // 20% overhead
      const totalMonthlyCost = monthlySalaryCost + monthlyOverhead;

      // Project impact
      const impact = [];
      let cumulativeCost = 0;

      for (let i = 1; i <= months; i++) {
        cumulativeCost += totalMonthlyCost;
        const newExpenses = avgExpenses + totalMonthlyCost;
        const projectedProfit = avgRevenue - newExpenses;

        impact.push({
          month: i,
          monthlyCost: totalMonthlyCost,
          cumulativeCost,
          projectedRevenue: avgRevenue,
          projectedExpenses: newExpenses,
          projectedProfit,
          profitMargin: (projectedProfit / avgRevenue) * 100
        });
      }

      // Calculate break-even point
      const revenueIncreaseNeeded = totalMonthlyCost;
      const revenueIncreasePercent = (revenueIncreaseNeeded / avgRevenue) * 100;

      return {
        success: true,
        numberOfEmployees,
        averageSalary,
        monthlyCost: totalMonthlyCost,
        annualCost: totalMonthlyCost * 12,
        impact,
        breakEven: {
          revenueIncreaseNeeded,
          revenueIncreasePercent,
          message: `You need to increase revenue by ${revenueIncreasePercent.toFixed(1)}% to maintain current profit margins`
        }
      };
    } catch (error) {
      console.error('Calculate hiring impact error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate burn rate and runway
   */
  static async calculateBurnRateAndRunway() {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get monthly burn (last 6 months)
      const [burn] = await db.executeSql(
        `SELECT 
          strftime('%Y-%m', transaction_date) as month,
          SUM(CASE WHEN account_type = 'REVENUE' THEN credit_amount ELSE 0 END) as revenue,
          SUM(CASE WHEN account_type = 'EXPENSE' THEN debit_amount ELSE 0 END) as expenses
        FROM journal_entries
        WHERE transaction_date >= DATE('now', '-6 months')
        GROUP BY month
        ORDER BY month`
      );

      const monthlyData = [];
      for (let i = 0; i < burn.rows.length; i++) {
        const row = burn.rows.item(i);
        monthlyData.push({
          month: row.month,
          revenue: row.revenue,
          expenses: row.expenses,
          burn: row.expenses - row.revenue
        });
      }

      // Calculate average burn rate
      const avgBurnRate = monthlyData.reduce((sum, d) => sum + d.burn, 0) / monthlyData.length;

      // Get current cash
      const [cash] = await db.executeSql(
        `SELECT SUM(debit_amount - credit_amount) as balance
        FROM journal_entries
        WHERE account_name LIKE '%Cash%' OR account_name LIKE '%Bank%'`
      );

      const currentCash = cash.rows.item(0).balance || 0;

      // Calculate runway
      const runway = avgBurnRate > 0 ? currentCash / avgBurnRate : Infinity;

      // Determine health status
      let healthStatus = 'HEALTHY';
      let healthMessage = 'Your business is generating positive cash flow';
      
      if (avgBurnRate > 0) {
        if (runway < 3) {
          healthStatus = 'CRITICAL';
          healthMessage = 'Critical: Less than 3 months of runway';
        } else if (runway < 6) {
          healthStatus = 'WARNING';
          healthMessage = 'Warning: Less than 6 months of runway';
        } else {
          healthStatus = 'GOOD';
          healthMessage = `Good: ${runway.toFixed(1)} months of runway`;
        }
      }

      return {
        success: true,
        currentCash,
        avgBurnRate,
        runway: runway === Infinity ? 'Infinite (Profitable)' : `${runway.toFixed(1)} months`,
        monthlyData,
        healthStatus,
        healthMessage
      };
    } catch (error) {
      console.error('Calculate burn rate error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Budget vs Actual forecast
   */
  static async budgetVsActualForecast(budgetData, months = 6) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const forecast = [];

      for (let i = 1; i <= months; i++) {
        const forecastMonth = moment().add(i, 'months');
        
        // Get historical performance
        const [actual] = await db.executeSql(
          `SELECT 
            SUM(CASE WHEN account_type = 'REVENUE' THEN credit_amount ELSE 0 END) as revenue,
            SUM(CASE WHEN account_type = 'EXPENSE' THEN debit_amount ELSE 0 END) as expenses
          FROM journal_entries
          WHERE strftime('%Y-%m', transaction_date) = ?`,
          [forecastMonth.subtract(1, 'year').format('YYYY-MM')]
        );

        const lastYearRevenue = actual.rows.item(0).revenue || 0;
        const lastYearExpenses = actual.rows.item(0).expenses || 0;

        // Apply growth assumptions
        const predictedRevenue = lastYearRevenue * 1.15; // 15% growth assumption
        const predictedExpenses = lastYearExpenses * 1.10; // 10% expense growth

        const budgetRevenue = budgetData.monthlyRevenue || 0;
        const budgetExpenses = budgetData.monthlyExpenses || 0;

        forecast.push({
          month: forecastMonth.format('YYYY-MM'),
          budget: {
            revenue: budgetRevenue,
            expenses: budgetExpenses,
            profit: budgetRevenue - budgetExpenses
          },
          predicted: {
            revenue: predictedRevenue,
            expenses: predictedExpenses,
            profit: predictedRevenue - predictedExpenses
          },
          variance: {
            revenue: predictedRevenue - budgetRevenue,
            expenses: predictedExpenses - budgetExpenses,
            profit: (predictedRevenue - predictedExpenses) - (budgetRevenue - budgetExpenses)
          }
        });
      }

      return {
        success: true,
        forecast
      };
    } catch (error) {
      console.error('Budget vs actual forecast error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate trend (linear regression slope)
   */
  static calculateTrend(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, index) => sum + (val * (index + 1)), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;

    return avgY !== 0 ? slope / avgY : 0;
  }

  /**
   * Calculate growth rate
   */
  static calculateGrowthRate(data) {
    if (data.length < 2) return 0;
    
    const firstValue = data[0];
    const lastValue = data[data.length - 1];
    const periods = data.length - 1;

    if (firstValue === 0) return 0;
    
    return Math.pow(lastValue / firstValue, 1 / periods) - 1;
  }

  /**
   * Calculate seasonal factors
   */
  static calculateSeasonalFactors(historicalData) {
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    historicalData.forEach(data => {
      const month = moment(data.month).month();
      monthlyAverages[month] += data.revenue;
      monthlyCounts[month]++;
    });

    const overallAverage = historicalData.reduce((sum, d) => sum + d.revenue, 0) / historicalData.length;

    return monthlyAverages.map((sum, index) => {
      if (monthlyCounts[index] === 0) return 1;
      const monthAvg = sum / monthlyCounts[index];
      return monthAvg / overallAverage;
    });
  }

  /**
   * Calculate confidence level
   */
  static calculateConfidence(monthsAhead, totalMonths) {
    // Confidence decreases as we forecast further into the future
    const baseConfidence = 0.95;
    const decayRate = 0.05;
    return Math.max(0.5, baseConfidence - (decayRate * monthsAhead));
  }

  /**
   * Compare scenarios
   */
  static compareScenarios(scenarios) {
    return scenarios.map(s => ({
      name: s.scenarioName,
      profitMargin: s.profitMargin,
      projectedProfit: s.projectedProfit
    })).sort((a, b) => b.projectedProfit - a.projectedProfit);
  }

  /**
   * Recommend best scenario
   */
  static recommendBestScenario(scenarios) {
    const best = scenarios.reduce((best, current) => 
      current.projectedProfit > best.projectedProfit ? current : best
    );

    return {
      scenarioName: best.scenarioName,
      reason: `Highest projected profit: ₹${best.projectedProfit.toLocaleString('en-IN')}`
    };
  }
}

export default ForecastingService;
