import { useState } from 'react'
import { authFlowService } from '../services/authFlowService'
import { useToast } from './ToastProvider'
import './TermsOfUseDialog.css'

interface TermsOfUseDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function TermsOfUseDialog({ isOpen, onClose }: TermsOfUseDialogProps) {
  const [accepted, setAccepted] = useState(false)
  const { addToast } = useToast()

  if (!isOpen) return null

  const handleAccept = async () => {
    if (!accepted) {
      addToast('Please accept the terms of use to continue', 'warning')
      return
    }

    try {
      await authFlowService.acceptTerms()
      onClose()
    } catch (error: any) {
      addToast(`Failed to accept terms: ${error.message}`, 'error')
    }
  }

  const handleDecline = () => {
    onClose()
    authFlowService.reset()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>Terms of Use</h2>
        <div className="terms-content">
          <p>
            By using this trading bot, you agree to the following terms:
          </p>
          <ul>
            <li>You are responsible for all trading activities</li>
            <li>You understand the risks involved in automated trading</li>
            <li>You will not use this bot for illegal activities</li>
            <li>You acknowledge that trading involves risk of loss</li>
          </ul>
          <p>
            Please read the full terms of use at{' '}
            <a href="https://o2.app/terms-of-use" target="_blank" rel="noopener noreferrer">
              o2.app/terms-of-use
            </a>
          </p>
        </div>
        <div className="terms-checkbox">
          <label>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>I have read and agree to the Terms of Use</span>
          </label>
        </div>
        <div className="dialog-actions">
          <button className="decline-button" onClick={handleDecline}>
            Decline
          </button>
          <button className="accept-button" onClick={handleAccept} disabled={!accepted}>
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
