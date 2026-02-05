// MarketStatus component - shows if market is open/closed with countdown

import { useState, useEffect } from 'react';

type MarketState = 'pre-market' | 'open' | 'after-hours' | 'closed';

interface MarketInfo {
  state: MarketState;
  label: string;
  color: string;
  nextEvent: string;
  countdown: string;
}

export function MarketStatus() {
  const [marketInfo, setMarketInfo] = useState<MarketInfo>(getMarketInfo());

  useEffect(() => {
    // Update every second for countdown
    const interval = setInterval(() => {
      setMarketInfo(getMarketInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
      {/* Status Indicator Dot */}
      <span
        className={`w-2 h-2 rounded-full ${
          marketInfo.state === 'open'
            ? 'bg-green-500 animate-pulse'
            : marketInfo.state === 'pre-market' || marketInfo.state === 'after-hours'
            ? 'bg-yellow-500'
            : 'bg-red-500'
        }`}
      />

      {/* Status Label */}
      <div className="text-sm">
        <span className={`font-medium ${marketInfo.color}`}>
          {marketInfo.label}
        </span>
        {marketInfo.countdown && (
          <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
            {marketInfo.nextEvent}: {marketInfo.countdown}
          </span>
        )}
      </div>
    </div>
  );
}

function getMarketInfo(): MarketInfo {
  const now = new Date();

  // Convert to Eastern Time
  const etOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short',
  };

  const etFormatter = new Intl.DateTimeFormat('en-US', etOptions);
  const parts = etFormatter.formatToParts(now);

  const weekday = parts.find(p => p.type === 'weekday')?.value || '';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

  const currentMinutes = hour * 60 + minute;

  // Market hours in minutes from midnight (ET)
  const preMarketOpen = 4 * 60;      // 4:00 AM
  const marketOpen = 9 * 60 + 30;    // 9:30 AM
  const marketClose = 16 * 60;        // 4:00 PM
  const afterHoursClose = 20 * 60;    // 8:00 PM

  // Weekend check
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  if (isWeekend) {
    // Calculate time until Monday 9:30 AM
    const daysUntilMonday = weekday === 'Sat' ? 2 : 1;
    const secondsUntilOpen =
      daysUntilMonday * 24 * 60 * 60 +
      (marketOpen * 60 - (currentMinutes * 60 + second));

    return {
      state: 'closed',
      label: 'Market Closed',
      color: 'text-red-600 dark:text-red-400',
      nextEvent: 'Opens',
      countdown: formatCountdown(secondsUntilOpen),
    };
  }

  // Pre-market: 4:00 AM - 9:30 AM ET
  if (currentMinutes >= preMarketOpen && currentMinutes < marketOpen) {
    const secondsUntilOpen = (marketOpen - currentMinutes) * 60 - second;
    return {
      state: 'pre-market',
      label: 'Pre-Market',
      color: 'text-yellow-600 dark:text-yellow-400',
      nextEvent: 'Opens',
      countdown: formatCountdown(secondsUntilOpen),
    };
  }

  // Market Open: 9:30 AM - 4:00 PM ET
  if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
    const secondsUntilClose = (marketClose - currentMinutes) * 60 - second;
    return {
      state: 'open',
      label: 'Market Open',
      color: 'text-green-600 dark:text-green-400',
      nextEvent: 'Closes',
      countdown: formatCountdown(secondsUntilClose),
    };
  }

  // After Hours: 4:00 PM - 8:00 PM ET
  if (currentMinutes >= marketClose && currentMinutes < afterHoursClose) {
    const secondsUntilClose = (afterHoursClose - currentMinutes) * 60 - second;
    return {
      state: 'after-hours',
      label: 'After Hours',
      color: 'text-yellow-600 dark:text-yellow-400',
      nextEvent: 'Ends',
      countdown: formatCountdown(secondsUntilClose),
    };
  }

  // Closed: before 4 AM or after 8 PM
  let secondsUntilPreMarket: number;
  if (currentMinutes < preMarketOpen) {
    // Before pre-market opens
    secondsUntilPreMarket = (preMarketOpen - currentMinutes) * 60 - second;
  } else {
    // After after-hours close, calculate until next day pre-market
    secondsUntilPreMarket = ((24 * 60 - currentMinutes) + preMarketOpen) * 60 - second;
  }

  // Check if tomorrow is a weekend
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short'
  });

  if (tomorrowDay === 'Sat') {
    // Add 2 days for weekend
    secondsUntilPreMarket += 2 * 24 * 60 * 60;
  } else if (tomorrowDay === 'Sun') {
    secondsUntilPreMarket += 24 * 60 * 60;
  }

  return {
    state: 'closed',
    label: 'Market Closed',
    color: 'text-red-600 dark:text-red-400',
    nextEvent: 'Pre-market',
    countdown: formatCountdown(secondsUntilPreMarket),
  };
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds < 0) return '';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}
