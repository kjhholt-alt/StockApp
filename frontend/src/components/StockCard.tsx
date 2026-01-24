// StockCard component - displays individual stock with consolidation status

import type { DashboardStock } from '../types/stock';

interface StockCardProps {
  stock: DashboardStock;
  onClick?: () => void;
}

export function StockCard({ stock, onClick }: StockCardProps) {
  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getPriceChangeColor = (change: number | null) => {
    if (change === null) return 'text-gray-500';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '-';
    return `$${price.toFixed(2)}`;
  };

  const formatPercent = (percent: number | null) => {
    if (percent === null) return '';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div
      className={`
        bg-white rounded-lg shadow-md p-4 border-l-4 cursor-pointer
        hover:shadow-lg transition-shadow duration-200
        ${stock.is_consolidating ? 'border-l-amber-500' : 'border-l-gray-300'}
        ${stock.breakout_probability === 'HIGH' ? 'ring-2 ring-red-400' : ''}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{stock.symbol}</h3>
          <p className="text-sm text-gray-500 truncate max-w-[150px]">{stock.name}</p>
        </div>
        <span
          className={`
            px-2 py-1 text-xs font-semibold rounded-full border
            ${getProbabilityColor(stock.breakout_probability)}
          `}
        >
          {stock.breakout_probability}
        </span>
      </div>

      {/* Price */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900">
          {formatPrice(stock.current_price)}
        </div>
        <div className={`text-sm ${getPriceChangeColor(stock.price_change)}`}>
          {stock.price_change !== null && (
            <>
              {stock.price_change >= 0 ? '+' : ''}
              {stock.price_change?.toFixed(2)} ({formatPercent(stock.price_change_percent)})
            </>
          )}
        </div>
      </div>

      {/* Consolidation Status */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Tight Days:</span>
          <span className={`ml-1 font-semibold ${stock.consecutive_tight_days >= 3 ? 'text-amber-600' : ''}`}>
            {stock.consecutive_tight_days}
          </span>
        </div>
        <div>
          <span className="text-gray-500">ATR:</span>
          <span className="ml-1 font-semibold">
            {stock.atr ? `$${stock.atr.toFixed(2)}` : '-'}
          </span>
        </div>
      </div>

      {/* Status Badges */}
      <div className="mt-3 flex gap-2 flex-wrap">
        {stock.is_consolidating && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
            Consolidating
          </span>
        )}
        {stock.volume_spike && (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
            Volume Spike
          </span>
        )}
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
          {stock.stock_type}
        </span>
      </div>
    </div>
  );
}
