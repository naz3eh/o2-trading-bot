import { Wallet, Provider, Account, Address, bn, BYTES_32 } from 'fuels'
import { pad } from 'viem'
import { o2ApiService } from './o2ApiService'
import { walletService } from './walletService'
import { tradingAccountService } from './tradingAccountService'
import { TradeAccountManager } from './tradeAccountManager'
import { FuelSessionSigner } from './fuelSessionSigner'
import { EthereumAccountAdapter } from './ethereumAccountAdapter'
import { Session, SessionCreationParams, SessionKey } from '../types/session'
import { db } from './dbService'
import { encrypt, decrypt } from '../utils/encryption'
import { DEFAULT_SESSION_EXPIRY_MS, FUEL_PROVIDER_URL } from '../constants/o2Constants'
import { fuel } from './walletService'
import { useSessionStore } from '../stores/useSessionStore'
import { SessionInput } from '../types/contracts/TradeAccount'
import { TradingAccount } from '../types/tradingAccount'

class SessionService {
  private password: string | null = null

  setPassword(password: string) {
    this.password = password
  }

  async createSession(
    ownerAddress: string,
    contractIds: string[],
    expiry?: number,
    tradingAccount?: TradingAccount
  ): Promise<Session> {
    if (!this.password) {
      throw new Error('Password not set for session encryption')
    }

    // Normalize address
    const normalizedAddress = ownerAddress.toLowerCase()

    // Get or create trading account (use provided one or fetch it)
    const account = tradingAccount || await tradingAccountService.getOrCreateTradingAccount(normalizedAddress)

    // Get owner account (supports both Fuel and Ethereum wallets)
    const connectedWallet = walletService.getConnectedWallet()
    if (!connectedWallet) {
      throw new Error('No wallet connected')
    }

    // Create provider for account adapter
    const provider = new Provider(FUEL_PROVIDER_URL)
    await provider.init()

    let ownerAccount: Account

    if (connectedWallet.isFuel) {
      // Fuel wallet
      const fuelAccount = await fuel.currentAccount()
      if (!fuelAccount || typeof fuelAccount === 'string') {
        throw new Error('No Fuel account available')
      }
      ownerAccount = fuelAccount as Account
    } else {
      // Ethereum wallet - create adapter
      const ethAddress = Address.fromString(connectedWallet.address)
      ownerAccount = new EthereumAccountAdapter({
        address: ethAddress,
        provider,
      })
    }

    // Generate session wallet first to get the private key
    // Reuse the provider we already created above
    
    // Generate session wallet
    const sessionWallet = Wallet.generate({ provider })
    const sessionPrivateKey = (sessionWallet as any).privateKey
    const sessionAddress = sessionWallet.address.toB256()

    // Create session signer from the generated wallet's private key
    const sessionSigner = new FuelSessionSigner(sessionPrivateKey as any)

    // Create TradeAccountManager
    const tradeAccountManager = new TradeAccountManager({
      account: ownerAccount as Account,
      signer: sessionSigner,
      tradeAccountId: Address.fromString(account.id).toB256() as any,
      defaultGasLimit: undefined, // Use default
    })

    // Fetch current nonce
    await tradeAccountManager.fetchNonce()

    // Generate session creation params with proper signature
    const expiryTimestamp = expiry || Date.now() + DEFAULT_SESSION_EXPIRY_MS
    const sessionParams = await tradeAccountManager.api_CreateSessionParams(contractIds, expiryTimestamp)

    // Convert owner address to B256 format for O2-Owner-Id header
    const wallet = walletService.getConnectedWallet()
    let ownerIdForHeader: string
    
    if (wallet && !wallet.isFuel) {
      // Ethereum wallet - pad to 32 bytes then convert to B256
      const paddedAddress = pad(normalizedAddress as `0x${string}`, { size: BYTES_32 })
      const fuelAddress = Address.fromString(paddedAddress)
      ownerIdForHeader = fuelAddress.toB256()
    } else {
      // Fuel wallet - convert directly to B256
      const fuelAddress = Address.fromString(normalizedAddress)
      ownerIdForHeader = fuelAddress.toB256()
    }

    // Create session via API - convert to API format
    try {
      await o2ApiService.createSession(
        {
          contract_id: sessionParams.contract_id,
          session_id: sessionParams.session_id as any,
          signature: sessionParams.signature as any,
          nonce: sessionParams.nonce,
          expiry: sessionParams.expiry,
          contract_ids: sessionParams.contract_ids,
        },
        ownerIdForHeader
      )
      console.log('Session API call successful')
    } catch (error) {
      console.error('Session API call failed:', error)
      throw error
    }

    // Try to recover session to verify it was created
    try {
      const recoveredSession = await tradeAccountManager.recoverSession()
      tradeAccountManager.setSession(recoveredSession)
    } catch (error) {
      // Session might not be immediately available, that's okay
      console.warn('Could not recover session immediately', error)
    }

    // Increment nonce
    try {
      tradeAccountManager.incrementNonce()
      await tradingAccountService.updateNonce(account.id, parseInt(tradeAccountManager.nonce.toString()))
    } catch (error) {
      console.error('Failed to update nonce:', error)
      // Don't throw - nonce update failure shouldn't block session creation
    }

    // Encrypt and store session key
    let encryptedData: string, salt: string, iv: string
    try {
      const sessionKeyData = JSON.stringify({
        privateKey: sessionPrivateKey,
        address: sessionAddress,
      })

      const encrypted = await encrypt(sessionKeyData, this.password)
      encryptedData = encrypted.encryptedData
      salt = encrypted.salt
      iv = encrypted.iv

      await db.sessionKeys.put({
        id: sessionAddress,
        encryptedPrivateKey: encryptedData,
        salt,
        iv,
        createdAt: Date.now(),
      })
      console.log('Session key stored in database')
    } catch (error) {
      console.error('Failed to store session key:', error)
      throw new Error(`Failed to store session key: ${error}`)
    }

    // Store session metadata
    const session: Session = {
      id: sessionAddress,
      tradeAccountId: account.id,
      ownerAddress: normalizedAddress,
      contractIds,
      expiry: expiryTimestamp,
      createdAt: Date.now(),
      isActive: true,
    }

    try {
      await db.sessions.put(session)
      console.log('Session metadata stored in database:', session.id)
    } catch (error) {
      console.error('Failed to store session metadata:', error)
      throw new Error(`Failed to store session metadata: ${error}`)
    }

    // Store session in zustand store (for cache)
    try {
      const sessionInput: SessionInput = {
        session_id: {
          Address: { bits: sessionAddress },
        },
        expiry: {
          unix: bn(expiryTimestamp.toString()),
        },
        contract_ids: contractIds.map((id) => ({ bits: id })),
      }
      useSessionStore.getState().setSession(account.id, sessionInput)
    } catch (error) {
      console.warn('Failed to store session in cache', error)
    }

    return session
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return (await db.sessions.get(sessionId)) || null
  }

