# O2 Trading Bot

A browser-based automated trading bot for O2 Exchange (orderbook DEX) on Fuel Network. This bot runs entirely client-side with no server required - your keys never leave your browser.

> **Warning**: This software is highly experimental and in beta. Use at your own risk. Only trade with funds you can afford to lose.

## Features

- **Multi-Wallet Support**: Connect with Fuel wallets (Fuel Wallet, Fuelet, Bako Safe) or Ethereum wallets (Base, Mainnet)
- **Session-Based Trading**: Secure session keys enable automated trading without exposing your main wallet
- **Strategy Presets**: Choose from Simple, Volume Maximizing, Profit Taking, or fully Custom strategies
- **Configurable Orders**: Market or limit orders with flexible price modes and spread management
- **Position Sizing**: Percentage-based or fixed USD amount per trade
- **Risk Management**: Take profit, stop loss, order timeout, and max daily loss controls
- **Real-Time P&L**: Accurate profit/loss tracking with fee accounting
- **Multi-Market Trading**: Run strategies across multiple markets simultaneously
- **Trade Console**: Live execution logs with simple or debug verbosity modes
- **In-App Deposits**: Deposit funds directly from Fuel or Ethereum wallets
- **Competition Integration**: Leaderboard tracking for trading competitions
- **No Server Required**: Everything runs in your browser with local storage

## Getting Started

### Prerequisites

- Node.js v20+ (or v22/v24)
- A Fuel wallet (Fuel Wallet, Fuelet, or Bako Safe) or Ethereum wallet
- Funds to deposit into your O2 trading account

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

### First Time Setup

1. **Connect Your Wallet**
   - Click "Connect Wallet" and select your preferred wallet
   - Authorize the connection in your wallet extension

2. **Create/Select Trading Account**
   - The bot will detect existing trading accounts or help you create one
   - Your trading account is separate from your main wallet for security

3. **Create a Session**
   - Set a password to encrypt your session key
   - Sign the session creation message in your wallet
   - Sessions enable automated trading without repeated wallet approvals

4. **Deposit Funds**
   - Click "Deposit" to open the deposit dialog
   - Choose to deposit from your Fuel wallet or bridge from Ethereum
   - You need both base and quote tokens for the markets you want to trade

5. **Configure Strategy**
   - Select a market from the market selector
   - Choose a strategy preset or customize your own settings
   - Adjust risk management parameters as needed

6. **Start Trading**
   - Click "Start Trading" on the dashboard
   - Monitor execution in the Trade Console
   - View open orders, balances, and trade history in real-time

## Trading Strategies

### Strategy Presets

| Preset | Description | Best For |
|--------|-------------|----------|
| **Simple** | Balanced trading with profit protection. Only sells above average buy price. | General use |
| **Volume Maximizing** | Maximum volume focus with no profit constraints and faster cycles. | Competition volume |
| **Profit Taking** | Ensures minimum 0.1% profit per trade with order timeout protection. | Profit-focused |
| **Custom** | Full control over all strategy settings. | Advanced users |

### Strategy Configuration

#### Order Configuration
- **Order Type**: Market (immediate execution) or Spot/Limit (price-specified)
- **Price Mode**: Offset from mid-price, best bid/ask, or market price
- **Price Offset**: Percentage offset from reference price
- **Max Spread**: Skip trading if bid-ask spread exceeds threshold
- **Order Side**: Buy only, Sell only, or Both

#### Position Sizing
- **Size Mode**: Percentage of balance or fixed USD amount
- **Balance Percentage**: Separate settings for base (sell) and quote (buy) orders
- **Min/Max Order Size**: Constraints on individual order sizes

#### Order Management
- **Only Sell Above Buy Price**: Prevent selling at a loss
- **Max Open Orders**: Limit concurrent orders per side

#### Risk Management
- **Take Profit %**: Minimum profit margin (default covers trading fees)
- **Stop Loss**: Emergency exit if price drops below average buy by X%
- **Order Timeout**: Auto-cancel unfilled orders after N minutes
- **Max Daily Loss**: Pause trading if losses exceed threshold

#### Timing
- **Cycle Interval**: Randomized delay between order cycles (min/max ms)

## Project Structure

```
src/
├── components/          # React UI components
│   ├── Dashboard.tsx    # Main trading interface
│   ├── WalletConnect.tsx # Wallet connection
│   ├── StrategyConfig.tsx # Strategy configuration
│   ├── TradeConsole.tsx # Live execution logs
│   ├── OpenOrdersPanel.tsx # Open orders display
│   ├── TradeHistory.tsx # Trade history
│   ├── Balances.tsx     # Balance display
│   ├── DepositDialog/   # Deposit flow
│   └── ...              # 40+ more components
├── services/            # Business logic
│   ├── tradingEngine.ts # Main orchestration
│   ├── unifiedStrategyExecutor.ts # Strategy execution
│   ├── orderService.ts  # Order operations
│   ├── sessionService.ts # Session management
│   ├── balanceService.ts # Balance tracking
│   ├── o2ApiService.ts  # O2 API client
│   └── ...              # 20+ more services
├── stores/              # Zustand state management
├── types/               # TypeScript definitions
├── utils/               # Utility functions
├── constants/           # App constants
└── abi/                 # Contract ABIs
```

## Security

- **Session Keys**: Trading sessions use encrypted keys stored locally - your main wallet private key is never exposed
- **Client-Side Only**: All operations run in your browser with no backend server
- **Local Storage**: Data persists in IndexedDB on your device only
- **Session Expiry**: Sessions expire after 30 days by default
- **Password Protection**: Session keys are encrypted with your password

## Tech Stack

- **React** 18.3.1 - UI framework
- **TypeScript** 5.6.2 - Type safety
- **Vite** 5.4.2 - Build tool
- **Zustand** 4.5.0 - State management
- **Fuels SDK** 0.102.0 - Fuel Network integration
- **Wagmi** 2.0.0 - Ethereum wallet integration
- **Dexie** 4.0.1 - IndexedDB wrapper
- **Decimal.js** - Precise number handling

## Disclaimer

This software is provided "as is" without warranty of any kind. Trading cryptocurrencies carries significant risk. You could lose some or all of your funds. This bot is experimental and in beta - bugs may occur. Always:

- Start with small amounts
- Monitor your bot's activity
- Understand the strategies before enabling them
- Never trade more than you can afford to lose

**This is not financial advice.**

