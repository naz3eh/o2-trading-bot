import axios, { AxiosInstance } from 'axios'
import { Address, BYTES_32 } from 'fuels'
import { pad } from 'viem'
import { Market, MarketTicker, MarketTickerApiResponse, OrderBookDepth, MarketsResponse } from '../types/market'
import { Order } from '../types/order'
import { BalanceApiResponse } from '../types/tradingAccount'
import { O2_API_URL } from '../constants/o2Constants'
import { walletService } from './walletService'

export interface CreateTradingAccountRequest {
  identity: {
    Address: string
  }
}

export interface CreateTradingAccountResponse {
  trade_account_id: string
}

export interface CreateSessionRequest {
  contract_id: string
  session_id: string | { Address: string }
  signature: string | { Secp256k1: string }
  nonce: string
  expiry: string
  contract_ids?: string[]
}

export interface SessionSubmitTransactionRequest {
  actions: Array<{
    market_id: string
    actions: Array<{
      CreateOrder?: {
        side: 'Buy' | 'Sell'
        order_type: 'Spot' | 'Market' | 'Limit' | 'FillOrKill' | 'PostOnly'
        price: string
        quantity: string
      }
      CancelOrder?: {
        order_id: string
      }
      SettleBalance?: {
        to: any
      }
    }>
  }>
  signature: string | any
  nonce: string
  trade_account_id: string
  session_id: string | any
  variable_outputs?: number
  min_gas_limit?: string
  collect_orders?: boolean
}

export interface SessionSubmitTransactionResponse {
  tx_id: string
  orders: Order[]
}

export interface GetAccountResponse {
  trade_account: {
    nonce: number
    owner: {
      Address?: string
      ContractId?: string
    }
    synced_with_network: boolean
  } | null
  trade_account_id: string | null
}

class O2ApiService {
  private client: AxiosInstance
  private baseUrl: string

