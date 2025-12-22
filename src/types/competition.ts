export interface Competition {
  competitionId: string
  title: string
  subtitle: string
  symbols: string[]
  assets: {
    light: {
      backgroundImage: string
      color: string
    }
    dark: {
      backgroundImage: string
      color: string
    }
  }
  totalTraders: number
  totalVolume: string
  rewardPool: string
  startDate: string
  endDate: string | null
}

export interface CompetitionListResponse {
  competitions: Competition[]
}

export interface LeaderboardItem {
  traderId: string
  tradingAccount: string
  pnl: string
  realizedPnl: string
  unrealizedPnl: string
  volume: string
  volume24h: string
  rank: string
  score: string
  referralVolume: string
}

export interface LeaderboardResponse {
  items: LeaderboardItem[]
  totalTraders: string
  totalVolume: string
  prizePool: Record<string, string>
  rewardPool: string
  currentUser: LeaderboardItem | null
  competitionId: string
  title: string
  subtitle: string
  symbols: string[]
  assets: {
    light: {
      backgroundImage: string
      color: string
    }
    dark: {
      backgroundImage: string
      color: string
    }
  }
  ruleType: number
  markets: string[]
  startDate: string
  endDate: string | null
}

