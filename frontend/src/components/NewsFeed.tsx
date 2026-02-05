// NewsFeed component - shows recent headlines for tracked stocks

import { useState, useEffect } from 'react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
  symbols: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface NewsFeedProps {
  symbols: string[];
}

export function NewsFeed({ symbols }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchNews();
  }, [symbols]);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch news from backend (we'll add this endpoint)
      const response = await fetch(`/api/news/?symbols=${symbols.join(',')}`);

      if (!response.ok) {
        // If API not available, use mock data
        setNews(getMockNews(symbols));
      } else {
        const data = await response.json();
        setNews(data.articles || []);
      }
    } catch {
      // Use mock data if API fails
      setNews(getMockNews(symbols));
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = filter === 'all'
    ? news
    : news.filter(n => n.symbols.includes(filter));

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 dark:bg-green-900/30';
      case 'negative': return 'text-red-600 bg-red-50 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-700';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span>News Feed</span>
        </h3>
        <button
          onClick={fetchNews}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {symbols.slice(0, 5).map(symbol => (
          <button
            key={symbol}
            onClick={() => setFilter(symbol)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === symbol
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {symbol}
          </button>
        ))}
      </div>

      {/* News List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-4">{error}</div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No news available</div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {filteredNews.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
            >
              <div className="flex justify-between items-start gap-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                  {item.title}
                </h4>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${getSentimentColor(item.sentiment)}`}>
                  {item.sentiment}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-1">
                  {item.symbols.slice(0, 3).map(sym => (
                    <span
                      key={sym}
                      className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-gray-400">
                  {item.source} • {formatTimeAgo(item.published_at)}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// Mock news data for when API is not available
function getMockNews(symbols: string[]): NewsItem[] {
  const now = new Date();
  const mockNews: NewsItem[] = [
    {
      id: '1',
      title: 'Tech stocks rally as market sentiment improves',
      summary: 'Major technology companies see gains amid positive earnings outlook and strong consumer demand.',
      source: 'Market Watch',
      url: '#',
      published_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      symbols: ['AAPL', 'MSFT', 'GOOGL'],
      sentiment: 'positive',
    },
    {
      id: '2',
      title: 'NVIDIA announces new AI chip breakthrough',
      summary: 'The semiconductor giant reveals next-generation GPU architecture with significant performance improvements.',
      source: 'Tech Insider',
      url: '#',
      published_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      symbols: ['NVDA'],
      sentiment: 'positive',
    },
    {
      id: '3',
      title: 'Federal Reserve signals steady interest rates',
      summary: 'Markets react to Fed commentary suggesting rates will remain unchanged through Q2.',
      source: 'Reuters',
      url: '#',
      published_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      symbols: ['SPY', 'QQQ'],
      sentiment: 'neutral',
    },
    {
      id: '4',
      title: 'Amazon expands cloud infrastructure investments',
      summary: 'E-commerce giant announces $10B investment in new data centers across North America.',
      source: 'Bloomberg',
      url: '#',
      published_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      symbols: ['AMZN'],
      sentiment: 'positive',
    },
    {
      id: '5',
      title: 'Tesla faces regulatory scrutiny over autopilot',
      summary: 'NHTSA opens investigation into Tesla Autopilot system following recent incidents.',
      source: 'WSJ',
      url: '#',
      published_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      symbols: ['TSLA'],
      sentiment: 'negative',
    },
    {
      id: '6',
      title: 'Meta sees strong ad revenue growth in Q4',
      summary: 'Social media company reports better-than-expected advertising performance driven by Reels.',
      source: 'CNBC',
      url: '#',
      published_at: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
      symbols: ['META'],
      sentiment: 'positive',
    },
  ];

  // Filter to only include news for tracked symbols
  return mockNews.filter(news =>
    news.symbols.some(s => symbols.includes(s))
  );
}
