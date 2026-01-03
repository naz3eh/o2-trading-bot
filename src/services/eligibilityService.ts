import axios from 'axios'
import { O2_API_URL, O2_ANALYTICS_API_URL } from '../constants/o2Constants'

export interface EligibilityStatus {
  isEligible: boolean
  isWhitelisted: boolean
  hasInviteCode?: boolean
  waitlistPosition?: number
  error?: string
}

class EligibilityService {
  private apiUrl: string

  constructor(apiUrl: string = O2_API_URL) {
    this.apiUrl = apiUrl
  }

  setApiUrl(url: string) {
    this.apiUrl = url
  }

  async checkEligibility(
    walletAddress: string,
    tradingAccountId?: string,
    inviteCode?: string
  ): Promise<EligibilityStatus> {
    try {
      // First check if account is whitelisted
      // This would typically be done via the o2 API
      // For now, we'll implement a basic check
      
      // If invite code is provided, try to use it
      if (inviteCode && tradingAccountId) {
        try {
          // Call the analytics API endpoint with PUT method (matching fuel-o2)
          // Endpoint: PUT /analytics/v1/assign-code
          const response = await axios.put(
            `${O2_ANALYTICS_API_URL}/assign-code`,
            {
              // Use camelCase to match fuel-o2 API format
              invitationCode: inviteCode,
              tradeAccountId: tradingAccountId,
              walletAddress: walletAddress,
            }
          )

          // fuel-o2 returns { referer, address } on success (status 200)
          if (response.status === 200) {
            return {
              isEligible: true,
              isWhitelisted: true,
              hasInviteCode: true,
            }
          }
        } catch (error: any) {
          // API returns specific error codes:
          // 404 = Code not found
          // 400 = Code already used or limit reached
          // 403 = Code restricted to different address
          const errorMessage = error.response?.data?.message ||
                              error.response?.data?.error ||
                              'Invalid invitation code'
          return {
            isEligible: false,
            isWhitelisted: false,
            hasInviteCode: false,
            error: errorMessage,
          }
        }
      }

      // Check access queue status (POST request)
      try {
        const response = await axios.post(
          `${this.apiUrl}/access-queue/verify`,
          {
            trading_account: tradingAccountId,
            wallet_address: walletAddress,
          },
          {
            headers: {
              'O2-Owner-Id': walletAddress,
            },
          }
        )

        const data = response.data

        // Case 1: Auto-approved (new user)
        if (data.success && 'autoApproved' in data && data.autoApproved) {
          return {
            isEligible: true,
            isWhitelisted: true,
            hasInviteCode: !!data.invitationCode,
          }
        }

        // Case 2: Queued (new user, not auto-approved)
        if (data.success && 'autoApproved' in data && !data.autoApproved) {
          return {
            isEligible: false,
            isWhitelisted: false,
            waitlistPosition: data.queuePosition,
          }
        }

        // Case 3: Existing entry - already approved
        if (data.success && 'found' in data && data.found && data.entry.status === 'approved') {
          return {
            isEligible: true,
            isWhitelisted: true,
            hasInviteCode: !!data.entry.invitationCode,
          }
        }

        // Case 4: Existing entry - still pending
        if (data.success && 'found' in data && data.found && data.entry.status !== 'approved') {
          return {
            isEligible: false,
            isWhitelisted: false,
            waitlistPosition: data.entry.queuePosition,
          }
        }
      } catch (error: any) {
        // API might not be available or endpoint might differ
        console.warn('Access queue check failed', error)
      }

      // Default: not eligible
      return {
        isEligible: false,
        isWhitelisted: false,
        error: 'Not whitelisted and no valid invite code',
      }
    } catch (error: any) {
      return {
        isEligible: false,
        isWhitelisted: false,
        error: error.message || 'Failed to check eligibility',
      }
    }
  }

  getInviteCodeFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search)
    return params.get('invite')
  }
}

export const eligibilityService = new EligibilityService()

