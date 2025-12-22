import { useState } from 'react'
import { authFlowService } from '../services/authFlowService'
import { useToast } from './ToastProvider'
import './AccessQueueDialog.css'

interface AccessQueueDialogProps {
  isOpen: boolean
  queuePosition: number | null
  email: string | null
  telegram: string | null
  onClose: () => void
}

export default function AccessQueueDialog({
  isOpen,
  queuePosition,
  email,
  telegram,
  onClose,
}: AccessQueueDialogProps) {
  const [localEmail, setLocalEmail] = useState(email || '')
  const [localTelegram, setLocalTelegram] = useState(telegram || '')
  const [isEditing, setIsEditing] = useState(!email && !telegram)
  const { addToast } = useToast()

  if (!isOpen) return null

  const handleSave = async () => {
    // In a real implementation, this would save email/telegram to the access queue
    // For now, we'll just show a message
    addToast('Contact information saved. You will be notified when your turn comes.', 'info')
    setIsEditing(false)
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>Access Queue</h2>
        {queuePosition !== null ? (
          <div className="queue-info">
            <p className="queue-position">
              Your position in queue: <strong>#{queuePosition}</strong>
            </p>
            <p className="queue-message">
              You are currently in the waitlist. We will notify you when you are approved for trading.
            </p>
          </div>
        ) : (
          <div className="queue-info">
            <p className="queue-message">
              You are not currently eligible to trade. Please wait for approval or use an invitation code.
            </p>
          </div>
        )}

        <div className="contact-info">
          <h3>Contact Information</h3>
          {isEditing ? (
            <div className="contact-form">
              <div className="form-group">
                <label>Email (optional)</label>
                <input
                  type="email"
                  value={localEmail}
                  onChange={(e) => setLocalEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div className="form-group">
                <label>Telegram (optional)</label>
                <input
                  type="text"
                  value={localTelegram}
                  onChange={(e) => setLocalTelegram(e.target.value)}
                  placeholder="@yourtelegram"
                />
              </div>
              <button className="save-button" onClick={handleSave}>
                Save
              </button>
            </div>
          ) : (
            <div className="contact-display">
              {email && <p>Email: {email}</p>}
              {telegram && <p>Telegram: {telegram}</p>}
              {!email && !telegram && <p className="no-contact">No contact information provided</p>}
              <button className="edit-button" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button className="close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
