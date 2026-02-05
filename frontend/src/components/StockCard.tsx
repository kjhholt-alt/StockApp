// StockCard component - displays individual stock with consolidation status

import type { DashboardStock } from '../types/stock';

interface StockCardProps {
  stock: DashboardStock;
  onClick?: () => void;
}

// Mini Sparkline component
function Sparkline({ data, width = 60, height = 20 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Calculate points for the path
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const isPositive = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} className="inline-block">
      <path
        d={pathD}
        fill="none"
        stroke={isPositive ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

  const getConfidenceColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-gray-500';
  };

  // Format volume as readable string (e.g., 45.2M, 1.5B)
  const formatVolume = (volume: number | null) => {
    if (volume === null) return '-';
    if (volume >= 1_000_000_000) {
      return `${(volume / 1_000_000_000).toFixed(1)}B`;
    }
    if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(1)}M`;
    }
    if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(1)}K`;
    }
    return volume.toString();
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
        <div className="text-right">
          <span
            className={`
              px-2 py-1 text-xs font-semibold rounded-full border
              ${getProbabilityColor(stock.breakout_probability)}
            `}
          >
            {stock.breakout_probability}
          </span>
        </div>
      </div>

      {/* Price with Sparkline */}
      <div className="mb-3 flex justify-between items-start">
        <div>
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
        {/* 5-Day Sparkline */}
        {stock.recent_prices && stock.recent_prices.length >= 2 && (
          <div className="flex flex-col items-end">
            <Sparkline data={stock.recent_prices} width={60} height={24} />
            <span className="text-[10px] text-gray-400 mt-0.5">5-day</span>
          </div>
        )}
      </div>

      {/* Volume Display */}
      <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Volume:</span>
          <span className={`font-semibold ${stock.volume_spike ? 'text-purple-600' : 'text-gray-900 dark:text-gray-100'}`}>
            {formatVolume(stock.current_volume)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-gray-500">Avg (20d):</span>
          <span className="font-semibold text-gray-600 dark:text-gray-300">
            {formatVolume(stock.avg_volume_20d)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
          <span className="text-gray-500">RVOL:</span>
          <span className={`font-bold ${stock.volume_spike ? 'text-purple-600' : 'text-gray-700 dark:text-gray-200'}`}>
            {stock.rvol_display || '-'}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
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
        <div>
          <span className="text-gray-500">Range:</span>
          <span className="ml-1 font-semibold">
            {stock.daily_range ? `$${stock.daily_range.toFixed(2)}` : '-'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Score:</span>
          <span className={`ml-1 font-semibold ${getConfidenceColor(stock.confidence_score)}`}>
            {stock.confidence_score}/100
          </span>
        </div>
      </div>

      {/* Earnings Warning */}
      {stock.days_until_earnings !== null && stock.days_until_earnings <= 14 && (
        <div className="mb-3 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <span className="mr-1">📅</span>
          Earnings in {stock.days_until_earnings} day{stock.days_until_earnings !== 1 ? 's' : ''}
        </div>
      )}

      {/* Status Badges */}
      <div className="flex gap-2 flex-wrap">
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
        {stock.range_tightness_pct && stock.range_tightness_pct > 20 && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
            Tight Range
          </span>
        )}
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
          {stock.stock_type}
        </span>
      </div>
    </div>
  );
}
