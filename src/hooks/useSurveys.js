import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSurveys() {
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('surveys')
      .select('*, customers(first_name, last_name), leads(name)')
      .order('scheduled_date', { ascending: true, nullsFirst: false })
    if (error) setError(error.message)
    else setSurveys(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { surveys, loading, error, refetch: fetch }
}

export function useSurvey(id) {
  const [survey, setSurvey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase
      .from('surveys')
      .select('*, customers(*), leads(name, email, phone)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setSurvey(data)
        setLoading(false)
      })
  }, [id])

  const update = async (fields) => {
    const { data, error } = await supabase.from('surveys').update(fields).eq('id', id).select().single()
    if (!error) setSurvey((prev) => ({ ...prev, ...data }))
    return { data, error }
  }

  return { survey, loading, error, update, setSurvey }
}
