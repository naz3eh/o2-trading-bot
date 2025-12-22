import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import './ToastProvider.css'

type Toast = {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface ToastContextValue {
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
})

let toastIdCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
      const id = ++toastIdCounter
      setToasts((prev) => [...prev, { id, message, type }])

      // Auto-dismiss after 4 seconds
      setTimeout(() => removeToast(id), 4000)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

