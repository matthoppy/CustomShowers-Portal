import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Droplets } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function Login() {
  const { signInWithGoogle, user, loading, accessDenied } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle()
    if (error) console.error('Sign-in error:', error.message)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a2942' }}>
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1a2942' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-4">
            <Droplets className="w-8 h-8" style={{ color: '#1a2942' }} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Custom Showers</h1>
          <p className="text-blue-200 mt-1 text-sm">CRM Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {accessDenied ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-xl font-bold">!</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Access Denied</h2>
              <p className="text-sm text-slate-500 mb-6">
                This portal is restricted to authorised users only. Your Google account does not have access.
              </p>
              <button onClick={handleGoogleSignIn} className="text-sm text-blue-600 hover:underline">
                Try a different account
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Sign in</h2>
              <p className="text-sm text-slate-500 mb-6">
                Use your Custom Showers Google account to access the portal.
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 shadow-sm"
              >
                <GoogleIcon />
                Sign in with Google
              </button>
            </>
          )}
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          &copy; {new Date().getFullYear()} Custom Showers UK Ltd
        </p>
      </div>
    </div>
  )
}
