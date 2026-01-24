// NotificationBell component - notification icon with dropdown

import { useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import type { Notification } from '../types/stock';
import { markNotificationRead, markAllNotificationsRead } from '../api/stockApi';

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onRefresh: () => void;
}

export function NotificationBell({
  notifications,
  unreadCount,
  onRefresh,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ALERT':
        return '🚨';
      case 'WARNING':
        return '⚠️';
      case 'SUCCESS':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id);
    onRefresh();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    onRefresh();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h4 className="font-semibold text-gray-900">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && handleMarkRead(notification.id)}
                  className={`
                    p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50
                    ${notification.is_read ? 'opacity-60' : 'bg-blue-50'}
                  `}
                >
                  <div className="flex gap-2">
                    <span>{getNotificationIcon(notification.notification_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                          {format(parseISO(notification.created_at), 'h:mm a')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="p-2 text-center border-t border-gray-200">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
