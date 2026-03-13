import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*, customers(first_name, last_name)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setLeads(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (fields) => {
    const { data, error } = await supabase.from('leads').insert([fields]).select().single()
    if (!error) setLeads((prev) => [data, ...prev])
    return { data, error }
  }

  const update = async (id, fields) => {
    const { data, error } = await supabase.from('leads').update(fields).eq('id', id).select().single()
    if (!error) setLeads((prev) => prev.map((l) => (l.id === id ? data : l)))
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (!error) setLeads((prev) => prev.filter((l) => l.id !== id))
    return { error }
  }

  return { leads, loading, error, refetch: fetch, create, update, remove }
}

export function useLead(id) {
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase.from('leads').select('*, customers(*)').eq('id', id).single().then(({ data, error }) => {
      if (error) setError(error.message)
      else setLead(data)
      setLoading(false)
    })
  }, [id])

  const update = async (fields) => {
    const { data, error } = await supabase.from('leads').update(fields).eq('id', id).select().single()
    if (!error) setLead((prev) => ({ ...prev, ...data }))
    return { data, error }
  }

  return { lead, loading, error, update, setLead }
}
