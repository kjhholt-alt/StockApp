// TrumpTicker component - displays real-time Trump news/statements that could affect markets

import { useState, useEffect, useRef } from 'react';

interface TrumpPost {
  id: string;
  content: string;
  source: 'truth_social' | 'twitter' | 'news' | 'interview';
  timestamp: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  topics: string[];
  url?: string;
}

interface TopicPreviewData {
  symbol: string;
  name: string;
  prices: number[];
  change: number;
  changePercent: number;
}

// Map topics to relevant symbols/assets
const TOPIC_SYMBOLS: Record<string, { symbol: string; name: string }> = {
  // Crypto
  'Crypto': { symbol: 'BTC', name: 'Bitcoin' },
  'Bitcoin': { symbol: 'BTC', name: 'Bitcoin' },
  // Energy
  'Energy': { symbol: 'XOM', name: 'Exxon Mobil' },
  'Oil': { symbol: 'USO', name: 'Oil ETF' },
  // Trade
  'China': { symbol: 'FXI', name: 'China ETF' },
  'Tariffs': { symbol: 'SPY', name: 'S&P 500' },
  'Trade': { symbol: 'EEM', name: 'Emerging Markets' },
  // Economy
  'Economy': { symbol: 'SPY', name: 'S&P 500' },
  'Manufacturing': { symbol: 'XLI', name: 'Industrials ETF' },
  // Fed/Rates
  'Fed': { symbol: 'TLT', name: 'Treasury Bonds' },
  'Interest Rates': { symbol: 'TLT', name: 'Treasury Bonds' },
  // Tech
  'Tech': { symbol: 'QQQ', name: 'Nasdaq 100' },
  'AI': { symbol: 'NVDA', name: 'NVIDIA' },
  // Default market
  'default': { symbol: 'SPY', name: 'S&P 500' },
};

// Sentiment to market correlation
const SENTIMENT_PREVIEW: Record<string, { symbol: string; name: string }> = {
  'bullish': { symbol: 'SPY', name: 'S&P 500' },
  'bearish': { symbol: 'VIX', name: 'Volatility Index' },
  'neutral': { symbol: 'SPY', name: 'S&P 500' },
};

