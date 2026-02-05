// API client for Stock Breakout Alert System

import axios from 'axios';
import type {
  DashboardSummary,
  StockDetail,
  PriceData,
  ATRAnalysis,
  Alert,
  Notification,
  AlertSummary,
  AuthState,
  User,
  WatchlistItem,
} from '../types/stock';

// Use VITE_API_URL for production, /api for development (proxied by Vite)
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Auth
export async function login(username: string, password: string): Promise<{ user: User; message: string }> {
  const response = await api.post('/users/login/', { username, password });
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/users/logout/');
}

export async function getCurrentUser(): Promise<AuthState> {
  const response = await api.get<AuthState>('/users/me/');
  return response.data;
}

// Dashboard
export async function fetchDashboard(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>('/dashboard/');
  return response.data;
}

// Stocks
export async function fetchStocks(): Promise<StockDetail[]> {
  const response = await api.get<PaginatedResponse<StockDetail>>('/stocks/');
  return response.data.results;
}

export async function fetchStock(symbol: string): Promise<StockDetail> {
  const response = await api.get<StockDetail>(`/stocks/${symbol}/`);
  return response.data;
}

export async function fetchStockPrices(symbol: string, days: number = 30): Promise<PriceData[]> {
  const response = await api.get<PriceData[]>(`/stocks/${symbol}/prices/`, {
    params: { days },
  });
  return response.data;
}

export async function fetchStockAnalysis(symbol: string, days: number = 30): Promise<ATRAnalysis[]> {
  const response = await api.get<ATRAnalysis[]>(`/stocks/${symbol}/analysis/`, {
    params: { days },
  });
  return response.data;
}

export async function fetchConsolidatingStocks(): Promise<ATRAnalysis[]> {
  const response = await api.get<ATRAnalysis[]>('/stocks/consolidating/');
  return response.data;
}

export async function fetchHighProbabilityStocks(): Promise<ATRAnalysis[]> {
  const response = await api.get<ATRAnalysis[]>('/stocks/high_probability/');
  return response.data;
}

// Paginated response type
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Alerts
export async function fetchAlerts(params?: {
  is_read?: boolean;
  type?: string;
  symbol?: string;
}): Promise<Alert[]> {
  const response = await api.get<PaginatedResponse<Alert>>('/alerts/', { params });
  return response.data.results;
}

export async function markAlertRead(alertId: number): Promise<void> {
  await api.post(`/alerts/${alertId}/read/`);
}

export async function markAllAlertsRead(): Promise<{ marked_read: number }> {
  const response = await api.post<{ marked_read: number }>('/alerts/mark_all_read/');
  return response.data;
}

export async function fetchUnreadAlertCount(): Promise<{ unread_count: number }> {
  const response = await api.get<{ unread_count: number }>('/alerts/unread_count/');
  return response.data;
}

export async function fetchAlertSummary(): Promise<AlertSummary> {
  const response = await api.get<AlertSummary>('/alerts/summary/');
  return response.data;
}

// Notifications
export async function fetchNotifications(params?: {
  is_read?: boolean;
  type?: string;
  symbol?: string;
}): Promise<Notification[]> {
  const response = await api.get<PaginatedResponse<Notification>>('/notifications/', { params });
  return response.data.results;
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  await api.post(`/notifications/${notificationId}/read/`);
}

export async function markAllNotificationsRead(): Promise<{ marked_read: number }> {
  const response = await api.post<{ marked_read: number }>('/notifications/mark_all_read/');
  return response.data;
}

export async function fetchUnreadNotificationCount(): Promise<{ unread_count: number }> {
  const response = await api.get<{ unread_count: number }>('/notifications/unread_count/');
  return response.data;
}

// Watchlist
export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const response = await api.get<WatchlistItem[]>('/users/watchlist/');
  return response.data;
}

export async function addToWatchlist(symbol: string, tag: string = 'WATCHING', notes: string = ''): Promise<WatchlistItem> {
  const response = await api.post<WatchlistItem>('/users/watchlist/', { symbol, tag, notes });
  return response.data;
}

export async function updateWatchlistTag(itemId: number, tag: string): Promise<WatchlistItem> {
  const response = await api.post<WatchlistItem>(`/users/watchlist/${itemId}/update_tag/`, { tag });
  return response.data;
}

export async function removeFromWatchlist(itemId: number): Promise<void> {
  await api.delete(`/users/watchlist/${itemId}/`);
}

// Data Refresh
export async function refreshData(symbol?: string): Promise<{
  fetch: Record<string, { success: boolean; records?: number; error?: string }>;
  analysis: Record<string, { success: boolean; error?: string }>;
  alerts_created?: number;
}> {
  const response = await api.post('/refresh/', null, {
    params: symbol ? { symbol } : undefined,
  });
  return response.data;
}

