import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('jobs')
      .select('*, customers(first_name, last_name), quotes(quote_number)')
      .order('scheduled_date', { ascending: true, nullsFirst: false })
    if (error) setError(error.message)
    else setJobs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (fields) => {
    const { data, error } = await supabase.from('jobs').insert([fields]).select().single()
    if (!error) setJobs((prev) => [data, ...prev])
    return { data, error }
  }

  const update = async (id, fields) => {
    const { data, error } = await supabase.from('jobs').update(fields).eq('id', id).select().single()
    if (!error) setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...data } : j)))
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (!error) setJobs((prev) => prev.filter((j) => j.id !== id))
    return { error }
  }

  return { jobs, loading, error, refetch: fetch, create, update, remove }
}

export function useJob(id) {
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase
      .from('jobs')
      .select('*, customers(*), quotes(quote_number, total, subtotal, vat_rate, vat_amount)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setJob(data)
        setLoading(false)
      })
  }, [id])

  const update = async (fields) => {
    const { data, error } = await supabase.from('jobs').update(fields).eq('id', id).select().single()
    if (!error) setJob((prev) => ({ ...prev, ...data }))
    return { data, error }
  }

  return { job, loading, error, update, setJob }
}
