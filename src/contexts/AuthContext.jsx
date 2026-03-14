import { createContext, useContext } from 'react'

const AuthContext = createContext({
  user: null,
  loading: false,
  signIn: async () => {},
  signOut: async () => {}
})

export function AuthProvider({ children }) {
  return children
}

export const useAuth = () => useContext(AuthContext)