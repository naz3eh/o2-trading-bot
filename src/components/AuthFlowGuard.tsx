import { useEffect, useState } from 'react'
import { authFlowService, AuthFlowState } from '../services/authFlowService'
import { walletService } from '../services/walletService'
import TermsOfUseDialog from './TermsOfUseDialog'
import AccessQueueDialog from './AccessQueueDialog'
import InvitationCodeDialog from './InvitationCodeDialog'
import { useToast } from './ToastProvider'

interface AuthFlowGuardProps {
  children: React.ReactNode
}

export default function AuthFlowGuard({ children }: AuthFlowGuardProps) {
  const [authState, setAuthState] = useState(authFlowService.getState())
  const { addToast } = useToast()

  useEffect(() => {
    let mounted = true
    let hasStarted = false
    
    // Subscribe to auth flow state changes
    const unsubscribe = authFlowService.subscribe((context) => {
      if (mounted) {
        console.log('Auth flow state changed:', context.state, context.error)
        setAuthState(context)
      }
    })

    // Start auth flow if wallet is connected and state is idle
    // The startFlow method will check for active session first
    const currentState = authFlowService.getState()
    console.log('AuthFlowGuard mounted, current state:', currentState.state)
    
    // If already ready, don't restart the flow
    if (currentState.state === 'ready') {
      console.log('Auth flow already ready')
      setAuthState(currentState)
      return unsubscribe
    }
    
    // Only start flow once, even if component remounts (React strict mode)
    if (currentState.state === 'idle' && !hasStarted) {
      hasStarted = true
      // Check if wallet is connected
      const wallet = walletService.getConnectedWallet()
      if (wallet) {
        console.log('Starting auth flow for wallet:', wallet.address)
        authFlowService.startFlow().catch((error) => {
          if (mounted) {
            console.error('Failed to start auth flow', error)
            addToast(`Auth flow error: ${error.message}`, 'error')
          }
        })
      } else {
        console.warn('No wallet connected when trying to start auth flow')
      }
    }

    return () => {
      mounted = false
      unsubscribe()
    }
  }, []) // Remove addToast dependency to prevent re-runs

  const handleTermsClose = () => {
    // Only reset if terms were actually declined (not just closed after acceptance)
    // Don't reset if we're already ready or in progress
    const currentState = authFlowService.getState()
    if (!authState.termsAccepted && currentState.state !== 'ready' && currentState.state !== 'creatingSession') {
      authFlowService.reset()
    }
  }

  const handleAccessQueueClose = () => {
    // Keep dialog open if user is in queue
    if (authState.state === 'displayingAccessQueue') {
      return
    }
  }

  const handleInvitationClose = () => {
    // If no invitation code, user can skip (will remain in queue)
  }

  // Show loading state
  if (
    authState.state === 'checkingSituation' ||
    authState.state === 'checkingTerms' ||
    authState.state === 'verifyingAccessQueue' ||
    authState.state === 'creatingSession'
  ) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>
          <p style={{ color: 'var(--foreground)' }}>Setting up trading session...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (authState.state === 'error') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>
          <p style={{ color: 'var(--destructive)' }}>Error: {authState.error}</p>
          <button
            onClick={() => authFlowService.startFlow()}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Show dialogs based on state */}
      <TermsOfUseDialog
        isOpen={authState.state === 'awaitingTerms'}
        onClose={handleTermsClose}
      />
      <AccessQueueDialog
        isOpen={authState.state === 'displayingAccessQueue'}
        queuePosition={authState.accessQueue.queuePosition}
        email={authState.accessQueue.email}
        telegram={authState.accessQueue.telegram}
        onClose={handleAccessQueueClose}
      />
      <InvitationCodeDialog
        isOpen={authState.state === 'awaitingInvitation'}
        onClose={handleInvitationClose}
      />

      {/* Only render children when ready */}
      {authState.state === 'ready' ? children : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div>
            <p style={{ color: 'var(--foreground)' }}>Completing authentication...</p>
            {authState.error && (
              <p style={{ color: 'var(--destructive)', marginTop: '8px', fontSize: '14px' }}>
                {authState.error}
              </p>
            )}
            <button
              onClick={async () => {
                const wallet = walletService.getConnectedWallet()
                if (wallet) {
                  // Check if session exists and force ready state
                  const normalizedAddress = wallet.address.toLowerCase()
                  const { sessionService } = await import('../services/sessionService')
                  const activeSession = await sessionService.getActiveSession(normalizedAddress)
                  if (activeSession) {
                    // Force ready state if session exists
                    const currentState = authFlowService.getState()
                    if (currentState.state !== 'ready') {
                      // Use startFlow which will detect the session
                      await authFlowService.startFlow()
                    }
                  } else {
                    // Retry auth flow
                    authFlowService.startFlow().catch((error) => {
                      console.error('Failed to retry auth flow', error)
                    })
                  }
                }
              }}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Check Session / Retry
            </button>
          </div>
        </div>
      )}
    </>
  )
}
