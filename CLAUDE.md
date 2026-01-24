# Stock Breakout Alert System

## Project Overview
A Django + React web application that monitors Mag 7 stocks and key indices for tight ATR consolidation patterns that often precede breakouts.

## Tracked Symbols
- **Mag 7**: AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA
- **Indices**: SPY, QQQ, IWM

## Tech Stack
- **Backend**: Django 5.x + Django REST Framework + Celery
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Database**: PostgreSQL (production) / SQLite (development)
- **Data Source**: Yahoo Finance (yfinance library)
- **Task Queue**: Redis + Celery
- **Email**: Django email backend (configurable SMTP)

## Core Algorithm: ATR Consolidation Detection

The system identifies stocks in "tight" consolidation by comparing daily price ranges to the Average True Range (ATR):

1. **ATR Calculation**: 14-day Exponential Moving Average of True Range
   - True Range = max(high-low, |high-prev_close|, |low-prev_close|)

2. **Consolidation Detection**:
   - A "tight day" = daily range (high-low) ≤ ATR
   - Consolidation = 3+ consecutive tight days

3. **Volume Analysis**:
   - Track 20-day average volume
   - Volume spike = current volume > 1.5x average

4. **Breakout Probability**:
   - **LOW**: < 3 consecutive tight days
   - **MEDIUM**: 3+ tight days, no volume spike
   - **HIGH**: 3+ tight days WITH volume spike (breakout imminent)

## Key Files

### Backend
- `backend/config/settings.py` - Django settings, tracked symbols config
- `backend/stocks/models.py` - Stock, PriceData, ATRAnalysis, Alert models
- `backend/stocks/services/data_fetcher.py` - Yahoo Finance integration
- `backend/stocks/services/atr_calculator.py` - ATR & consolidation logic
- `backend/stocks/services/alert_service.py` - Alert generation & email

### Frontend
- `frontend/src/components/Dashboard.tsx` - Main dashboard view
- `frontend/src/components/StockCard.tsx` - Individual stock display
- `frontend/src/components/ATRChart.tsx` - ATR visualization
- `frontend/src/components/AlertList.tsx` - Alert notifications

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stocks/` | List all tracked stocks with latest analysis |
| GET | `/api/stocks/{symbol}/` | Detailed stock data with price history |
| GET | `/api/stocks/{symbol}/analysis/` | ATR analysis for specific stock |
| GET | `/api/alerts/` | All alerts (filterable by read/unread) |
| POST | `/api/alerts/{id}/read/` | Mark alert as read |
| GET | `/api/notifications/` | In-app notifications |
| GET | `/api/dashboard/` | Dashboard summary |

## Scheduled Tasks (Celery)
1. **fetch_daily_prices** - 6 PM ET daily (after market close)
2. **run_consolidation_analysis** - 6:15 PM ET (after price fetch)
3. **send_alert_emails** - Every 30 minutes

## Running the Project

### Development
```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up -d
```

## Management Commands
```bash
# Fetch latest prices
python manage.py fetch_prices

# Run analysis
python manage.py analyze_stocks

# Seed initial stock data
python manage.py seed_stocks
```

## Environment Variables
See `.env.example` for required configuration:
- `SECRET_KEY` - Django secret key
- `DATABASE_URL` - PostgreSQL connection (optional, uses SQLite if not set)
- `CELERY_BROKER_URL` - Redis URL
- `EMAIL_HOST_*` - SMTP configuration
- `ALERT_RECIPIENT_EMAIL` - Email to receive alerts

## Future Enhancements

### Quick Wins (High Value, Low Effort)
- [ ] **Relative Volume (RVOL)** - Show "150% of avg" instead of raw spike detection
- [ ] **Intraday Range Highlighting** - Color-code when within bottom quartile of ATR
- [ ] **Earnings Calendar Integration** - Display upcoming earnings dates on watchlist
- [ ] **Watchlist Tags** - Color-coded labels: "Setting Up", "Breaking Out", "False Breakout"

### High Impact Features
- [ ] **Auto Support/Resistance Detection** - AI-powered key price level identification
- [ ] **Multi-Timeframe Analysis** - Confirm breakouts on 5min/15min/hourly/daily
- [ ] **Custom Alert Severity** - Critical/Warning/Info levels with quiet hours
- [ ] **Breakout Confidence Score** - 0-100 composite score explaining the rating

### Medium Priority
- [ ] **Bollinger Bands + MACD** - Additional indicators to complement ATR
- [ ] **SMS + Push Notifications** - Beyond email for faster alerts
- [ ] **Performance Tracking** - Track which alerts led to profitable moves
- [ ] **Volume Profile Visualization** - Show volume at different price levels
- [ ] **Chart Pattern Recognition** - Detect wedges, triangles, head-and-shoulders

### Platform Features
- [ ] Real-time price updates via WebSocket
- [ ] User authentication & personal watchlists
- [ ] Backtesting for strategy validation
- [ ] Community signal sharing (optional social layer)
