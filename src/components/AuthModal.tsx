import { useState } from 'react'
import { signInWithEmail, signUpWithEmail } from '../services/authService'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess: (userId: string, email: string) => void
  onDemoMode: () => void
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, onDemoMode }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!email || !password) {
      setErrorMsg('Please provide both email and password.')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const res = await signUpWithEmail(email, password)
        if (res.user) {
          onAuthSuccess(res.user.id, res.user.email || email)
        } else {
          setErrorMsg('Registration initiated. Check email or sign in.')
        }
      } else {
        const res = await signInWithEmail(email, password)
        if (res.user) {
          onAuthSuccess(res.user.id, res.user.email || email)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 relative border"
        style={{ borderColor: '#e2e8f0' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0d9488' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7 2 3 6 3 11c0 2.5 1 4.8 2.6 6.5L12 22l6.4-4.5C20 16 21 13.5 21 11c0-5-4-9-9-9z" fill="white" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 18, color: '#0f172a' }}>
            SmartWear {isSignUp ? 'Account Registration' : 'Sign In'}
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="user@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm border outline-none focus:ring-2"
              style={{ borderColor: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm border outline-none focus:ring-2"
              style={{ borderColor: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm font-semibold mt-2"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account & Continue' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t text-center space-y-2" style={{ borderColor: '#f1f5f9' }}>
          <p className="text-xs" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setErrorMsg('')
              }}
              className="font-bold underline"
              style={{ color: '#0d9488' }}
            >
              {isSignUp ? 'Sign In' : 'Register Now'}
            </button>
          </p>

          <button
            type="button"
            onClick={() => {
              onClose()
              onDemoMode()
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 underline block mx-auto pt-1"
          >
            Explore Demo without Sign In →
          </button>
        </div>
      </div>
    </div>
  )
}
