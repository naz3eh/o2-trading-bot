import { Market } from '../types/market'
import { StrategyConfig, BaseStrategy, StrategyExecutionResult } from '../types/strategy'

export abstract class Strategy implements BaseStrategy {
  abstract execute(
    market: Market,
    config: StrategyConfig,
    ownerAddress: string,
    tradingAccountId: string
  ): Promise<StrategyExecutionResult>
  abstract getName(): string
  abstract getDescription(): string

  /**
   * Get default configuration for this strategy
   */
  abstract getDefaultConfig(): StrategyConfig
}

