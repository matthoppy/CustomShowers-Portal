import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCalls() {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('calls')
      .select('*, contacts(name, email), leads(name, email)')
      .order('started_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setCalls(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { calls, loading, error, refetch: fetch }
}

export function useContactCalls(contactId) {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contactId) return
    setLoading(true)
    supabase
      .from('calls')
      .select('*')
      .eq('contact_id', contactId)
      .order('started_at', { ascending: false })
      .then(({ data }) => {
        setCalls(data || [])
        setLoading(false)
      })
  }, [contactId])

  return { calls, loading }
}

export function useLeadCalls(leadId) {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leadId) return
    setLoading(true)
    supabase
      .from('calls')
      .select('*')
      .eq('lead_id', leadId)
      .order('started_at', { ascending: false })
      .then(({ data }) => {
        setCalls(data || [])
        setLoading(false)
      })
  }, [leadId])

  return { calls, loading }
}

export function useCall(id) {
  const [call, setCall] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase
      .from('calls')
      .select('*, contacts(name, email, phone), leads(name, email, phone)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCall(data)
        setLoading(false)
      })
  }, [id])

  const update = async (fields) => {
    const { data, error } = await supabase.from('calls').update(fields).eq('id', id).select().single()
    if (!error) setCall((prev) => ({ ...prev, ...data }))
    return { data, error }
  }

  return { call, loading, error, update, setCall }
}
