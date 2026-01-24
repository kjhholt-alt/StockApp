# Stock Breakout Alert System

A Django + React web application that monitors Mag 7 stocks and key indices for tight ATR consolidation patterns that often precede breakouts.

## Features

- **Real-time Stock Monitoring**: Track AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA, SPY, QQQ, IWM
- **ATR Consolidation Detection**: Identifies stocks with daily ranges consistently below ATR
- **Volume Spike Alerts**: Detects unusual volume during consolidation periods
- **Breakout Probability**: LOW, MEDIUM, HIGH ratings based on pattern analysis
- **Email Notifications**: Configurable alerts sent to your inbox
- **Clean Dashboard**: Visual overview of all tracked stocks and their status

## Quick Start

### Development Setup

1. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Initialize database
python manage.py migrate
python manage.py seed_stocks

# Fetch initial data
python manage.py fetch_prices
python manage.py analyze_stocks

# Run server
python manage.py runserver
```

2. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

3. **Open http://localhost:5173** in your browser

### Docker Setup (Recommended for Production)

```bash
# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## How It Works

### ATR Consolidation Detection

The system identifies stocks in "tight" consolidation by comparing daily price ranges to the Average True Range (ATR):

1. **ATR Calculation**: 14-day Exponential Moving Average of True Range
2. **Consolidation Detection**: 3+ consecutive days with daily range ≤ ATR
3. **Volume Analysis**: Track 20-day average volume, detect spikes > 1.5x
4. **Breakout Probability**:
   - **LOW**: < 3 consecutive tight days
   - **MEDIUM**: 3+ tight days, no volume spike
   - **HIGH**: 3+ tight days WITH volume spike

### Scheduled Tasks

- **6:00 PM ET**: Fetch daily prices from Yahoo Finance
- **6:15 PM ET**: Run consolidation analysis
- **Every 30 min**: Send pending alert emails

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/` | Dashboard summary |
| GET | `/api/stocks/` | All tracked stocks |
| GET | `/api/stocks/{symbol}/` | Stock details |
| GET | `/api/stocks/{symbol}/analysis/` | ATR analysis |
| GET | `/api/alerts/` | All alerts |
| POST | `/api/refresh/` | Trigger data refresh |

## Management Commands

```bash
# Fetch stock prices
python manage.py fetch_prices --days 60

# Run analysis
python manage.py analyze_stocks

# Seed stock data
python manage.py seed_stocks
```

## Configuration

See `.env.example` for all configuration options including:
- Database settings (PostgreSQL or SQLite)
- Email/SMTP configuration
- Redis/Celery settings

## Tech Stack

- **Backend**: Django 5.x, Django REST Framework, Celery
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Data**: Yahoo Finance (yfinance)
- **Database**: PostgreSQL (production) / SQLite (development)
- **Task Queue**: Redis + Celery

## License

MIT
