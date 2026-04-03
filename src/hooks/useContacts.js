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

  const update = async (id, fields) => {
    const { data, error } = await supabase
      .from('contacts')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (!error) setContacts((prev) => prev.map((c) => (c.id === id ? data : c)))
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
    if (!error) setContacts((prev) => prev.filter((c) => c.id !== id))
    return { error }
  }

  return { contacts, loading, error, refetch: fetch, create, update, remove }
}

export function useContact(id) {
  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setContact(data)
        setLoading(false)
      })
  }, [id])

  const update = async (fields) => {
    const { data, error } = await supabase
      .from('contacts')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (!error) setContact((prev) => ({ ...prev, ...data }))
    return { data, error }
  }

  const remove = async () => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
    return { error }
  }

  return { contact, loading, error, update, remove, setContact }
}
