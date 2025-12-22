import { Address } from 'fuels'

export type WalletType = 
  | 'fuel' 
  | 'fuelet' 
  | 'bako-safe' 
  | 'walletconnect' 
  | 'brave' 
  | 'keplr' 
  | 'metamask' 
  | 'phantom'

export interface ConnectedWallet {
  type: WalletType
  address: string
  isFuel: boolean
  connector?: any // Wallet connector instance
}

export interface WalletConnectionState {
  isConnected: boolean
  wallet: ConnectedWallet | null
  error: string | null
}

