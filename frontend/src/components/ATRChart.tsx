// ATRChart component - visualizes ATR and daily range data

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { PriceData } from '../types/stock';

interface ATRChartProps {
  data: PriceData[];
  symbol: string;
}

export function ATRChart({ data, symbol }: ATRChartProps) {
  // Reverse to show oldest first
  const chartData = [...data].reverse().map((item) => ({
    date: item.date,
    formattedDate: format(parseISO(item.date), 'MMM d'),
    atr: item.atr_14 ? Number(item.atr_14) : null,
    dailyRange: item.daily_range ? Number(item.daily_range) : null,
    close: Number(item.close),
  }));

  // Calculate if currently tight (last day's range <= ATR)
  const latestData = chartData[chartData.length - 1];
  const isTight = latestData?.dailyRange && latestData?.atr
    ? latestData.dailyRange <= latestData.atr
    : false;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {symbol} - ATR Analysis
        </h3>
        <span
          className={`
            px-3 py-1 text-sm font-medium rounded-full
            ${isTight ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}
          `}
        >
          {isTight ? 'Tight Range' : 'Normal Range'}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#9ca3af' }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#9ca3af' }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => [
              `$${value.toFixed(2)}`,
              name === 'atr' ? 'ATR (14)' : 'Daily Range',
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="atr"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="ATR (14)"
          />
          <Line
            type="monotone"
            dataKey="dailyRange"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="Daily Range"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="text-gray-500">Current ATR</div>
          <div className="font-semibold text-blue-600">
            ${latestData?.atr?.toFixed(2) || '-'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Today's Range</div>
          <div className="font-semibold text-amber-600">
            ${latestData?.dailyRange?.toFixed(2) || '-'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Close Price</div>
          <div className="font-semibold text-gray-900">
            ${latestData?.close?.toFixed(2) || '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
