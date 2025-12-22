import axios, { AxiosInstance } from 'axios'
import { Competition, CompetitionListResponse, LeaderboardResponse } from '../types/competition'
import { O2_ANALYTICS_API_URL } from '../constants/o2Constants'

class CompetitionService {
  private client: AxiosInstance

  constructor(baseUrl: string = O2_ANALYTICS_API_URL) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://trade.o2.app/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
      },
    })
  }

  /**
   * Get list of all competitions
   */
  async getCompetitionList(): Promise<CompetitionListResponse> {
    const response = await this.client.get<CompetitionListResponse>('/competition/list')
    return response.data
  }

  /**
   * Get leaderboard for a specific competition
   * @param competitionId - The competition ID
   * @param walletAddress - The wallet address to get current user info
   */
  async getLeaderboard(competitionId: string, walletAddress: string): Promise<LeaderboardResponse> {
    const response = await this.client.get<LeaderboardResponse>('/competition/leaderboard', {
      params: {
        current_address: walletAddress.toLowerCase(),
        competition_id: competitionId,
      },
    })
    return response.data
  }

  /**
   * Determine which competition is currently active
   * A competition is active if startDate <= now and (endDate === null or endDate >= now)
   * Ignores "Hall of Fame" competition
   */
  getActiveCompetition(competitions: Competition[]): Competition | null {
    const now = new Date().getTime()
    
    for (const competition of competitions) {
      // Ignore Hall of Fame competition
      if (competition.title === 'Hall of Fame') {
        continue
      }
      
      const startDate = new Date(competition.startDate).getTime()
      const endDate = competition.endDate ? new Date(competition.endDate).getTime() : null
      
      const hasStarted = startDate <= now
      const hasNotEnded = endDate === null || endDate >= now
      
      if (hasStarted && hasNotEnded) {
        return competition
      }
    }
    
    return null
  }
}

export const competitionService = new CompetitionService()