// Mini sparkline component for preview
function MiniSparkline({ prices, isPositive }: { prices: number[]; isPositive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prices.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 120 * dpr;
    canvas.height = 40 * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const width = 120;
    const height = 40;
    const padding = 4;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    ctx.clearRect(0, 0, width, height);

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (isPositive) {
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    }

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);

    prices.forEach((price, i) => {
      const x = padding + (i / (prices.length - 1)) * (width - 2 * padding);
      const y = padding + (1 - (price - min) / range) * (height - 2 * padding);
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
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
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = isPositive ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [prices, isPositive]);

  return <canvas ref={canvasRef} className="w-[120px] h-[40px]" />;
}

// Preview popup component
function TagPreview({ topic, position, isSentiment }: {
  topic: string;
  position: { x: number; y: number };
  isSentiment?: boolean;
}) {
  const [previewData, setPreviewData] = useState<TopicPreviewData | null>(null);

  useEffect(() => {
    // Get the symbol mapping
    const mapping = isSentiment
      ? SENTIMENT_PREVIEW[topic.toLowerCase()]
      : TOPIC_SYMBOLS[topic] || TOPIC_SYMBOLS['default'];

    // Generate mock preview data (in production, fetch from API)
    const mockPrices = generateMockPrices(topic, isSentiment);
    const change = mockPrices[mockPrices.length - 1] - mockPrices[0];
    const changePercent = (change / mockPrices[0]) * 100;

    setPreviewData({
      symbol: mapping.symbol,
      name: mapping.name,
      prices: mockPrices,
      change,
      changePercent,
    });
  }, [topic, isSentiment]);

  if (!previewData) return null;

  const isPositive = previewData.change >= 0;

  return (
    <div
      className="absolute z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 pointer-events-none"
      style={{
        left: position.x,
        top: position.y - 120,
        minWidth: '160px',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-semibold text-white">{previewData.symbol}</div>
          <div className="text-[10px] text-gray-400">{previewData.name}</div>
        </div>
        <div className={`text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{previewData.changePercent.toFixed(2)}%
        </div>
      </div>
      <MiniSparkline prices={previewData.prices} isPositive={isPositive} />
      <div className="text-[9px] text-gray-500 mt-1 text-center">24h movement</div>
    </div>
  );
}

// Generate mock price data based on topic sentiment
function generateMockPrices(topic: string, isSentiment?: boolean): number[] {
  const basePrice = 100;
  const points = 24;
  const prices: number[] = [];

  // Determine trend based on topic
  let trend = 0;
  if (isSentiment) {
    trend = topic.toLowerCase() === 'bullish' ? 0.02 : topic.toLowerCase() === 'bearish' ? -0.02 : 0;
  } else {
    // Topic-based trends (mock - would be real data in production)
    const bullishTopics = ['Crypto', 'Bitcoin', 'Manufacturing', 'Economy', 'AI', 'Tech'];
    const bearishTopics = ['China', 'Tariffs', 'Trade'];
    if (bullishTopics.includes(topic)) trend = 0.015;
    else if (bearishTopics.includes(topic)) trend = -0.01;
  }

  let price = basePrice;
  for (let i = 0; i < points; i++) {
    prices.push(price);
    price += (Math.random() - 0.45 + trend) * 2;
  }

  return prices;
}

export function TrumpTicker() {
  const [posts, setPosts] = useState<TrumpPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [hoveredTag, setHoveredTag] = useState<{ topic: string; position: { x: number; y: number }; isSentiment?: boolean } | null>(null);

  useEffect(() => {
    fetchTrumpPosts();
    // Refresh every 2 minutes
    const interval = setInterval(fetchTrumpPosts, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrumpPosts = async () => {
    setLoading(true);
    try {
      // Try to fetch from backend (you'd implement this endpoint)
      const response = await fetch('/api/trump/feed/');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      } else {
        // Use mock data if API not available
        setPosts(getMockPosts());
      }
    } catch {
      setPosts(getMockPosts());
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'truth_social': return '📢';
      case 'twitter': return '𝕏';
      case 'interview': return '🎤';
      default: return '📰';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'truth_social': return 'Truth Social';
      case 'twitter': return 'X/Twitter';
      case 'interview': return 'Interview';
      default: return 'News';
    }
  };

  const handleTagHover = (e: React.MouseEvent, topic: string, isSentiment?: boolean) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredTag({
      topic,
      position: { x: rect.left, y: rect.top },
      isSentiment,
    });
  };

  const handleTagLeave = () => {
    setHoveredTag(null);
  };

  const getSentimentBadge = (sentiment: string) => {
    const baseClass = "px-1.5 py-0.5 text-[10px] rounded cursor-pointer transition-all hover:scale-105";
    switch (sentiment) {
      case 'bullish':
        return (
          <span
            className={`${baseClass} bg-green-500/20 text-green-400 hover:bg-green-500/30`}
            onMouseEnter={(e) => handleTagHover(e, 'bullish', true)}
            onMouseLeave={handleTagLeave}
          >
            BULLISH
          </span>
        );
      case 'bearish':
        return (
          <span
            className={`${baseClass} bg-red-500/20 text-red-400 hover:bg-red-500/30`}
            onMouseEnter={(e) => handleTagHover(e, 'bearish', true)}
            onMouseLeave={handleTagLeave}
          >
            BEARISH
          </span>
        );
      default:
        return (
          <span
            className={`${baseClass} bg-gray-500/20 text-gray-400 hover:bg-gray-500/30`}
            onMouseEnter={(e) => handleTagHover(e, 'neutral', true)}
            onMouseLeave={handleTagLeave}
          >
            NEUTRAL
          </span>
        );
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const latestPost = posts[0];

  return (
    <div className="bg-gradient-to-r from-red-900/30 to-blue-900/30 border border-red-500/30 rounded-lg overflow-hidden relative">
      {/* Tag Preview Popup */}
      {hoveredTag && (
        <TagPreview
          topic={hoveredTag.topic}
          position={hoveredTag.position}
          isSentiment={hoveredTag.isSentiment}
        />
      )}
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🇺🇸</span>
          <span className="font-semibold text-white text-sm">Trump Market Watch</span>
          {posts.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full animate-pulse">
              {posts.length} NEW
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchTrumpPosts();
            }}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            ↻
          </button>
          <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* Latest Post Preview (always visible) */}
      {!isExpanded && latestPost && (
        <div className="px-3 py-2 border-t border-white/10">
          <div className="flex items-start gap-2">
            <span className="text-sm">{getSourceIcon(latestPost.source)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 line-clamp-1">{latestPost.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-500">{formatTimeAgo(latestPost.timestamp)}</span>
                {getSentimentBadge(latestPost.sentiment)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t border-white/10 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              No recent market-moving statements
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {posts.map((post) => (
                <div key={post.id} className="px-3 py-3 hover:bg-white/5">
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">{getSourceIcon(post.source)}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-200">{post.content}</p>
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        <span className="text-[10px] text-gray-500">
                          {getSourceLabel(post.source)} • {formatTimeAgo(post.timestamp)}
                        </span>
                        {getSentimentBadge(post.sentiment)}
                        {post.topics.map((topic) => (
                          <span
                            key={topic}
                            className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 rounded cursor-pointer transition-all hover:scale-105 hover:bg-blue-500/30"
                            onMouseEnter={(e) => handleTagHover(e, topic)}
                            onMouseLeave={handleTagLeave}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Data Sources Info */}
          <div className="px-3 py-2 bg-black/20 text-[10px] text-gray-500">
            Sources: Truth Social RSS, News APIs • Updates every 2 min
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data for when API is not available
function getMockPosts(): TrumpPost[] {
  const now = new Date();

  return [
    {
      id: '1',
      content: 'Just spoke with major CEOs about bringing manufacturing back to America. Big announcements coming soon! 🇺🇸',
      source: 'truth_social',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      sentiment: 'bullish',
      topics: ['Manufacturing', 'Economy'],
    },
    {
      id: '2',
      content: 'The Federal Reserve needs to lower interest rates NOW. Other countries are eating our lunch!',
      source: 'truth_social',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      sentiment: 'bullish',
      topics: ['Fed', 'Interest Rates'],
    },
    {
      id: '3',
      content: 'China tariffs will be increased to 60% if they don\'t play fair. We mean business!',
      source: 'interview',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      sentiment: 'bearish',
      topics: ['China', 'Tariffs', 'Trade'],
    },
    {
      id: '4',
      content: 'Crypto is the future. We will make America the crypto capital of the world!',
      source: 'truth_social',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      sentiment: 'bullish',
      topics: ['Crypto', 'Bitcoin'],
    },
    {
      id: '5',
      content: 'Energy independence is key. We will drill baby drill and bring gas prices down to $2!',
      source: 'news',
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      sentiment: 'bullish',
      topics: ['Energy', 'Oil'],
    },
  ];
}
