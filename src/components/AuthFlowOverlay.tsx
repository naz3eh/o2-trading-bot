import { useEffect, useState } from 'react'
import { authFlowService } from '../services/authFlowService'
import { walletService } from '../services/walletService'
import TermsOfUseDialog from './TermsOfUseDialog'
import AccessQueueDialog from './AccessQueueDialog'
import InvitationCodeDialog from './InvitationCodeDialog'
import WelcomeModal from './WelcomeModal'
import { useToast } from './ToastProvider'

interface AuthFlowOverlayProps {
  onAuthReady?: () => void
  onAuthStateChange?: (state: string, isWhitelisted: boolean | null) => void
}

export default function AuthFlowOverlay({ onAuthReady, onAuthStateChange }: AuthFlowOverlayProps) {
  const [authState, setAuthState] = useState(authFlowService.getState())
  const [dismissedDialogs, setDismissedDialogs] = useState<Set<string>>(new Set())
  const { addToast } = useToast()

  useEffect(() => {
    let mounted = true
    let hasStarted = false

    // Subscribe to auth flow state changes
    const unsubscribe = authFlowService.subscribe((context) => {
      if (mounted) {
        console.log('Auth flow state changed:', context.state, context.error)
        setAuthState(context)

        // Notify parent of state changes
        onAuthStateChange?.(context.state, context.isWhitelisted)

        // Notify parent when auth is ready
        if (context.state === 'ready') {
          onAuthReady?.()
        }

        // Show error as toast instead of blocking
        if (context.state === 'error' && context.error) {
          addToast(`Authentication error: ${context.error}`, 'error')
        }
      }
    })

    // Start auth flow if wallet is connected and state is idle
    const currentState = authFlowService.getState()
    console.log('AuthFlowOverlay mounted, current state:', currentState.state)

    // If already ready, notify parent
    if (currentState.state === 'ready') {
      console.log('Auth flow already ready')
      setAuthState(currentState)
      onAuthReady?.()
      onAuthStateChange?.(currentState.state, currentState.isWhitelisted)
      return unsubscribe
    }

    // Only start flow once
    if (currentState.state === 'idle' && !hasStarted) {
      hasStarted = true
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
  }, [onAuthReady, onAuthStateChange])

  const handleTermsClose = () => {
    // Only reset if terms were actually declined
    const currentState = authFlowService.getState()
    if (!authState.termsAccepted && currentState.state !== 'ready' && currentState.state !== 'creatingSession') {
      authFlowService.reset()
    }
  }

  const handleAccessQueueClose = () => {
    // User can close and browse - just can't trade
    // Mark as dismissed so it doesn't reopen
    setDismissedDialogs(prev => new Set(prev).add('accessQueue'))
    // Notify parent that auth is "done" for browsing purposes (not whitelisted)
    onAuthStateChange?.('dismissed', false)
  }

  const handleInvitationClose = () => {
    // User can close and browse - invitation is optional for browsing
    // Mark as dismissed so it doesn't reopen
    setDismissedDialogs(prev => new Set(prev).add('invitation'))
    // Notify parent that auth is "done" for browsing purposes (not whitelisted)
    onAuthStateChange?.('dismissed', false)
  }

  // Check if dialogs should be shown (not dismissed by user)
  const showAccessQueueDialog = authState.state === 'displayingAccessQueue' && !dismissedDialogs.has('accessQueue')
  const showInvitationDialog = authState.state === 'awaitingInvitation' && !dismissedDialogs.has('invitation')

  // Don't render anything for loading or error states - let them be handled elsewhere
  // Only render dialog overlays when needed
  return (
    <>
      <TermsOfUseDialog
        isOpen={authState.state === 'awaitingTerms'}
        onClose={handleTermsClose}
      />
      <AccessQueueDialog
        isOpen={showAccessQueueDialog}
        queuePosition={authState.accessQueue.queuePosition}
        email={authState.accessQueue.email}
        telegram={authState.accessQueue.telegram}
        onClose={handleAccessQueueClose}
      />
      <InvitationCodeDialog
        isOpen={showInvitationDialog}
        onClose={handleInvitationClose}
      />
      <WelcomeModal
        isOpen={authState.state === 'awaitingWelcome'}
        onClose={() => authFlowService.dismissWelcome()}
      />
    </>
  )
}
