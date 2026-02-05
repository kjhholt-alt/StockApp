// Heatmap component - visual grid showing relative performance

import type { DashboardStock } from '../types/stock';

interface HeatmapProps {
  stocks: DashboardStock[];
  onStockClick?: (stock: DashboardStock) => void;
}

export function Heatmap({ stocks, onStockClick }: HeatmapProps) {
  // Sort stocks by performance for better visualization
  const sortedStocks = [...stocks].sort(
    (a, b) => (b.price_change_percent || 0) - (a.price_change_percent || 0)
  );

  const getHeatColor = (changePercent: number | null) => {
    if (changePercent === null) return 'bg-gray-200 dark:bg-gray-600';

    if (changePercent >= 3) return 'bg-green-600 text-white';
    if (changePercent >= 2) return 'bg-green-500 text-white';
    if (changePercent >= 1) return 'bg-green-400 text-white';
    if (changePercent >= 0.5) return 'bg-green-300 text-green-900';
    if (changePercent >= 0) return 'bg-green-100 text-green-800';
    if (changePercent >= -0.5) return 'bg-red-100 text-red-800';
    if (changePercent >= -1) return 'bg-red-300 text-red-900';
    if (changePercent >= -2) return 'bg-red-400 text-white';
    if (changePercent >= -3) return 'bg-red-500 text-white';
    return 'bg-red-600 text-white';
  };

  const formatPercent = (percent: number | null) => {
    if (percent === null) return '-';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <span>Performance Heatmap</span>
        <span className="text-xs font-normal text-gray-500">Today</span>
      </h3>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mb-3 text-xs">
        <span className="text-gray-500">Worst</span>
        <div className="flex">
          <div className="w-4 h-3 bg-red-600"></div>
          <div className="w-4 h-3 bg-red-400"></div>
          <div className="w-4 h-3 bg-red-200"></div>
          <div className="w-4 h-3 bg-gray-200"></div>
          <div className="w-4 h-3 bg-green-200"></div>
          <div className="w-4 h-3 bg-green-400"></div>
          <div className="w-4 h-3 bg-green-600"></div>
        </div>
        <span className="text-gray-500">Best</span>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-5 gap-2">
        {sortedStocks.map((stock) => (
          <div
            key={stock.id}
            onClick={() => onStockClick?.(stock)}
            className={`
              p-2 rounded cursor-pointer transition-transform hover:scale-105
              ${getHeatColor(stock.price_change_percent)}
            `}
          >
            <div className="font-bold text-sm">{stock.symbol}</div>
            <div className="text-xs opacity-90">
              {formatPercent(stock.price_change_percent)}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="text-gray-500 text-xs">Gainers</div>
          <div className="font-bold text-green-600">
            {stocks.filter(s => (s.price_change_percent || 0) > 0).length}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Unchanged</div>
          <div className="font-bold text-gray-600 dark:text-gray-400">
            {stocks.filter(s => s.price_change_percent === 0 || s.price_change_percent === null).length}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Losers</div>
          <div className="font-bold text-red-600">
            {stocks.filter(s => (s.price_change_percent || 0) < 0).length}
          </div>
        </div>
      </div>
    </div>
  );
}
