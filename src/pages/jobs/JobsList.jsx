import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useJobs } from '../../hooks/useJobs'
import { useCustomers } from '../../hooks/useCustomers'
import { supabase } from '../../lib/supabase'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import { formatDate } from '../../lib/utils'

const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled']
const JOB_TYPES = [
  { value: 'supply_only', label: 'Supply Only' },
  { value: 'supply_and_install', label: 'Supply + London Installation' },
]
const EMPTY_FORM = { customer_id: '', title: '', description: '', status: 'scheduled', scheduled_date: '', notes: '', job_type: 'supply_only' }

export default function JobsList() {
  const { jobs, loading, refetch } = useJobs()
  const { customers } = useCustomers()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true })
    const job_number = `JB-${String((count || 0) + 1).padStart(3, '0')}`
    const { data, error } = await supabase.from('jobs').insert([{
      ...form, job_number,
      customer_id: form.customer_id || null,
      scheduled_date: form.scheduled_date || null,
    }]).select().single()
    setSaving(false)
    if (error) { setError(error.message) } else {
      setModal(false); setForm(EMPTY_FORM); refetch(); navigate(`/jobs/${data.id}`)
    }
  }

  const filtered = jobs.filter((j) => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false
    if (typeFilter !== 'all' && j.job_type !== typeFilter) return false
    return true
  })

  const statusCounts = jobs.reduce((acc, j) => { acc[j.status] = (acc[j.status] || 0) + 1; return acc }, {})

  const columns = [
    { key: 'job_number', label: 'Job #' },
    { key: 'customer', label: 'Customer', accessor: (r) => r.customers ? `${r.customers.first_name} ${r.customers.last_name}` : '—' },
    { key: 'title', label: 'Title' },
    { key: 'job_type', label: 'Type', render: (val) => <Badge status={val} /> },
    { key: 'status', label: 'Status', render: (val) => <Badge status={val} /> },
    { key: 'scheduled_date', label: 'Scheduled', accessor: (r) => formatDate(r.scheduled_date) },
  ]

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Jobs</h2>
          <p className="text-sm text-slate-500">{jobs.length} total</p>
        </div>
        <Button icon={Plus} onClick={() => setModal(true)}>Add Job</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['all', 'All Types'], ['supply_only', 'Supply Only'], ['supply_and_install', 'Supply + Install']].map(([val, label]) => (
          <button key={val} onClick={() => setTypeFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === val ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
            {label}
          </button>
        ))}
        <span className="border-l border-slate-200 mx-1" />
        {[['all', 'All'], ...STATUSES.map((s) => [s, s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)])].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === val ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-700'}`}>
            {label}
            {val !== 'all' && <span className={`ml-1.5 ${statusFilter === val ? 'opacity-75' : 'text-slate-400'}`}>{statusCounts[val] || 0}</span>}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} onRowClick={(r) => navigate(`/jobs/${r.id}`)}
        searchPlaceholder="Search jobs..." emptyMessage={loading ? 'Loading...' : 'No jobs found'} />

      <Modal open={modal} onClose={() => setModal(false)} title="Add New Job">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <FormInput label="Job Title" required value={form.title} onChange={set('title')} placeholder="e.g. Wetroom installation" />
          <FormSelect label="Job Type" value={form.job_type} onChange={set('job_type')}>
            {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </FormSelect>
          <FormSelect label="Customer" value={form.customer_id} onChange={set('customer_id')}>
            <option value="">— No customer selected —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </FormSelect>
          <FormSelect label="Status" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </FormSelect>
          <FormInput label="Scheduled Date" type="date" value={form.scheduled_date} onChange={set('scheduled_date')} />
          <FormTextarea label="Description" value={form.description} onChange={set('description')} placeholder="Job details..." />
          <FormTextarea label="Notes" value={form.notes} onChange={set('notes')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Job'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
