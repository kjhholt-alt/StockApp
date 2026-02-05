// App.tsx - Main application component with auth

import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { BacktestPage } from './components/BacktestPage';
import { GlobalMarkets } from './components/GlobalMarkets';
import type { User } from './types/stock';

type PageType = 'dashboard' | 'backtest' | 'markets';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  // Bypass login for testing - use a mock user
  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    profile: {
      display_name: 'Test User',
      theme: 'light',
      email_alerts: false,
      alert_on_consolidation: true,
      alert_on_volume_spike: true,
      alert_on_breakout: true,
    },
  };

  const handleLogout = () => {
    console.log('Logout clicked (disabled for testing)');
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Bar */}
      <nav className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-6">
              <span className="font-bold text-lg">StockAlerts</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 'dashboard'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentPage('backtest')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 'backtest'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Backtest
                </button>
                <button
                  onClick={() => setCurrentPage('markets')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 'markets'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Global Markets
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {mockUser.name}
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {currentPage === 'dashboard' && (
        <Dashboard user={mockUser} onLogout={handleLogout} />
      )}
      {currentPage === 'backtest' && <BacktestPage />}
      {currentPage === 'markets' && (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <GlobalMarkets />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
