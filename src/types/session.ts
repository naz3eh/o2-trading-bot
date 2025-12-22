import { Address } from 'fuels'

export interface Session {
  id: string // Session wallet address
  tradeAccountId: string
  ownerAddress: string
  contractIds: string[] // Market contract IDs this session can trade
  expiry: number // Timestamp
  createdAt: number
  isActive: boolean
}

export interface SessionKey {
  privateKey: string // Encrypted session private key
  address: string // Session wallet address
}

export interface SessionCreationParams {
  tradeAccountId: string
  ownerAddress: string
  contractIds: string[]
  expiry?: number
}

