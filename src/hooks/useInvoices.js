import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useInvoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select('*, customers(first_name, last_name), jobs(job_number)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setInvoices(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const update = async (id, fields) => {
    const { data, error } = await supabase.from('invoices').update(fields).eq('id', id).select().single()
    if (!error) setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...data } : inv)))
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (!error) setInvoices((prev) => prev.filter((inv) => inv.id !== id))
    return { error }
  }

  return { invoices, loading, error, refetch: fetch, update, remove }
}

export function useInvoice(id) {
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      supabase.from('invoices').select('*, customers(*), jobs(job_number)').eq('id', id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id).order('created_at'),
    ]).then(([{ data: inv, error: invErr }, { data: ii }]) => {
      if (invErr) setError(invErr.message)
      else {
        setInvoice(inv)
        setItems(ii || [])
      }
      setLoading(false)
    })
  }, [id])

  const update = async (fields) => {
    const { data, error } = await supabase.from('invoices').update(fields).eq('id', id).select().single()
    if (!error) setInvoice((prev) => ({ ...prev, ...data }))
    return { data, error }
  }

  return { invoice, items, loading, error, update, setInvoice, setItems }
}
