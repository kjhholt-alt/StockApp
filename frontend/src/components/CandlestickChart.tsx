// CandlestickChart component - displays OHLC candlesticks with volume bars
// Styled to match professional trading charts

import { useMemo, useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import type { PriceData } from '../types/stock';

type ChartPeriod = '20d' | '90d' | '180d' | '1y';

interface CandlestickChartProps {
  data: PriceData[];
  symbol: string;
  defaultPeriod?: ChartPeriod;
}

const PERIOD_DAYS: Record<ChartPeriod, number> = {
  '20d': 20,
  '90d': 90,
  '180d': 180,
  '1y': 365,
};

const PERIOD_LABELS: Record<ChartPeriod, string> = {
  '20d': '20 Days',
  '90d': '3 Months',
  '180d': '6 Months',
  '1y': '1 Year',
};

interface ChartDataPoint {
  date: string;
  formattedDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isGreen: boolean;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(1)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export function CandlestickChart({ data, symbol, defaultPeriod = '90d' }: CandlestickChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>(defaultPeriod);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const volumeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: ChartDataPoint | null;
  }>({ visible: false, x: 0, y: 0, data: null });

  // Process data
  const chartData = useMemo(() => {
    const days = PERIOD_DAYS[period];
    console.log('useMemo chartData: period=', period, 'days=', days, 'data.length=', data.length);
    const sliced = data.slice(0, Math.min(days, data.length)).reverse();
    return sliced.map((item) => ({
      date: item.date,
      formattedDate: format(parseISO(item.date), 'MM/dd'),
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
      volume: Number(item.volume),
      isGreen: Number(item.close) >= Number(item.open),
    }));
  }, [data, period]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const highs = chartData.map(d => d.high);
    const lows = chartData.map(d => d.low);
    const volumes = chartData.map(d => d.volume);
    const currentPrice = chartData[chartData.length - 1]?.close || 0;
    const periodHigh = Math.max(...highs);
    const periodLow = Math.min(...lows);
    const highIndex = chartData.findIndex(d => d.high === periodHigh);
    const lowIndex = chartData.findIndex(d => d.low === periodLow);

    return {
      currentPrice,
      periodHigh,
      periodLow,
      highIndex,
      lowIndex,
      highChangePercent: ((periodHigh - currentPrice) / currentPrice) * 100,
      lowChangePercent: ((periodLow - currentPrice) / currentPrice) * 100,
      maxVolume: Math.max(...volumes),
      avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
    };
  }, [chartData]);

  // Draw chart
  useEffect(() => {
    console.log('useEffect running: period=', period, 'chartData.length=', chartData.length);

    const canvas = canvasRef.current;
    const volumeCanvas = volumeCanvasRef.current;
    if (!canvas || !volumeCanvas || !chartData.length || !stats) {
      console.log('useEffect early return: canvas=', !!canvas, 'volumeCanvas=', !!volumeCanvas, 'chartData.length=', chartData.length, 'stats=', !!stats);
      return;
    }

    const ctx = canvas.getContext('2d');
    const volCtx = volumeCanvas.getContext('2d');
    if (!ctx || !volCtx) return;

    console.log('Drawing chart with', chartData.length, 'data points for period', period);

    // Get device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size - get dimensions first
    const rect = canvas.getBoundingClientRect();
    const volRect = volumeCanvas.getBoundingClientRect();

    // Skip if dimensions are 0 (canvas not yet laid out)
    if (rect.width === 0 || rect.height === 0) return;

    // Reset canvas dimensions (this clears the canvas and resets transform)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    volumeCanvas.width = volRect.width * dpr;
    volumeCanvas.height = volRect.height * dpr;

    // Reset transform and apply scaling
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    volCtx.setTransform(1, 0, 0, 1, 0, 0);
    volCtx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const volHeight = volRect.height;

    // Colors
    const greenColor = '#22c55e';
    const redColor = '#ef4444';
    const gridColor = '#374151';
    const textColor = '#9ca3af';
    const currentPriceColor = '#06b6d4';

    // Padding
    const paddingLeft = 60;
    const paddingRight = 80;
    const paddingTop = 40;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Price range with padding
    const priceRange = stats.periodHigh - stats.periodLow;
    const pricePadding = priceRange * 0.05;
    const minPrice = stats.periodLow - pricePadding;
    const maxPrice = stats.periodHigh + pricePadding;
    const priceScale = chartHeight / (maxPrice - minPrice);

    // Candle width
    const candleWidth = Math.max(2, Math.min(12, (chartWidth / chartData.length) * 0.7));
    const candleSpacing = chartWidth / chartData.length;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    volCtx.clearRect(0, 0, volRect.width, volHeight);

    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);

    // Horizontal grid lines (price levels)
    const priceStep = priceRange / 4;
    for (let i = 0; i <= 4; i++) {
      const price = minPrice + (priceStep * i);
      const y = paddingTop + chartHeight - ((price - minPrice) * priceScale);

      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Price label
      ctx.fillStyle = textColor;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(2), 5, y + 4);
    }

    // Draw candlesticks
    chartData.forEach((d, i) => {
      const x = paddingLeft + (i * candleSpacing) + (candleSpacing / 2);

      // Calculate Y positions
      const openY = paddingTop + chartHeight - ((d.open - minPrice) * priceScale);
      const closeY = paddingTop + chartHeight - ((d.close - minPrice) * priceScale);
      const highY = paddingTop + chartHeight - ((d.high - minPrice) * priceScale);
      const lowY = paddingTop + chartHeight - ((d.low - minPrice) * priceScale);

      const color = d.isGreen ? greenColor : redColor;

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Draw volume bar
      const volBarHeight = (d.volume / stats.maxVolume) * (volHeight - 10);
      volCtx.fillStyle = d.isGreen ? greenColor : redColor;
      volCtx.globalAlpha = 0.7;
      volCtx.fillRect(
        paddingLeft + (i * candleSpacing) + (candleSpacing - candleWidth) / 2,
        volHeight - volBarHeight,
        candleWidth,
        volBarHeight
      );
      volCtx.globalAlpha = 1;
    });

    // Draw current price line (dashed)
    const currentPriceY = paddingTop + chartHeight - ((stats.currentPrice - minPrice) * priceScale);
    ctx.strokeStyle = currentPriceColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, currentPriceY);
    ctx.lineTo(width - paddingRight, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label box
    ctx.fillStyle = currentPriceColor;
    const priceLabel = stats.currentPrice.toFixed(2);
    const labelWidth = ctx.measureText(priceLabel).width + 16;
    ctx.fillRect(width - paddingRight + 5, currentPriceY - 10, labelWidth, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(priceLabel, width - paddingRight + 13, currentPriceY + 4);

    // Draw period high annotation
    const highX = paddingLeft + (stats.highIndex * candleSpacing) + (candleSpacing / 2);
    const highY = paddingTop + chartHeight - ((stats.periodHigh - minPrice) * priceScale);

    ctx.fillStyle = textColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';

    // High price annotation
    ctx.beginPath();
    ctx.arc(highX, highY - 15, 3, 0, Math.PI * 2);
    ctx.fillStyle = greenColor;
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(stats.periodHigh.toFixed(2), highX, highY - 25);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = greenColor;
    ctx.fillText(`+${stats.highChangePercent.toFixed(2)}%`, highX + 50, highY - 25);

    // Low price annotation
    const lowX = paddingLeft + (stats.lowIndex * candleSpacing) + (candleSpacing / 2);
    const lowY = paddingTop + chartHeight - ((stats.periodLow - minPrice) * priceScale);

    ctx.beginPath();
    ctx.arc(lowX, lowY + 15, 3, 0, Math.PI * 2);
    ctx.fillStyle = redColor;
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(stats.periodLow.toFixed(2), lowX, lowY + 30);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = redColor;
    ctx.fillText(`${stats.lowChangePercent.toFixed(2)}%`, lowX + 50, lowY + 30);

    // Draw X-axis date labels
    ctx.fillStyle = textColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    const labelInterval = Math.max(1, Math.floor(chartData.length / 6));
    chartData.forEach((d, i) => {
      if (i % labelInterval === 0 || i === chartData.length - 1) {
        const x = paddingLeft + (i * candleSpacing) + (candleSpacing / 2);
        ctx.fillText(d.formattedDate, x, height - 5);
      }
    });
  }, [chartData, stats, period]);

  // Mouse handlers for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData.length || !stats) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const paddingLeft = 60;
    const paddingRight = 80;
    const chartWidth = rect.width - paddingLeft - paddingRight;
    const candleSpacing = chartWidth / chartData.length;

    const index = Math.floor((x - paddingLeft) / candleSpacing);

    if (index >= 0 && index < chartData.length) {
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        data: chartData[index],
      });
    } else {
      setTooltip({ visible: false, x: 0, y: 0, data: null });
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, data: null });
  };

  if (!chartData.length) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center text-gray-500">
        No price data available
      </div>
    );
  }

  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];
  const priceChange = latestData && previousData ? latestData.close - previousData.close : 0;
  const priceChangePercent = previousData ? (priceChange / previousData.close) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {symbol}
          </h3>
          <p className="text-xs text-gray-500">{PERIOD_LABELS[period]} Chart</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Period Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700 relative z-10">
            {(Object.keys(PERIOD_DAYS) as ChartPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  console.log('Button clicked, changing period from', period, 'to', p);
                  setPeriod(p);
                }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {p === '1y' ? '1Y' : p.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              ${latestData?.close.toFixed(2)}
            </div>
            <div className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="relative">
        <canvas
          key={`price-${period}`}
          ref={canvasRef}
          className="w-full block"
          style={{ height: '350px', width: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip */}
        {tooltip.visible && tooltip.data && (
          <div
            className="absolute pointer-events-none bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 z-10"
            style={{
              left: Math.min(tooltip.x + 10, canvasRef.current?.clientWidth ? canvasRef.current.clientWidth - 150 : tooltip.x),
              top: tooltip.y - 80,
            }}
          >
            <div className="text-xs text-gray-400 mb-1">{tooltip.data.formattedDate}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-gray-500">O:</span>
              <span className="text-white font-medium">${tooltip.data.open.toFixed(2)}</span>
              <span className="text-gray-500">H:</span>
              <span className="text-green-400 font-medium">${tooltip.data.high.toFixed(2)}</span>
              <span className="text-gray-500">L:</span>
              <span className="text-red-400 font-medium">${tooltip.data.low.toFixed(2)}</span>
              <span className="text-gray-500">C:</span>
              <span className={`font-medium ${tooltip.data.isGreen ? 'text-green-400' : 'text-red-400'}`}>
                ${tooltip.data.close.toFixed(2)}
              </span>
              <span className="text-gray-500">Vol:</span>
              <span className="text-white font-medium">{formatVolume(tooltip.data.volume)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Volume Chart */}
      <div className="mt-1 border-t border-gray-700 pt-1">
        <canvas
          key={`volume-${period}`}
          ref={volumeCanvasRef}
          className="w-full block"
          style={{ height: '60px', width: '100%' }}
        />
      </div>

      {/* Stats Footer */}
      <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-4 gap-4 text-xs">
        <div className="text-center">
          <div className="text-gray-500">Period High</div>
          <div className="font-semibold text-green-400">${stats?.periodHigh.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Period Low</div>
          <div className="font-semibold text-red-400">${stats?.periodLow.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Avg Volume</div>
          <div className="font-semibold text-gray-300">{formatVolume(stats?.avgVolume || 0)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Latest Volume</div>
          <div className={`font-semibold ${(latestData?.volume || 0) > (stats?.avgVolume || 0) ? 'text-purple-400' : 'text-gray-300'}`}>
            {formatVolume(latestData?.volume || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
