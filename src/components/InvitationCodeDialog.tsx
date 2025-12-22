import { useState, useEffect } from 'react'
import { authFlowService } from '../services/authFlowService'
import { eligibilityService } from '../services/eligibilityService'
import { useToast } from './ToastProvider'
import './InvitationCodeDialog.css'

interface InvitationCodeDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function InvitationCodeDialog({ isOpen, onClose }: InvitationCodeDialogProps) {
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    // Check for invitation code in URL
    const urlCode = eligibilityService.getInviteCodeFromUrl()
    if (urlCode) {
      setCode(urlCode)
    }
  }, [])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!code.trim()) {
      addToast('Please enter an invitation code', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      await authFlowService.assignInvitationCode(code.trim())
      addToast('Invitation code accepted', 'success')
      onClose()
    } catch (error: any) {
      addToast(`Failed to assign invitation code: ${error.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>Enter Invitation Code</h2>
        <p className="dialog-description">
          If you have an invitation code, enter it below to gain access to trading.
        </p>
        <div className="code-input-group">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter invitation code"
            className="code-input"
            disabled={isSubmitting}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit()
              }
            }}
          />
        </div>
        <div className="dialog-actions">
          <button className="skip-button" onClick={handleSkip} disabled={isSubmitting}>
            Skip
          </button>
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={!code.trim() || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
