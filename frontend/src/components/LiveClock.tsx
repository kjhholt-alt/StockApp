// LiveClock component - subtle real-time clock to show data freshness

import { useState, useEffect } from 'react';

interface LiveClockProps {
  className?: string;
  showSeconds?: boolean;
  showDate?: boolean;
}

export function LiveClock({ className = '', showSeconds = true, showDate = false }: LiveClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = () => {
    const hours = time.getHours();
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = (hours % 12 || 12).toString();

    if (showSeconds) {
      return `${displayHours}:${minutes}:${seconds} ${ampm}`;
    }
    return `${displayHours}:${minutes} ${ampm}`;
  };

  const formatDate = () => {
    return time.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      {/* Pulsing dot indicator */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>

      <div className="font-mono">
        {showDate && (
          <span className="text-gray-400 mr-2">{formatDate()}</span>
        )}
        <span className="text-gray-500 dark:text-gray-400">{formatTime()}</span>
      </div>
    </div>
  );
}
