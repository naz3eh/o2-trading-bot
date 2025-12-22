export interface Market {
  market_id: string
  contract_id: string
  base: {
    asset: string
    symbol: string
    decimals: number
    max_precision: number
  }
  quote: {
    asset: string
    symbol: string
    decimals: number
    max_precision: number
  }
  tick_size?: string
  step_size?: string
}

export interface MarketsResponse {
  markets: Market[]
  books_whitelist_id?: string
  books_registry_id?: string
  books_blacklist_id?: string
  accounts_registry_id?: string
  trade_account_oracle_id?: string
  chain_id?: string
  base_asset_id?: string
}

// API response type (what we actually receive)
export interface MarketTickerApiResponse {
  ask: string
  ask_volume: string
  average: string
  base_volume: string
  bid: string
  bid_volume: string
  change: string
  close: string
  high: string
  last: string  // This is the actual field name
  low: string
  open: string
  percentage: string
  previous_close: string
  quote_volume: string
  timestamp: string
}

// Internal type (mapped for convenience)
export interface MarketTicker {
  market_id: string  // We'll need to add this from the request
  last_price: string  // Mapped from 'last'
  volume_24h: string  // Mapped from 'base_volume'
  high_24h: string    // Mapped from 'high'
  low_24h: string     // Mapped from 'low'
  change_24h: string  // Mapped from 'change'
  change_24h_percent: string  // Mapped from 'percentage'
  bid?: string
  ask?: string
}

export interface OrderBookDepth {
  bids: Array<[string, string]> // [price, quantity]
  asks: Array<[string, string]>
  timestamp: number
}

export interface MarketSummary {
  market_id: string
  last_price: string
  volume_24h: string
  high_24h: string
  low_24h: string
  change_24h: string
}

