import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useQuotes() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customers(first_name, last_name)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setQuotes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const update = async (id, fields) => {
    const { data, error } = await supabase.from('quotes').update(fields).eq('id', id).select().single()
    if (!error) setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, ...data } : q)))
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (!error) setQuotes((prev) => prev.filter((q) => q.id !== id))
    return { error }
  }

  return { quotes, loading, error, refetch: fetch, update, remove }
}

export function useQuote(id) {
  const [quote, setQuote] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      supabase.from('quotes').select('*, customers(*), leads(job_type)').eq('id', id).single(),
      supabase.from('quote_items').select('*').eq('quote_id', id).order('created_at'),
    ]).then(([{ data: q, error: qErr }, { data: qi }]) => {
      if (qErr) setError(qErr.message)
      else {
        setQuote(q)
        setItems(qi || [])
      }
      setLoading(false)
    })
  }, [id])

  const update = async (fields) => {
    const { data, error } = await supabase.from('quotes').update(fields).eq('id', id).select().single()
    if (!error) setQuote((prev) => ({ ...prev, ...data }))
    return { data, error }
  }

  return { quote, items, loading, error, update, setQuote, setItems }
}
