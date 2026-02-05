// GlobalMarkets component - shows futures and international markets when US is closed

import { useState, useEffect, useRef } from 'react';
import { LiveClock } from './LiveClock';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isOpen: boolean;
  lastUpdate: string;
}

interface MarketGroup {
  name: string;
  markets: MarketData[];
  status: 'open' | 'closed' | 'pre-market';
}

interface HoveredMarket {
  market: MarketData;
  position: { x: number; y: number };
}

// Background sparkline for ticker cards - subtle transparent chart
function BackgroundSparkline({ symbol, changePercent }: { symbol: string; changePercent: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPositive = changePercent >= 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Generate shorter data for sparkline (30 points)
    const prices = generateMockPerformance(symbol).slice(-30);

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    ctx.clearRect(0, 0, width, height);

    // Draw gradient fill - very subtle
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (isPositive) {
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.15)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.15)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    }

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(0, height);
    prices.forEach((price, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = 8 + (1 - (price - min) / range) * (height - 16);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line - subtle
    ctx.beginPath();
    prices.forEach((price, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = 8 + (1 - (price - min) / range) * (height - 16);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = isPositive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [symbol, isPositive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

// Mini chart component for 6-month performance preview (hover popup)
function MiniPerformanceChart({ symbol, isPositive }: { symbol: string; isPositive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 180 * dpr;
    canvas.height = 60 * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const width = 180;
    const height = 60;
    const padding = 6;

    // Generate mock 6-month data based on symbol
    const prices = generateMockPerformance(symbol);

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    ctx.clearRect(0, 0, width, height);

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (isPositive) {
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    }

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    prices.forEach((price, i) => {
      const x = padding + (i / (prices.length - 1)) * (width - 2 * padding);
      const y = padding + (1 - (price - min) / range) * (height - 2 * padding);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width - padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    prices.forEach((price, i) => {
      const x = padding + (i / (prices.length - 1)) * (width - 2 * padding);
      const y = padding + (1 - (price - min) / range) * (height - 2 * padding);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = isPositive ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw month labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const months = ['6mo', '5mo', '4mo', '3mo', '2mo', '1mo', 'Now'];
    months.forEach((label, i) => {
      if (i % 2 === 0 || i === months.length - 1) {
        const x = padding + (i / (months.length - 1)) * (width - 2 * padding);
        ctx.fillText(label, x, height - 1);
      }
    });
  }, [symbol, isPositive]);

  return <canvas ref={canvasRef} className="w-[180px] h-[60px]" />;
}

// Generate mock 6-month performance data
function generateMockPerformance(symbol: string): number[] {
  const points = 180; // ~6 months of daily data
  const prices: number[] = [];

  // Different trends based on asset class
  let basePrice = 100;
  let trend = 0;
  let volatility = 1;

  // Set characteristics based on symbol
  switch (symbol) {
    case 'GC': // Gold
      trend = 0.0008; volatility = 0.8; break;
    case 'SI': // Silver
      trend = 0.001; volatility = 1.2; break;
    case 'HG': // Copper
      trend = -0.0003; volatility = 1.0; break;
    case 'PL': // Platinum
      trend = 0.0005; volatility = 1.1; break;
    case 'CL': // Crude Oil
      trend = -0.0004; volatility = 1.5; break;
    case 'NG': // Natural Gas
      trend = 0.0012; volatility = 2.0; break;
    case 'BTC': // Bitcoin
      trend = 0.002; volatility = 2.5; break;
    case 'ETH': // Ethereum
      trend = 0.0018; volatility = 2.8; break;
    case 'ES': // S&P Futures
      trend = 0.0006; volatility = 0.7; break;
    case 'NQ': // Nasdaq Futures
      trend = 0.0008; volatility = 0.9; break;
    case 'DAX':
      trend = 0.0007; volatility = 0.8; break;
    case 'NKY':
      trend = 0.0005; volatility = 0.9; break;
    default:
      trend = 0.0003; volatility = 1.0;
  }

  let price = basePrice;
  for (let i = 0; i < points; i++) {
    prices.push(price);
    price += (Math.random() - 0.48 + trend) * volatility;
    price = Math.max(price, basePrice * 0.5); // Floor at 50% of base
  }

  return prices;
}

// Preview popup component
function MarketPreview({ market, position }: { market: MarketData; position: { x: number; y: number } }) {
  const prices = generateMockPerformance(market.symbol);
  const sixMonthChange = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
  const isPositive = sixMonthChange >= 0;

  return (
    <div
      className="fixed z-50 bg-gray-900 border border-gray-600 rounded-lg shadow-2xl p-4 pointer-events-none"
      style={{
        left: Math.min(position.x, window.innerWidth - 250),
        top: Math.max(position.y - 180, 10),
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-bold text-white">{market.symbol}</div>
          <div className="text-xs text-gray-400">{market.name}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-white">${market.price.toLocaleString()}</div>
          <div className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{sixMonthChange.toFixed(2)}% (6mo)
          </div>
        </div>
      </div>
      <MiniPerformanceChart symbol={market.symbol} isPositive={isPositive} />
      <div className="text-[10px] text-gray-500 mt-2 text-center">6 Month Performance</div>
    </div>
  );
}

export function GlobalMarkets() {
  const [marketData, setMarketData] = useState<MarketGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [hoveredMarket, setHoveredMarket] = useState<HoveredMarket | null>(null);

  const handleMarketHover = (e: React.MouseEvent, market: MarketData) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredMarket({
      market,
      position: { x: rect.right + 10, y: rect.top },
    });
  };

  const handleMarketLeave = () => {
    setHoveredMarket(null);
  };

  useEffect(() => {
    fetchMarketData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      // Try to fetch from backend
      const response = await fetch('/api/markets/global/');
      if (response.ok) {
        const data = await response.json();
        setMarketData(data.groups || []);
      } else {
        // Use mock data if API not available
        setMarketData(getMockMarketData());
      }
    } catch {
      setMarketData(getMockMarketData());
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const formatChange = (change: number, percent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
  };

  const getStatusBadge = (status: string, isOpen: boolean) => {
    if (isOpen || status === 'open') {
      return (
        <span className="flex items-center gap-1 text-xs text-green-500">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          Open
        </span>
      );
    }
    if (status === 'pre-market') {
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-500">
          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
          Pre-Market
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
        Closed
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 relative">
      {/* Hover Preview */}
      {hoveredMarket && (
        <MarketPreview
          market={hoveredMarket.market}
          position={hoveredMarket.position}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Global Markets & Futures
          </h2>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
            <LiveClock className="opacity-70" showSeconds={true} />
          </div>
        </div>
        <button
          onClick={fetchMarketData}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && marketData.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {marketData.map((group) => (
            <div key={group.name}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {group.name}
                </h3>
                {getStatusBadge(group.status, group.markets.some(m => m.isOpen))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {group.markets.map((market) => (
                  <div
                    key={market.symbol}
                    className="relative overflow-hidden p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                    onMouseEnter={(e) => handleMarketHover(e, market)}
                    onMouseLeave={handleMarketLeave}
                  >
                    {/* Background sparkline chart */}
                    <BackgroundSparkline symbol={market.symbol} changePercent={market.changePercent} />

                    {/* Content - positioned above the chart */}
                    <div className="relative z-10">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {market.symbol}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[80px]">
                            {market.name}
                          </div>
                        </div>
                        {market.isOpen && (
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mt-1"></span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          {market.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className={`text-xs font-medium ${getChangeColor(market.change)}`}>
                          {formatChange(market.change, market.changePercent)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market Hours Reference */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-semibold text-gray-500 mb-2">Market Hours (Local Time)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
          <div>
            <span className="font-medium">US Futures:</span> 24/5
          </div>
          <div>
            <span className="font-medium">Europe:</span> 3AM-11:30AM ET
          </div>
          <div>
            <span className="font-medium">Asia:</span> 7PM-3AM ET
          </div>
          <div>
            <span className="font-medium">Crypto:</span> 24/7
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock data for when API is not available
function getMockMarketData(): MarketGroup[] {
  const now = new Date();
  const hour = now.getHours();

  // Determine which markets are open based on current time (simplified)
  const isAsiaOpen = hour >= 19 || hour < 4;
  const isEuropeOpen = hour >= 3 && hour < 12;
  const isFuturesOpen = now.getDay() !== 0 && now.getDay() !== 6; // Mon-Fri

  return [
    {
      name: 'US Futures',
      status: isFuturesOpen ? 'open' : 'closed',
      markets: [
        {
          symbol: 'ES',
          name: 'S&P 500',
          price: 6089.25,
          change: 12.50,
          changePercent: 0.21,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'NQ',
          name: 'Nasdaq 100',
          price: 21875.50,
          change: 85.25,
          changePercent: 0.39,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'YM',
          name: 'Dow Jones',
          price: 44250.00,
          change: -45.00,
          changePercent: -0.10,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'RTY',
          name: 'Russell 2000',
          price: 2285.40,
          change: 8.20,
          changePercent: 0.36,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
      ],
    },
    {
      name: 'Europe',
      status: isEuropeOpen ? 'open' : 'closed',
      markets: [
        {
          symbol: 'DAX',
          name: 'Germany',
          price: 21285.50,
          change: 125.30,
          changePercent: 0.59,
          isOpen: isEuropeOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'FTSE',
          name: 'UK',
          price: 8520.40,
          change: -15.20,
          changePercent: -0.18,
          isOpen: isEuropeOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'CAC',
          name: 'France',
          price: 7892.30,
          change: 42.10,
          changePercent: 0.54,
          isOpen: isEuropeOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'STOXX',
          name: 'Euro Stoxx 50',
          price: 5185.20,
          change: 28.40,
          changePercent: 0.55,
          isOpen: isEuropeOpen,
          lastUpdate: now.toISOString(),
        },
      ],
    },
    {
      name: 'Asia Pacific',
      status: isAsiaOpen ? 'open' : 'closed',
      markets: [
        {
          symbol: 'NKY',
          name: 'Nikkei 225',
          price: 39958.50,
          change: 312.40,
          changePercent: 0.79,
          isOpen: isAsiaOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'HSI',
          name: 'Hang Seng',
          price: 19825.30,
          change: -142.80,
          changePercent: -0.72,
          isOpen: isAsiaOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'SHCOMP',
          name: 'Shanghai',
          price: 3252.40,
          change: 18.60,
          changePercent: 0.57,
          isOpen: isAsiaOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'ASX',
          name: 'Australia',
          price: 8425.60,
          change: 45.20,
          changePercent: 0.54,
          isOpen: isAsiaOpen,
          lastUpdate: now.toISOString(),
        },
      ],
    },
    {
      name: 'Crypto (24/7)',
      status: 'open',
      markets: [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: 105250.00,
          change: 1250.00,
          changePercent: 1.20,
          isOpen: true,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          price: 3325.50,
          change: 45.30,
          changePercent: 1.38,
          isOpen: true,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'SOL',
          name: 'Solana',
          price: 258.40,
          change: -4.20,
          changePercent: -1.60,
          isOpen: true,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'XRP',
          name: 'Ripple',
          price: 3.15,
          change: 0.08,
          changePercent: 2.61,
          isOpen: true,
          lastUpdate: now.toISOString(),
        },
      ],
    },
    {
      name: 'Precious Metals & Commodities',
      status: isFuturesOpen ? 'open' : 'closed',
      markets: [
        {
          symbol: 'GC',
          name: 'Gold',
          price: 2758.40,
          change: 18.50,
          changePercent: 0.67,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'SI',
          name: 'Silver',
          price: 31.25,
          change: 0.42,
          changePercent: 1.36,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'HG',
          name: 'Copper',
          price: 4.28,
          change: -0.03,
          changePercent: -0.70,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'PL',
          name: 'Platinum',
          price: 1012.50,
          change: 8.20,
          changePercent: 0.82,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
      ],
    },
    {
      name: 'Energy',
      status: isFuturesOpen ? 'open' : 'closed',
      markets: [
        {
          symbol: 'CL',
          name: 'Crude Oil',
          price: 78.45,
          change: -0.85,
          changePercent: -1.07,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'NG',
          name: 'Natural Gas',
          price: 3.42,
          change: 0.08,
          changePercent: 2.40,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'RB',
          name: 'Gasoline',
          price: 2.18,
          change: -0.02,
          changePercent: -0.91,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
        {
          symbol: 'HO',
          name: 'Heating Oil',
          price: 2.52,
          change: 0.01,
          changePercent: 0.40,
          isOpen: isFuturesOpen,
          lastUpdate: now.toISOString(),
        },
      ],
    },
  ];
}
