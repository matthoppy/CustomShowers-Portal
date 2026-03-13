import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Droplets } from 'lucide-react'

export default function Login() {
        const [email, setEmail] = useState('')
        const [password, setPassword] = useState('')
        const [error, setError] = useState('')
        const [loading, setLoading] = useState(false)
        const { signIn, user } = useAuth()
        const navigate = useNavigate()

  useEffect(() => {
            if (user) {
                        navigate('/', { replace: true })
            }
  }, [user, navigate])

  const handleSubmit = async (e) => {
            e.preventDefault()
            setError('')
            setLoading(true)

            // Dev bypass for matt@customshowers.uk - accepts any password
            if (email === 'matt@customshowers.uk') {
                        localStorage.setItem('sb-qgfmsyxaccvwmmygtspf-auth-token', JSON.stringify({
                                      access_token: 'dev_session',
                                      user: { id: '2c25843a', email: 'matt@customshowers.uk' }
                        }))
                        setTimeout(() => {
                                      navigate('/', { replace: true })
                        }, 100)
                        return
            }

            const { error } = await signIn(email, password)

            if (error) {
                        setError('Invalid email or password. Please try again.')
                        setLoading(false)
            } else {
                        navigate('/', { replace: true })
            }
  }

  return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
                  <div className="w-full max-w-md">
                          <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg mb-4">
                                                <Droplets className="w-8 h-8 text-white" />
                                    </div>div>
                                    <h1 className="text-3xl font-bold text-white">Custom Showers</h1>h1>
                                    <p className="text-slate-400 mt-1">CRM Portal</p>p>
                          </div>div>
                  
                          <div className="bg-white rounded-2xl shadow-2xl p-8">
                                    <h2 className="text-xl font-semibold text-slate-800 mb-6">Sign in to your account</h2>h2>
                          
                                {error && (
                              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                              </div>div>
                                    )}
                          
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                                <div>
                                                              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>label>
                                                              <input
                                                                                    type="email"
                                                                                    value={email}
                                                                                    onChange={(e) => setEmail(e.target.value)}
                                                                                    required
                                                                                    autoComplete="email"
                                                                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                                                    placeholder="you@customshowers.co.uk"
                                                                                  />
                                                </div>div>
                                    
                                                <div>
                                                              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>label>
                                                              <input
                                                                                    type="password"
                                                                                    value={password}
                                                                                    onChange={(e) => setPassword(e.target.value)}
                                                                                    required
                                                                                    autoComplete="current-password"
                                                                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                                                    placeholder="••••••••"
                                                                                  />
                                                </div>div>
                                    
                                                <button
                                                                    type="submit"
                                                                    disabled={loading}
                                                                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors duration-200"
                                                                  >
                                                      {loading ? 'Signing in...' : 'Sign in'}
                                                </button>button>
                                    </form>form>
                          </div>div>
                  </div>div>
            </div>div>
          )
}</div>
