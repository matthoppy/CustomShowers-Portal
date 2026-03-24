import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useContacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setContacts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (fields) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert([{ ...fields, source: 'manual' }])
      .select()
      .single()
    if (!error) setContacts((prev) => [data, ...prev])
    return { data, error }
  }

  return { contacts, loading, error, refetch: fetch, create }
}
