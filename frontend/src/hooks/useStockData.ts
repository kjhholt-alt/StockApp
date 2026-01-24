// Custom hooks for stock data fetching

import { useState, useEffect, useCallback } from 'react';
import {
  fetchDashboard,
  fetchAlerts,
  fetchNotifications,
  fetchUnreadAlertCount,
  refreshData,
} from '../api/stockApi';
import type { DashboardSummary, Alert, Notification } from '../types/stock';

export function useDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboard = await fetchDashboard();
      setData(dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}

export function useAlerts(initialUnreadOnly = false) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(initialUnreadOnly);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = unreadOnly ? { is_read: false } : undefined;
      const data = await fetchAlerts(params);
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return { alerts, loading, error, refresh: load, unreadOnly, setUnreadOnly };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [notifData, countData] = await Promise.all([
        fetchNotifications(),
        fetchUnreadAlertCount(),
      ]);
      setNotifications(notifData);
      setUnreadCount(countData.unread_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { notifications, unreadCount, loading, error, refresh: load };
}

export function useRefreshData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    fetch: Record<string, { success: boolean }>;
    analysis: Record<string, { success: boolean }>;
    alerts_created?: number;
  } | null>(null);

  const refresh = useCallback(async (symbol?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await refreshData(symbol);
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { refresh, loading, error, result };
}
