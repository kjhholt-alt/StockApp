// Dashboard component - main view for stock monitoring

import { useState, useEffect, useMemo } from 'react';
import { StockCard } from './StockCard';
import { AlertList } from './AlertList';
import { CandlestickChart } from './CandlestickChart';
import { NotificationBell } from './NotificationBell';
import { MarketStatus } from './MarketStatus';
import { Heatmap } from './Heatmap';
import { NewsFeed } from './NewsFeed';
import { TrumpTicker } from './TrumpTicker';
import { LiveClock } from './LiveClock';
import { useDashboard, useAlerts, useNotifications, useRefreshData } from '../hooks/useStockData';
import { fetchStockPrices } from '../api/stockApi';
import type { DashboardStock, PriceData, User } from '../types/stock';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const { data: dashboard, loading: dashboardLoading, error: dashboardError, refresh: refreshDashboard } = useDashboard();
  const { alerts, refresh: refreshAlerts } = useAlerts();
  const { notifications, unreadCount, refresh: refreshNotifications } = useNotifications();
  const { refresh: refreshData, loading: refreshing } = useRefreshData();

  const [selectedStock, setSelectedStock] = useState<DashboardStock | null>(null);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'heatmap'>('cards');
  const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'score' | 'tight_days'>('symbol');

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshDashboard();
      refreshAlerts();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refreshDashboard, refreshAlerts]);

  // Filter and sort stocks
  const filteredAndSortedStocks = useMemo(() => {
    if (!dashboard?.stocks) return [];

    let stocks = [...dashboard.stocks];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      stocks = stocks.filter(
        s => s.symbol.toLowerCase().includes(query) ||
             s.name.toLowerCase().includes(query)
      );
    }

    // Sort stocks
    stocks.sort((a, b) => {
      switch (sortBy) {
        case 'change':
          return (b.price_change_percent || 0) - (a.price_change_percent || 0);
        case 'score':
          return b.confidence_score - a.confidence_score;
        case 'tight_days':
          return b.consecutive_tight_days - a.consecutive_tight_days;
        case 'symbol':
        default:
          return a.symbol.localeCompare(b.symbol);
      }
    });

    return stocks;
  }, [dashboard?.stocks, searchQuery, sortBy]);

  const handleStockClick = async (stock: DashboardStock) => {
    setSelectedStock(stock);
    setLoadingChart(true);
    try {
      // Fetch 400 days to support 1-year chart view
      const prices = await fetchStockPrices(stock.symbol, 400);
      setPriceData(prices);
    } catch (err) {
      console.error('Failed to load price data:', err);
    } finally {
      setLoadingChart(false);
    }
  };

  const handleRefresh = async () => {
    await refreshData();
    refreshDashboard();
    refreshAlerts();
    refreshNotifications();
  };

  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">Error loading dashboard</p>
          <p className="mt-2">{dashboardError}</p>
          <button
            onClick={refreshDashboard}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const highProbStocks = dashboard?.stocks.filter((s) => s.breakout_probability === 'HIGH') || [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stock Breakout Alerts</h1>
                <p className="text-sm text-gray-500">Monitoring Mag 7 + Major Indices</p>
              </div>
              {/* Market Status */}
              <MarketStatus />
              {/* Live Clock */}
              <div className="hidden sm:block pl-3 border-l border-gray-200 dark:border-gray-600">
                <LiveClock showDate={true} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search stocks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent w-40"
                />
                <svg
                  className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`
                  px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                  ${darkMode
                    ? 'bg-yellow-500 text-gray-900 border-yellow-400 hover:bg-yellow-400'
                    : 'bg-gray-800 text-white border-gray-700 hover:bg-gray-700'
                  }
                `}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
              {/* Auto-Refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`
                  px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                  ${autoRefresh
                    ? 'bg-green-500 text-white border-green-400 hover:bg-green-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200'
                  }
                `}
                title={autoRefresh ? 'Auto-refresh ON (30s)' : 'Enable auto-refresh'}
              >
                {autoRefresh ? '🔄 Auto' : '🔄 Auto'}
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg
                  ${refreshing
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onRefresh={refreshNotifications}
              />
              {/* User Menu */}
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-600">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Sign out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Trump Ticker + Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Trump Market Watch Ticker */}
        <div className="mb-4">
          <TrumpTicker />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Stocks</div>
            <div className="text-2xl font-bold text-gray-900">{dashboard?.total_stocks || 0}</div>
          </div>
          <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
            <div className="text-sm text-amber-700">Consolidating</div>
            <div className="text-2xl font-bold text-amber-800">{dashboard?.consolidating_count || 0}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
            <div className="text-sm text-red-700">High Probability</div>
            <div className="text-2xl font-bold text-red-800">{dashboard?.high_probability_count || 0}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
            <div className="text-sm text-blue-700">Unread Alerts</div>
            <div className="text-2xl font-bold text-blue-800">{dashboard?.unread_alerts || 0}</div>
          </div>
        </div>

        {/* High Probability Section */}
        {highProbStocks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
              <span className="animate-pulse">🚀</span>
              High Breakout Probability
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {highProbStocks.map((stock) => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  onClick={() => handleStockClick(stock)}
                />
              ))}
            </div>
          </div>
        )}

        {/* View Controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              All Stocks
              {searchQuery && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredAndSortedStocks.length} results)
                </span>
              )}
            </h2>
            {/* View Toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'heatmap'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                }`}
              >
                Heatmap
              </button>
            </div>
          </div>
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="symbol">Symbol</option>
              <option value="change">% Change</option>
              <option value="score">Score</option>
              <option value="tight_days">Tight Days</option>
            </select>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock Grid / Heatmap */}
          <div className="lg:col-span-2">
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAndSortedStocks.map((stock) => (
                  <StockCard
                    key={stock.id}
                    stock={stock}
                    onClick={() => handleStockClick(stock)}
                  />
                ))}
                {filteredAndSortedStocks.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    No stocks match your search
                  </div>
                )}
              </div>
            ) : (
              <Heatmap
                stocks={filteredAndSortedStocks}
                onStockClick={handleStockClick}
              />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Alerts */}
            <AlertList alerts={alerts} onRefresh={refreshAlerts} />
            {/* News Feed */}
            <NewsFeed symbols={dashboard?.stocks.map(s => s.symbol) || []} />
          </div>
        </div>

        {/* Chart Modal/Section */}
        {selectedStock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedStock.symbol}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedStock.name}</p>
                </div>
                <button
                  onClick={() => setSelectedStock(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                {loadingChart ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <CandlestickChart data={priceData} symbol={selectedStock.symbol} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
