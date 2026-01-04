import { useState, useEffect } from 'react'
import { authFlowService } from '../services/authFlowService'
import { useToast } from './ToastProvider'
import './SignMessageDialog.css'

interface SignMessageDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function SignMessageDialog({ isOpen, onClose }: SignMessageDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { addToast } = useToast()

  // Reset loading state when dialog opens (e.g., after retry)
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSign = async () => {
    setIsLoading(true)
    try {
      await authFlowService.confirmSignature()
      onClose()
    } catch (error: any) {
      addToast(`Failed to sign message: ${error.message}`, 'error')
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    authFlowService.declineSignature()
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog-content sign-message-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Sign Message</h2>
        <div className="sign-message-content">
          <p>
            Sign a message to establish a secure connection with your wallet.
          </p>
          <p className="sign-message-note">
            This signature is used to create a trading session and does not cost any gas.
          </p>
        </div>
        <div className="dialog-actions">
          <button
            className="cancel-button"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="sign-button"
            onClick={handleSign}
            disabled={isLoading}
          >
            {isLoading ? 'Waiting for signature...' : 'Sign Message'}
          </button>
        </div>
      </div>
    </div>
  )
}
