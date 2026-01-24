// Stock Types for Stock Breakout Alert System

export type StockType = 'MAG7' | 'INDEX';
export type BreakoutProbability = 'LOW' | 'MEDIUM' | 'HIGH';
export type AlertType = 'CONSOLIDATION_START' | 'VOLUME_SPIKE' | 'BREAKOUT_READY' | 'BREAKOUT_OCCURRED';
export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT';
export type WatchlistTag = 'WATCHING' | 'SETTING_UP' | 'BREAKING_OUT' | 'POSITION' | 'AVOID';

export interface Stock {
  id: number;
  symbol: string;
  name: string;
  stock_type: StockType;
  is_active: boolean;
  next_earnings_date: string | null;
  earnings_time: string | null;
  days_until_earnings: number | null;
  created_at: string;
  updated_at: string;
}

export interface PriceData {
  id: number;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  true_range: number | null;
  atr_14: number | null;
  daily_range: number | null;
}

export interface ATRAnalysis {
  id: number;
  symbol: string;
  stock_name: string;
  date: string;
  current_atr: number;
  current_daily_range: number;
  consecutive_tight_days: number;
  avg_volume_20d: number | null;
  current_volume: number | null;
  volume_ratio: number | null;
  rvol_display: string | null;
  is_consolidating: boolean;
  volume_spike_detected: boolean;
  breakout_probability: BreakoutProbability;
  confidence_score: number;
  range_tightness_pct: number | null;
  price_at_analysis: number;
  created_at: string;
}

export interface Alert {
  id: number;
  symbol: string;
  stock_name: string;
  alert_type: AlertType;
  alert_type_display: string;
  message: string;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  notification_type_display: string;
  stock_symbol: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStock {
  id: number;
  symbol: string;
  name: string;
  stock_type: StockType;
  current_price: number | null;
  price_change: number | null;
  price_change_percent: number | null;
  atr: number | null;
  daily_range: number | null;
  consecutive_tight_days: number;
  is_consolidating: boolean;
  volume_spike: boolean;
  breakout_probability: BreakoutProbability;
  confidence_score: number;
  rvol_display: string | null;
  range_tightness_pct: number | null;
  next_earnings_date: string | null;
  days_until_earnings: number | null;
}

export interface DashboardSummary {
  total_stocks: number;
  consolidating_count: number;
  high_probability_count: number;
  unread_alerts: number;
  stocks: DashboardStock[];
}

export interface AlertSummary {
  total: number;
  unread: number;
  by_type: Record<AlertType, number>;
}

export interface StockDetail extends Stock {
  latest_price: PriceData | null;
  latest_analysis: ATRAnalysis | null;
  recent_alerts: Alert[];
}

// User types
export interface UserProfile {
  display_name: string;
  theme: 'light' | 'dark';
  email_alerts: boolean;
  alert_on_consolidation: boolean;
  alert_on_volume_spike: boolean;
  alert_on_breakout: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  profile: UserProfile;
}

export interface AuthState {
  authenticated: boolean;
  user: User | null;
}

export interface WatchlistItem {
  id: number;
  symbol: string;
  stock_name: string;
  tag: WatchlistTag;
  tag_display: string;
  notes: string;
  custom_tight_days_threshold: number | null;
  custom_volume_spike_threshold: number | null;
  created_at: string;
  updated_at: string;
}