  constructor(baseUrl: string = O2_API_URL) {
    this.baseUrl = baseUrl
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  setBaseUrl(url: string) {
    this.baseUrl = url
    this.client.defaults.baseURL = url
  }

  // Account API
  async createTradingAccount(request: CreateTradingAccountRequest, ownerId: string): Promise<CreateTradingAccountResponse> {
    // The API expects the request body to have identity.Address format
    // ownerId is used in the header
    const response = await this.client.post<CreateTradingAccountResponse>('/accounts', request, {
      headers: {
        'O2-Owner-Id': ownerId,
      },
    })
    return response.data
  }

  async getAccount(tradeAccountId: string, ownerId: string): Promise<{ nonce: string }> {
    const response = await this.client.get<GetAccountResponse>(`/accounts?trade_account_id=${tradeAccountId}`, {
      headers: {
        'O2-Owner-Id': ownerId,
      },
    })
    // Response structure: { trade_account: { nonce: number }, trade_account_id: string }
    return { nonce: String(response.data.trade_account?.nonce || 0) }
  }

  async getAccountByOwner(ownerAddress: string): Promise<GetAccountResponse> {
    const response = await this.client.get<GetAccountResponse>(`/accounts?owner=${ownerAddress}`)
    return response.data
  }

  // Session API
  async createSession(request: CreateSessionRequest, ownerId: string): Promise<any> {
    // Convert to API format
    const apiRequest = {
      nonce: request.nonce,
      contract_id: request.contract_id,
      session_id: request.session_id,
      contract_ids: request.contract_ids,
      signature: request.signature,
      expiry: request.expiry,
    }
    const response = await this.client.put('/session', apiRequest, {
      headers: {
        'O2-Owner-Id': ownerId,
      },
    })
    return response.data
  }

  async sessionSubmitTransaction(request: SessionSubmitTransactionRequest, ownerId: string): Promise<SessionSubmitTransactionResponse> {
    // Convert ownerId to B256 format for header (same as other API calls)
    const wallet = walletService.getConnectedWallet()
    let ownerIdForHeader: string
    
    if (wallet && !wallet.isFuel) {
      // Ethereum wallet - pad to 32 bytes then convert to B256
      const paddedAddress = pad(ownerId as `0x${string}`, { size: BYTES_32 })
      const fuelAddress = Address.fromString(paddedAddress)
      ownerIdForHeader = fuelAddress.toB256()
    } else {
      // Fuel wallet - convert directly to B256
      const fuelAddress = Address.fromString(ownerId)
      ownerIdForHeader = fuelAddress.toB256()
    }

    const response = await this.client.post<SessionSubmitTransactionResponse>('/session/actions', request, {
      headers: {
        'O2-Owner-Id': ownerIdForHeader,
      },
    })
    return response.data
  }

  // Market API
  async getMarkets(): Promise<MarketsResponse> {
    const response = await this.client.get<MarketsResponse>('/markets')
    return response.data
  }

  async getTicker(marketId: string): Promise<MarketTicker> {
    const response = await this.client.get<MarketTickerApiResponse[]>(`/markets/ticker?market_id=${marketId}`)
    
    // API returns array with single object
    const tickerData = Array.isArray(response.data) ? response.data[0] : response.data
    
    if (!tickerData) {
      throw new Error(`No ticker data returned for market ${marketId}`)
    }
    
    // Map API response to internal MarketTicker format
    return {
      market_id: marketId,
      last_price: tickerData.last,  // Map 'last' to 'last_price'
      volume_24h: tickerData.base_volume,
      high_24h: tickerData.high,
      low_24h: tickerData.low,
      change_24h: tickerData.change,
      change_24h_percent: tickerData.percentage,
      bid: tickerData.bid,
      ask: tickerData.ask,
    }
  }

  async getDepth(marketId: string, precision: number = 100): Promise<OrderBookDepth> {
    const response = await this.client.get<OrderBookDepth>(`/depth?market_id=${marketId}&precision=${precision}`)
    return response.data
  }

  // Balance API
  async getBalance(assetId: string, contractId: string, ownerId: string): Promise<BalanceApiResponse> {
    // Convert ownerId to B256 format for header (same as session creation)
    const wallet = walletService.getConnectedWallet()
    let ownerIdForHeader: string
    
    if (wallet && !wallet.isFuel) {
      // Ethereum wallet - pad to 32 bytes then convert to B256
      const paddedAddress = pad(ownerId as `0x${string}`, { size: BYTES_32 })
      const fuelAddress = Address.fromString(paddedAddress)
      ownerIdForHeader = fuelAddress.toB256()
    } else {
      // Fuel wallet - convert directly to B256
      const fuelAddress = Address.fromString(ownerId)
      ownerIdForHeader = fuelAddress.toB256()
    }

    const response = await this.client.get<BalanceApiResponse>(`/balance?asset_id=${assetId}&contract=${contractId}`, {
      headers: {
        'O2-Owner-Id': ownerIdForHeader,
      },
    })
    return response.data
  }

  // Orders API
  async getOrders(params: {
    market_id?: string
    contract?: string
    is_open?: boolean
    direction?: 'asc' | 'desc'
    count?: number
  }, ownerId: string): Promise<Order[]> {
    // Convert ownerId to B256 format for header (same as session creation)
    const wallet = walletService.getConnectedWallet()
    let ownerIdForHeader: string
    
    if (wallet && !wallet.isFuel) {
      // Ethereum wallet - pad to 32 bytes then convert to B256
      const paddedAddress = pad(ownerId as `0x${string}`, { size: BYTES_32 })
      const fuelAddress = Address.fromString(paddedAddress)
      ownerIdForHeader = fuelAddress.toB256()
    } else {
      // Fuel wallet - convert directly to B256
      const fuelAddress = Address.fromString(ownerId)
      ownerIdForHeader = fuelAddress.toB256()
    }

    const queryParams = new URLSearchParams()
    if (params.market_id) queryParams.append('market_id', params.market_id)
    if (params.contract) queryParams.append('contract', params.contract)
    if (params.is_open !== undefined) queryParams.append('is_open', String(params.is_open))
    if (params.direction) queryParams.append('direction', params.direction)
    if (params.count) queryParams.append('count', String(params.count))

    const response = await this.client.get<{ orders: Order[] }>(`/orders?${queryParams.toString()}`, {
      headers: {
        'O2-Owner-Id': ownerIdForHeader,
      },
    })
    return response.data.orders
  }

  async getOrder(orderId: string, ownerId: string): Promise<Order> {
    // Convert ownerId to B256 format for header (same as session creation)
    const wallet = walletService.getConnectedWallet()
    let ownerIdForHeader: string
    
    if (wallet && !wallet.isFuel) {
      // Ethereum wallet - pad to 32 bytes then convert to B256
      const paddedAddress = pad(ownerId as `0x${string}`, { size: BYTES_32 })
      const fuelAddress = Address.fromString(paddedAddress)
      ownerIdForHeader = fuelAddress.toB256()
    } else {
      // Fuel wallet - convert directly to B256
      const fuelAddress = Address.fromString(ownerId)
      ownerIdForHeader = fuelAddress.toB256()
    }

    const response = await this.client.get<Order>(`/orders/${orderId}`, {
      headers: {
        'O2-Owner-Id': ownerIdForHeader,
      },
    })
    return response.data
  }

  // Trades API
  async getTrades(marketId: string, count: number = 20): Promise<any[]> {
    const response = await this.client.get(`/trades?market_id=${marketId}&count=${count}&direction=desc`)
    return response.data.trades || []
  }
}

export const o2ApiService = new O2ApiService()

