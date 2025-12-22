# o2 Trading Bot

A browser-based automated trading bot for o2 Exchange (orderbook DEX) on Fuel Network. This bot runs entirely client-side with local wallet storage, multiple market support, and real-time order management.

## Features

- **Multi-Wallet Support**: Connect with Fuel Wallet, Fuelet, Bako Safe, and more
- **Session-Based Trading**: Secure session management for automated order execution
- **Market Making Strategies**: Automated market making with configurable spreads
- **Balance Threshold Strategies**: Trigger orders based on balance thresholds
- **Real-Time Order Management**: Monitor and manage open orders
- **Trade History**: Track all trades with detailed history
- **No Server Required**: Everything runs in your browser

## Getting Started

### Prerequisites

- Node.js v20+ installed
- A Fuel wallet (Fuel Wallet, Fuelet, or Bako Safe)
- A funded trading account on o2 Exchange

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3001`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

### First Time Setup

1. **Connect Your Wallet**
   - Click "Connect" and select your Fuel wallet
   - Authorize the connection in your wallet

2. **Create Trading Account**
   - The bot will automatically create a trading account if one doesn't exist
   - Note your trading account ID

3. **Check Eligibility**
   - The bot will check if you're whitelisted or have an invite code
   - If not eligible, visit o2.app to get access

4. **Deposit Funds**
   - Click "Deposit Funds on o2.app" to fund your trading account
   - You need both base and quote tokens for the markets you want to trade

5. **Configure Strategies**
   - Go to "Strategies" tab
   - Select a market and strategy type
   - Configure strategy parameters
   - Save configuration

6. **Start Trading**
   - Go to "Dashboard" tab
   - Click "Start Trading"
   - Monitor your orders and trades in real-time

## Trading Strategies

### Market Making Strategy

Places buy and sell orders around the current market price to capture the spread.

- **Spread Percent**: The percentage spread around market price (e.g., 1% = 0.5% below and 0.5% above)
- **Order Size USD**: The USD value of each order
- **Rebalance Threshold**: When to rebalance inventory

### Balance Threshold Strategy

Places orders when balance exceeds configured thresholds.

- **Base Threshold**: Trigger sell orders when base balance exceeds this
- **Quote Threshold**: Trigger buy orders when quote balance exceeds this

## Project Structure

```
src/
├── components/          # React UI components
│   ├── Dashboard.tsx   # Main trading interface
│   ├── WalletConnect.tsx # Wallet connection
│   ├── TradingAccount.tsx # Account management
│   ├── EligibilityCheck.tsx # Access verification
│   ├── MarketSelector.tsx # Market selection
│   ├── StrategyConfig.tsx # Strategy configuration
│   ├── OrderHistory.tsx # Open orders
│   ├── TradeHistory.tsx # Trade history
│   └── Settings.tsx     # Bot settings
├── services/           # Business logic services
│   ├── walletService.ts # Wallet management
│   ├── tradingAccountService.ts # Account operations
│   ├── eligibilityService.ts # Access verification
│   ├── sessionService.ts # Session management
│   ├── marketService.ts # Market data
│   ├── orderService.ts # Order operations
│   ├── balanceService.ts # Balance tracking
│   ├── tradingEngine.ts # Trading execution
│   ├── strategyService.ts # Strategy factory
│   └── o2ApiService.ts # o2 API client
├── strategies/         # Trading strategies
│   ├── baseStrategy.ts
│   ├── marketMakingStrategy.ts
│   └── balanceThresholdStrategy.ts
└── types/              # TypeScript definitions
```

## Security

- Session keys are encrypted and stored locally
- Private keys never leave your browser
- All data stays on your device
- Session expiry management (30 days default)

## Development

This project uses:
- React 18
- TypeScript
- Vite
- Fuel SDK
- Dexie (IndexedDB)

## License

Private - For internal use only