// Backtest API
export interface BacktestAlertResult {
  period_days: number;
  total_alerts: number;
  by_type: Record<string, {
    total: number;
    breakouts: number;
    non_breakouts: number;
    pending: number;
    avg_move_pct: number;
  }>;
  by_stock: Record<string, {
    name: string;
    total: number;
    breakouts: number;
    non_breakouts: number;
    pending: number;
    avg_move_pct: number;
  }>;
  detailed_alerts: Array<{
    id: number;
    symbol: string;
    stock_name: string;
    alert_type: string;
    alert_type_display: string;
    message: string;
    created_at: string;
    status: 'BREAKOUT' | 'NO_BREAKOUT' | 'PENDING';
    price_at_alert: number | null;
    max_price_after: number | null;
    min_price_after: number | null;
    max_gain_pct: number | null;
    max_loss_pct: number | null;
    days_to_breakout: number | null;
    outcome_details: string;
  }>;
  summary: {
    total_breakouts: number;
    total_non_breakouts: number;
    pending_evaluation: number;
    win_rate: number;
    avg_gain_pct: number;
    avg_loss_pct: number;
    best_gain_pct: number;
    worst_loss_pct: number;
  };
}

export interface BacktestPatternResult {
  period_days: number;
  total_patterns: number;
  patterns: Array<{
    symbol: string;
    stock_name: string;
    start_date: string;
    tight_days: number;
    probability: string;
    confidence_score: number;
    price_at_start: number | null;
    max_price_after: number | null;
    max_gain_pct: number | null;
    days_to_max: number | null;
    had_breakout: boolean;
  }>;
  by_probability: Record<string, {
    total: number;
    breakouts: number;
    accuracy: number;
    avg_gain: number;
  }>;
  by_tight_days: Record<string, {
    total: number;
    breakouts: number;
    accuracy: number;
    avg_gain: number;
  }>;
  summary: {
    overall_accuracy: number;
    high_prob_accuracy: number;
    avg_days_to_breakout: number;
  };
}

export interface HistoricalDayResult {
  date: string;
  total_stocks?: number;
  consolidating?: number;
  high_probability?: number;
  error?: string;
  stocks: Array<{
    symbol: string;
    name: string;
    price: number | null;
    atr: number;
    daily_range: number;
    consecutive_tight_days: number;
    is_consolidating: boolean;
    volume_spike: boolean;
    breakout_probability: string;
    confidence_score: number;
    future_prices: Array<{
      date: string;
      close: number;
      change_pct: number;
    }>;
    max_future_gain: number;
  }>;
}

export async function fetchBacktestAlerts(days: number = 90): Promise<BacktestAlertResult> {
  const response = await api.get<BacktestAlertResult>('/backtest/alerts/', {
    params: { days },
  });
  return response.data;
}

export async function fetchBacktestPatterns(days: number = 90): Promise<BacktestPatternResult> {
  const response = await api.get<BacktestPatternResult>('/backtest/patterns/', {
    params: { days },
  });
  return response.data;
}

export async function fetchHistoricalDay(dateStr: string): Promise<HistoricalDayResult> {
  const response = await api.get<HistoricalDayResult>(`/backtest/day/${dateStr}/`);
  return response.data;
}

export async function fetchAvailableDates(): Promise<{ dates: string[] }> {
  const response = await api.get<{ dates: string[] }>('/backtest/dates/');
  return response.data;
}

// AI Optimization API
export interface AIRecommendation {
  category: string;
  content: string;
}

export interface AIOptimizationResult {
  success?: boolean;
  error?: string;
  period_days?: number;
  current_config?: {
    atr_period: number;
    consolidation_threshold_days: number;
    volume_spike_multiplier: number;
    volume_avg_period: number;
    breakout_threshold_pct: number;
  };
  performance_summary?: {
    alert_win_rate: number;
    pattern_accuracy: number;
    high_prob_accuracy: number;
    total_alerts: number;
    total_patterns: number;
    avg_gain: number;
    avg_loss: number;
  };
  ai_analysis?: string;
  recommendations?: AIRecommendation[];
  raw_data?: {
    by_probability: Record<string, any>;
    by_tight_days: Record<string, any>;
    by_alert_type: Record<string, any>;
  };
}

export interface AIQuickInsights {
  success?: boolean;
  error?: string;
  insights?: string;
  data_summary?: {
    overall_accuracy: number;
    high_prob_accuracy: number;
    total_patterns: number;
  };
}

export interface AISuggestion {
  parameter: string;
  current_value: any;
  suggested_value: any;
  reason: string;
  confidence: string;
}

export interface AISuggestResult {
  success?: boolean;
  error?: string;
  suggestions?: AISuggestion[];
  data_points_analyzed?: number;
}

export async function fetchAIOptimization(days: number = 90): Promise<AIOptimizationResult> {
  const response = await api.get<AIOptimizationResult>('/ai/optimize/', {
    params: { days },
  });
  return response.data;
}

export async function fetchAIQuickInsights(days: number = 30): Promise<AIQuickInsights> {
  const response = await api.get<AIQuickInsights>('/ai/insights/', {
    params: { days },
  });
  return response.data;
}

export async function fetchAISuggestions(): Promise<AISuggestResult> {
  const response = await api.get<AISuggestResult>('/ai/suggest/');
  return response.data;
}
