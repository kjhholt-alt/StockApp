// AlertList component - displays alerts with filtering

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { Alert, AlertType } from '../types/stock';
import { markAlertRead, markAllAlertsRead } from '../api/stockApi';

interface AlertListProps {
  alerts: Alert[];
  onRefresh: () => void;
}

export function AlertList({ alerts, onRefresh }: AlertListProps) {
  const [filter, setFilter] = useState<AlertType | 'ALL'>('ALL');

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'BREAKOUT_READY':
        return '🚀';
      case 'VOLUME_SPIKE':
        return '📈';
      case 'CONSOLIDATION_START':
        return '📊';
      case 'BREAKOUT_OCCURRED':
        return '🎯';
      default:
        return '📢';
    }
  };

  const getAlertColor = (type: AlertType) => {
    switch (type) {
      case 'BREAKOUT_READY':
        return 'border-l-red-500 bg-red-50';
      case 'VOLUME_SPIKE':
        return 'border-l-purple-500 bg-purple-50';
      case 'CONSOLIDATION_START':
        return 'border-l-amber-500 bg-amber-50';
      case 'BREAKOUT_OCCURRED':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const handleMarkRead = async (alertId: number) => {
    await markAlertRead(alertId);
    onRefresh();
  };

  const handleMarkAllRead = async () => {
    await markAllAlertsRead();
    onRefresh();
  };

  const filteredAlerts =
    filter === 'ALL'
      ? alerts
      : alerts.filter((alert) => alert.alert_type === filter);

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Alerts
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'BREAKOUT_READY', 'VOLUME_SPIKE', 'CONSOLIDATION_START'] as const).map(
            (type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`
                  px-3 py-1 text-xs rounded-full border transition-colors
                  ${
                    filter === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }
                `}
              >
                {type === 'ALL' ? 'All' : type.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Alert list */}
      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No alerts to display</div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`
                p-4 border-l-4 transition-colors cursor-pointer
                ${getAlertColor(alert.alert_type)}
                ${alert.is_read ? 'opacity-60' : ''}
              `}
              onClick={() => !alert.is_read && handleMarkRead(alert.id)}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{getAlertIcon(alert.alert_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-gray-900">
                        {alert.symbol}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {alert.alert_type_display}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(parseISO(alert.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
