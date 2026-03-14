import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDeals() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('deals')
      .select('*, customers(first_name, last_name)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setDeals(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (fields) => {
    const { data, error } = await supabase.from('deals').insert([fields]).select().single()
    if (!error) setDeals((prev) => [data, ...prev])
    return { data, error }
  }

  const update = async (id, fields) => {
    const { data, error } = await supabase.from('deals').update(fields).eq('id', id).select().single()
    if (!error) setDeals((prev) => prev.map((d) => (d.id === id ? data : d)))
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('deals').delete().eq('id', id)
    if (!error) setDeals((prev) => prev.filter((d) => d.id !== id))
    return { error }
  }

  return { deals, loading, error, refetch: fetch, create, update, remove }
}

export function useDeal(id) {
  const [deal, setDeal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase.from('deals').select('*, customers(*)').eq('id', id).single().then(({ data, error }) => {
      if (error) setError(error.message)
      else setDeal(data)
      setLoading(false)
    })
  }, [id])

  const update = async (fields) => {
    const { data, error } = await supabase.from('deals').update(fields).eq('id', id).select().single()
    if (!error) setDeal((prev) => ({ ...prev, ...data }))
    return { data, error }
  }

  return { deal, loading, error, update, setDeal }
}
