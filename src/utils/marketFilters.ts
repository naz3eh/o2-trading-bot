import { Market } from '../types/market'
import { HIDE_USDT_IN_UI } from '../constants/o2Constants'

/**
 * Filters markets based on the HIDE_USDT_IN_UI configuration flag.
 * When enabled, filters out markets where the base symbol is 'USDT'.
 * 
 * @param markets - Array of markets to filter
 * @returns Filtered array of markets
 */
export function filterMarkets(markets: Market[]): Market[] {
  if (!HIDE_USDT_IN_UI) {
    return markets
  }
  
  return markets.filter((market) => market.base.symbol !== 'USDT')
}

