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
} from '../types/stock';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard
export async function fetchDashboard(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>('/dashboard/');
  return response.data;
}

// Stocks
export async function fetchStocks(): Promise<StockDetail[]> {
  const response = await api.get<StockDetail[]>('/stocks/');
  return response.data;
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

// Alerts
export async function fetchAlerts(params?: {
  is_read?: boolean;
  type?: string;
  symbol?: string;
}): Promise<Alert[]> {
  const response = await api.get<Alert[]>('/alerts/', { params });
  return response.data;
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
  const response = await api.get<Notification[]>('/notifications/', { params });
  return response.data;
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