  async getActiveSession(ownerAddress: string): Promise<Session | null> {
    // Normalize address for query
    const normalizedAddress = ownerAddress.toLowerCase()
    
    // First check cache in zustand store
    const tradingAccount = await tradingAccountService.getTradingAccount(normalizedAddress)
    if (tradingAccount) {
      const cachedSession = useSessionStore.getState().getSession(tradingAccount.id)
      if (cachedSession) {
        // Verify it's still valid by checking database
        const allSessions = await db.sessions
          .where('ownerAddress')
          .equals(normalizedAddress)
          .toArray()
        
        const activeSessions = allSessions
          .filter((s) => s.isActive && s.expiry > Date.now())
          .sort((a, b) => b.createdAt - a.createdAt)
        
        if (activeSessions.length > 0) {
          return activeSessions[0]
        }
      }
    }

    // Fallback to database query
    const allSessions = await db.sessions
      .where('ownerAddress')
      .equals(normalizedAddress)
      .toArray()
    
    const activeSessions = allSessions
      .filter((s) => s.isActive && s.expiry > Date.now())
      .sort((a, b) => b.createdAt - a.createdAt)

    return activeSessions.length > 0 ? activeSessions[0] : null
  }

  async hasActiveSession(ownerAddress: string): Promise<boolean> {
    const session = await this.getActiveSession(ownerAddress)
    return session !== null
  }

  async getSessionKey(sessionId: string): Promise<SessionKey | null> {
    if (!this.password) {
      throw new Error('Password not set for session decryption')
    }

    const encrypted = await db.sessionKeys.get(sessionId)
    if (!encrypted) {
      return null
    }

    const decrypted = await decrypt(
      encrypted.encryptedPrivateKey,
      this.password,
      encrypted.salt,
      encrypted.iv
    )

    const keyData = JSON.parse(decrypted)
    return {
      privateKey: keyData.privateKey,
      address: keyData.address,
    }
  }

  async deactivateSession(sessionId: string): Promise<void> {
    await db.sessions.update(sessionId, { isActive: false })
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.sessions.delete(sessionId)
    await db.sessionKeys.delete(sessionId)
  }
}

export const sessionService = new SessionService()

