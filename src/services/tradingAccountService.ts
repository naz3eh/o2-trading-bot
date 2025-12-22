import { Address, BYTES_32 } from 'fuels'
import { pad } from 'viem'
import { o2ApiService } from './o2ApiService'
import { walletService } from './walletService'
import { TradingAccount } from '../types/tradingAccount'
import { db } from './dbService'
import { useTradingAccountAddressesStore } from '../stores/useTradingAccountAddressesStore'

class TradingAccountService {
  async getOrCreateTradingAccount(ownerAddress: string): Promise<TradingAccount> {
    // Validate and normalize address
    if (!ownerAddress || typeof ownerAddress !== 'string') {
      throw new Error('Invalid owner address: address must be a non-empty string')
    }
    
    // Normalize address to lowercase for consistent storage
    const normalizedAddress = ownerAddress.toLowerCase()
    
    // Check cache first - if exists and stored, trust it (no verification needed)
    const addressesStore = useTradingAccountAddressesStore.getState()
    const cachedAccountId = addressesStore.getContract(normalizedAddress)
    if (cachedAccountId) {
      const stored = await db.tradingAccounts.get(cachedAccountId)
      if (stored) {
        return stored // Trust cached account - no verification needed
      }
      // Cache invalid, clear it
      addressesStore.setContract(normalizedAddress, null as any)
    }
    
    // Check stored in database
    const stored = await db.tradingAccounts.where('ownerAddress').equals(normalizedAddress).first()
    if (stored) {
      // Update cache and return - trust stored data
      addressesStore.setContract(normalizedAddress, stored.id)
      return stored
    }
    
    // No cached/stored account - create via API (idempotent - returns existing or creates)
    const wallet = walletService.getConnectedWallet()
    const isEthereum = wallet && !wallet.isFuel
    
    // Prepare address: pad Ethereum addresses to 32 bytes (BYTES_32)
    let addressForApi: string
    if (isEthereum) {
      // Ethereum addresses need to be padded to 32 bytes before converting to B256
      addressForApi = pad(normalizedAddress as `0x${string}`, { size: BYTES_32 })
    } else {
      // Fuel addresses are already 32 bytes
      addressForApi = normalizedAddress
    }
    
    // Convert to B256 format
    const fuelAddress = Address.fromString(addressForApi)
    const b256Address = fuelAddress.toB256()
    
    // Call idempotent API (returns existing account or creates new one)
    const response = await o2ApiService.createTradingAccount(
      {
        identity: {
          Address: b256Address,
        },
      },
      normalizedAddress
    )
    
    // Store and cache
    const tradingAccount: TradingAccount = {
      id: response.trade_account_id,
      ownerAddress: normalizedAddress,
      createdAt: Date.now(),
      nonce: 0, // Will be fetched when needed via getAccount
    }
    
    await db.tradingAccounts.put(tradingAccount)
    addressesStore.setContract(normalizedAddress, tradingAccount.id)
    
    return tradingAccount
  }

  async getTradingAccount(ownerAddress: string): Promise<TradingAccount | null> {
    // Validate and normalize address
    if (!ownerAddress || typeof ownerAddress !== 'string') {
      return null
    }
    
    const normalizedAddress = ownerAddress.toLowerCase()
    const stored = await db.tradingAccounts.where('ownerAddress').equals(normalizedAddress).first()
    if (!stored) {
      return null
    }

    // Return stored account - trust it (no verification needed)
    return stored
  }

  async updateNonce(accountId: string, nonce: number): Promise<void> {
    await db.tradingAccounts.update(accountId, { nonce })
  }
}

export const tradingAccountService = new TradingAccountService()

