// Dashboard component - main view for stock monitoring

import { useState } from 'react';
import { StockCard } from './StockCard';
import { AlertList } from './AlertList';
import { ATRChart } from './ATRChart';
import { NotificationBell } from './NotificationBell';
import { useDashboard, useAlerts, useNotifications, useRefreshData } from '../hooks/useStockData';
import { fetchStockPrices } from '../api/stockApi';
import type { DashboardStock, PriceData } from '../types/stock';

export function Dashboard() {
  const { data: dashboard, loading: dashboardLoading, error: dashboardError, refresh: refreshDashboard } = useDashboard();
  const { alerts, refresh: refreshAlerts } = useAlerts();
  const { notifications, unreadCount, refresh: refreshNotifications } = useNotifications();
  const { refresh: refreshData, loading: refreshing } = useRefreshData();

  const [selectedStock, setSelectedStock] = useState<DashboardStock | null>(null);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const handleStockClick = async (stock: DashboardStock) => {
    setSelectedStock(stock);
    setLoadingChart(true);
    try {
      const prices = await fetchStockPrices(stock.symbol, 30);
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

  const consolidatingStocks = dashboard?.stocks.filter((s) => s.is_consolidating) || [];
  const highProbStocks = dashboard?.stocks.filter((s) => s.breakout_probability === 'HIGH') || [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stock Breakout Alerts</h1>
              <p className="text-sm text-gray-500">Monitoring Mag 7 + Major Indices</p>
            </div>
            <div className="flex items-center gap-4">
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
            </div>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">All Stocks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard?.stocks.map((stock) => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  onClick={() => handleStockClick(stock)}
                />
              ))}
            </div>
          </div>

          {/* Alerts Sidebar */}
          <div className="lg:col-span-1">
            <AlertList alerts={alerts} onRefresh={refreshAlerts} />
          </div>
        </div>

        {/* Chart Modal/Section */}
        {selectedStock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedStock.symbol} - {selectedStock.name}
                </h2>
                <button
                  onClick={() => setSelectedStock(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                {loadingChart ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <ATRChart data={priceData} symbol={selectedStock.symbol} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
