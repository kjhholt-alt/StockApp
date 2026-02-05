// BacktestPage - Historical performance analysis

import { useState, useEffect } from 'react';
import {
  fetchBacktestAlerts,
  fetchBacktestPatterns,
  fetchHistoricalDay,
  fetchAvailableDates,
  fetchAIOptimization,
  BacktestAlertResult,
  BacktestPatternResult,
  HistoricalDayResult,
  AIOptimizationResult,
} from '../api/stockApi';

type TabType = 'overview' | 'alerts' | 'patterns' | 'historical' | 'ai-optimizer';

export function BacktestPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [daysBack, setDaysBack] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [alertResults, setAlertResults] = useState<BacktestAlertResult | null>(null);
  const [patternResults, setPatternResults] = useState<BacktestPatternResult | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [historicalDay, setHistoricalDay] = useState<HistoricalDayResult | null>(null);
  const [aiOptimization, setAIOptimization] = useState<AIOptimizationResult | null>(null);
  const [aiLoading, setAILoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [daysBack]);

  useEffect(() => {
    if (selectedDate) {
      loadHistoricalDay(selectedDate);
    }
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [alerts, patterns, dates] = await Promise.all([
        fetchBacktestAlerts(daysBack),
        fetchBacktestPatterns(daysBack),
        fetchAvailableDates(),
      ]);
      setAlertResults(alerts);
      setPatternResults(patterns);
      setAvailableDates(dates.dates);
      if (dates.dates.length > 0 && !selectedDate) {
        setSelectedDate(dates.dates[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backtest data');
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalDay = async (date: string) => {
    try {
      const result = await fetchHistoricalDay(date);
      setHistoricalDay(result);
    } catch (err) {
      console.error('Failed to load historical day:', err);
    }
  };

  const loadAIOptimization = async () => {
    setAILoading(true);
    try {
      const result = await fetchAIOptimization(daysBack);
      setAIOptimization(result);
    } catch (err) {
      console.error('Failed to load AI optimization:', err);
      setAIOptimization({ error: err instanceof Error ? err.message : 'Failed to load AI optimization' });
    } finally {
      setAILoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BREAKOUT':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'NO_BREAKOUT':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading backtest data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">Error loading backtest data</p>
          <p className="mt-2">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backtest Analysis</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Historical performance of alert system
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Period:
                <select
                  value={daysBack}
                  onChange={(e) => setDaysBack(Number(e.target.value))}
                  className="ml-2 px-3 py-1 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                </select>
              </label>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex gap-4">
              {(['overview', 'alerts', 'patterns', 'historical', 'ai-optimizer'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    py-2 px-4 border-b-2 font-medium text-sm capitalize
                    ${activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'overview' && alertResults && patternResults && (
          <OverviewTab alertResults={alertResults} patternResults={patternResults} />
        )}
        {activeTab === 'alerts' && alertResults && (
          <AlertsTab alertResults={alertResults} getStatusColor={getStatusColor} />
        )}
        {activeTab === 'patterns' && patternResults && (
          <PatternsTab patternResults={patternResults} getAccuracyColor={getAccuracyColor} />
        )}
        {activeTab === 'historical' && (
          <HistoricalTab
            availableDates={availableDates}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            historicalDay={historicalDay}
          />
        )}
        {activeTab === 'ai-optimizer' && (
          <AIOptimizerTab
            aiOptimization={aiOptimization}
            aiLoading={aiLoading}
            onRunAnalysis={loadAIOptimization}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  alertResults,
  patternResults,
}: {
  alertResults: BacktestAlertResult;
  patternResults: BacktestPatternResult;
}) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">Alert Win Rate</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {alertResults.summary.win_rate}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {alertResults.summary.total_breakouts} / {alertResults.summary.total_breakouts + alertResults.summary.total_non_breakouts} alerts
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">Pattern Accuracy</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {patternResults.summary.overall_accuracy}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {patternResults.total_patterns} consolidation patterns
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">Best Gain</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            +{alertResults.summary.best_gain_pct}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Avg gain: +{alertResults.summary.avg_gain_pct}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">High Prob Accuracy</div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {patternResults.summary.high_prob_accuracy}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            HIGH probability alerts
          </div>
        </div>
      </div>

      {/* Performance by Alert Type */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance by Alert Type
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Breakouts</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Win Rate</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Move</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(alertResults.by_type).map(([type, data]) => (
                <tr key={type}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{type}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-300">{data.total}</td>
                  <td className="px-4 py-2 text-sm text-right text-green-600 dark:text-green-400">{data.breakouts}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium">
                    {data.total > 0 ? ((data.breakouts / data.total) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-300">
                    {data.avg_move_pct > 0 ? '+' : ''}{data.avg_move_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance by Probability Level */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance by Probability Level
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(patternResults.by_probability).map(([prob, data]) => (
            <div
              key={prob}
              className={`p-4 rounded-lg border ${
                prob === 'HIGH'
                  ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30'
                  : prob === 'MEDIUM'
                  ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30'
                  : 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30'
              }`}
            >
              <div className="text-lg font-bold text-gray-900 dark:text-white">{prob}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Patterns:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-white">{data.total}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Breakouts:</span>
                  <span className="ml-1 font-medium text-green-600 dark:text-green-400">{data.breakouts}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Accuracy:</span>
                  <span className="ml-1 font-bold text-blue-600 dark:text-blue-400">{data.accuracy}%</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg Gain:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-white">+{data.avg_gain}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance by Stock */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance by Stock
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Symbol</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Alerts</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Breakouts</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Win Rate</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Move</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(alertResults.by_stock)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([symbol, data]) => (
                  <tr key={symbol}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{symbol}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{data.name}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-300">{data.total}</td>
                    <td className="px-4 py-2 text-sm text-right text-green-600 dark:text-green-400">{data.breakouts}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">
                      {data.total > 0 ? ((data.breakouts / data.total) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-300">
                      {data.avg_move_pct > 0 ? '+' : ''}{data.avg_move_pct}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Alerts Tab Component
function AlertsTab({
  alertResults,
  getStatusColor,
}: {
  alertResults: BacktestAlertResult;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Detailed Alert History ({alertResults.detailed_alerts.length} alerts)
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Max Gain</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Max Loss</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {alertResults.detailed_alerts.map((alert) => (
              <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  {new Date(alert.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {alert.symbol}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  {alert.alert_type_display}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                  ${alert.price_at_alert?.toFixed(2) || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                  {alert.max_gain_pct ? `+${alert.max_gain_pct}%` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">
                  {alert.max_loss_pct ? `${alert.max_loss_pct}%` : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(alert.status)}`}>
                    {alert.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                  {alert.outcome_details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Patterns Tab Component
function PatternsTab({
  patternResults,
  getAccuracyColor,
}: {
  patternResults: BacktestPatternResult;
  getAccuracyColor: (accuracy: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* By Tight Days */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Accuracy by Consecutive Tight Days
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(patternResults.by_tight_days)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([days, data]) => (
              <div key={days} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{days}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">tight days</div>
                <div className={`text-xl font-bold mt-2 ${getAccuracyColor(data.accuracy)}`}>
                  {data.accuracy}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {data.breakouts}/{data.total}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Pattern List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Consolidation Patterns ({patternResults.patterns.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Symbol</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tight Days</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Probability</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entry Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Max Gain</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Breakout?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {patternResults.patterns.map((pattern, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {pattern.start_date}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {pattern.symbol}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-white">
                    {pattern.tight_days}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      pattern.probability === 'HIGH'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : pattern.probability === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {pattern.probability}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-white">
                    {pattern.confidence_score}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    ${pattern.price_at_start?.toFixed(2) || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                    {pattern.max_gain_pct ? `+${pattern.max_gain_pct}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {pattern.had_breakout ? (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Historical Tab Component
function HistoricalTab({
  availableDates,
  selectedDate,
  setSelectedDate,
  historicalDay,
}: {
  availableDates: string[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  historicalDay: HistoricalDayResult | null;
}) {
  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select a date to see historical snapshot:
        </label>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {availableDates.map((date) => (
            <option key={date} value={date}>
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </option>
          ))}
        </select>
      </div>

      {/* Historical Day View */}
      {historicalDay && !historicalDay.error && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Stocks</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {historicalDay.total_stocks}
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg shadow p-4">
              <div className="text-sm text-amber-700 dark:text-amber-300">Consolidating</div>
              <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                {historicalDay.consolidating}
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 rounded-lg shadow p-4">
              <div className="text-sm text-red-700 dark:text-red-300">High Probability</div>
              <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                {historicalDay.high_probability}
              </div>
            </div>
          </div>

          {/* Stocks on that day */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Stocks on {historicalDay.date}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Symbol</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tight Days</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Probability</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Consolidating</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Max Future Gain</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">5-Day Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {historicalDay.stocks
                    .sort((a, b) => b.confidence_score - a.confidence_score)
                    .map((stock) => (
                      <tr key={stock.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{stock.symbol}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{stock.name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                          ${stock.price?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-white">
                          {stock.consecutive_tight_days}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            stock.breakout_probability === 'HIGH'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : stock.breakout_probability === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {stock.breakout_probability}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-white">
                          {stock.confidence_score}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stock.is_consolidating ? (
                            <span className="text-amber-600 dark:text-amber-400">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          stock.max_future_gain >= 2
                            ? 'text-green-600 dark:text-green-400'
                            : stock.max_future_gain < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {stock.max_future_gain > 0 ? '+' : ''}{stock.max_future_gain.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {stock.future_prices.map((fp, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-1 rounded ${
                                  fp.change_pct >= 0
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                }`}
                                title={fp.date}
                              >
                                {fp.change_pct >= 0 ? '+' : ''}{fp.change_pct.toFixed(1)}%
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {historicalDay?.error && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-amber-800 dark:text-amber-200">
          {historicalDay.error}
        </div>
      )}
    </div>
  );
}

// AI Optimizer Tab Component
function AIOptimizerTab({
  aiOptimization,
  aiLoading,
  onRunAnalysis,
}: {
  aiOptimization: AIOptimizationResult | null;
  aiLoading: boolean;
  onRunAnalysis: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header with Run Button */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI-Powered Optimization
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Let AI analyze your backtest data and suggest improvements to the detection formulas
            </p>
          </div>
          <button
            onClick={onRunAnalysis}
            disabled={aiLoading}
            className={`
              px-6 py-3 rounded-lg font-medium text-white transition-colors
              ${aiLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
              }
            `}
          >
            {aiLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              '🤖 Run AI Analysis'
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {aiOptimization?.error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Error:</span>
            {aiOptimization.error}
          </div>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            Make sure ANTHROPIC_API_KEY is set in your environment variables.
          </p>
        </div>
      )}

      {/* No Analysis Yet */}
      {!aiOptimization && !aiLoading && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🧠</div>
          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Ready to Optimize
          </h4>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Click "Run AI Analysis" to have Claude analyze your backtest performance data
            and provide recommendations for improving the detection algorithms.
          </p>
        </div>
      )}

      {/* AI Analysis Results */}
      {aiOptimization?.success && (
        <>
          {/* Performance Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performance Summary (Last {aiOptimization.period_days} Days)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div className="text-sm text-blue-600 dark:text-blue-300">Alert Win Rate</div>
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {aiOptimization.performance_summary?.alert_win_rate}%
                </div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <div className="text-sm text-green-600 dark:text-green-300">Pattern Accuracy</div>
                <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {aiOptimization.performance_summary?.pattern_accuracy}%
                </div>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <div className="text-sm text-purple-600 dark:text-purple-300">Avg Gain</div>
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  +{aiOptimization.performance_summary?.avg_gain}%
                </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <div className="text-sm text-amber-600 dark:text-amber-300">High Prob Accuracy</div>
                <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                  {aiOptimization.performance_summary?.high_prob_accuracy}%
                </div>
              </div>
            </div>
          </div>

          {/* Current Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Current Configuration
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {aiOptimization.current_config && Object.entries(aiOptimization.current_config).map(([key, value]) => (
                <div key={key} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-blue-600">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🤖</span>
                AI Analysis & Recommendations
              </h4>
            </div>
            <div className="p-6 space-y-6">
              {aiOptimization.recommendations?.map((rec, idx) => (
                <div key={idx} className="border-l-4 border-purple-500 pl-4">
                  <h5 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">
                    {rec.category.replace(/_/g, ' ')}
                  </h5>
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {rec.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full AI Response */}
          {aiOptimization.ai_analysis && (
            <details className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <summary className="p-4 cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                View Full AI Response
              </summary>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                  {aiOptimization.ai_analysis}
                </pre>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
