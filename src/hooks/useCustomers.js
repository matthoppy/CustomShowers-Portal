import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setCustomers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (fields) => {
    const { data, error } = await supabase.from('customers').insert([fields]).select().single()
    if (!error) setCustomers((prev) => [data, ...prev])
    return { data, error }
  }

  const update = async (id, fields) => {
    const { data, error } = await supabase.from('customers').update(fields).eq('id', id).select().single()
    if (!error) setCustomers((prev) => prev.map((c) => (c.id === id ? data : c)))
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (!error) setCustomers((prev) => prev.filter((c) => c.id !== id))
    return { error }
  }

  return { customers, loading, error, refetch: fetch, create, update, remove }
}

export function useCustomer(id) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase.from('customers').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) setError(error.message)
      else setCustomer(data)
      setLoading(false)
    })
  }, [id])

  const update = async (fields) => {
    const { data, error } = await supabase.from('customers').update(fields).eq('id', id).select().single()
    if (!error) setCustomer(data)
    return { data, error }
  }

  return { customer, loading, error, update, setCustomer }
}
