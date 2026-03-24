import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ALLOWED_EMAIL = 'matt@customshowers.uk'

const AuthContext = createContext({
  user: null,
  loading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  accessDenied: false,
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      if (u && u.email !== ALLOWED_EMAIL) {
        supabase.auth.signOut()
        setAccessDenied(true)
        setUser(null)
      } else {
        setUser(u)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      if (u && u.email !== ALLOWED_EMAIL) {
        await supabase.auth.signOut()
        setAccessDenied(true)
        setUser(null)
      } else {
        setAccessDenied(false)
        setUser(u)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    setAccessDenied(false)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, accessDenied, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
