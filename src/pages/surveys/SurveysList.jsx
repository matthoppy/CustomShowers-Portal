import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useSurveys } from '../../hooks/useSurveys'
import { useCustomers } from '../../hooks/useCustomers'
import { useLeads } from '../../hooks/useLeads'
import { supabase } from '../../lib/supabase'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import { formatDate } from '../../lib/utils'

const STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled']
const JOB_TYPES = [
  { value: 'supply_only', label: 'Supply Only' },
  { value: 'supply_and_install', label: 'Supply + London Installation' },
]
const EMPTY_FORM = {
  contact_name: '', contact_email: '', contact_phone: '',
  address: '', scheduled_date: '', scheduled_time: '',
  job_type: 'supply_only', status: 'scheduled',
  customer_id: '', lead_id: '', notes: '',
}

export default function SurveysList() {
  const { surveys, loading, refetch } = useSurveys()
  const { customers } = useCustomers()
  const { leads } = useLeads()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { count } = await supabase.from('surveys').select('*', { count: 'exact', head: true })
    const survey_number = `SV-${String((count || 0) + 1).padStart(3, '0')}`
    const { data, error } = await supabase.from('surveys').insert([{
      ...form,
      survey_number,
      customer_id: form.customer_id || null,
      lead_id: form.lead_id || null,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
    }]).select().single()
    setSaving(false)
    if (error) { setError(error.message) } else {
      setModal(false); setForm(EMPTY_FORM); refetch(); navigate(`/surveys/${data.id}`)
    }
  }

  const filtered = surveys.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (typeFilter !== 'all' && s.job_type !== typeFilter) return false
    return true
  })

  const upcoming = surveys.filter((s) => s.status === 'scheduled').length

  const columns = [
    { key: 'survey_number', label: 'Survey #' },
    {
      key: 'contact_name',
      label: 'Contact',
      accessor: (r) => r.customers ? `${r.customers.first_name} ${r.customers.last_name}` : r.contact_name,
    },
    { key: 'job_type', label: 'Type', render: (val) => <Badge status={val} /> },
    {
      key: 'scheduled_date',
      label: 'Date & Time',
      accessor: (r) => r.scheduled_date
        ? `${formatDate(r.scheduled_date)}${r.scheduled_time ? ' · ' + r.scheduled_time : ''}`
        : '—',
    },
    { key: 'address', label: 'Address', accessor: (r) => r.address || '—' },
    { key: 'status', label: 'Status', render: (val) => <Badge status={val} /> },
  ]

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Surveys</h2>
          <p className="text-sm text-slate-500">{upcoming} upcoming · {surveys.length} total</p>
        </div>
        <Button icon={Plus} onClick={() => setModal(true)}>Book Survey</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['all', 'All Types'], ['supply_only', 'Supply Only'], ['supply_and_install', 'Supply + Install']].map(([val, label]) => (
          <button key={val} onClick={() => setTypeFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === val ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
            {label}
          </button>
        ))}
        <span className="border-l border-slate-200 mx-1" />
        {[['all', 'All Status'], ...STATUSES.map((s) => [s, s.charAt(0).toUpperCase() + s.slice(1)])].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === val ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} onRowClick={(r) => navigate(`/surveys/${r.id}`)}
        searchPlaceholder="Search surveys..." emptyMessage={loading ? 'Loading...' : 'No surveys found'} />

      <Modal open={modal} onClose={() => setModal(false)} title="Book Survey" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Contact Name" required value={form.contact_name} onChange={set('contact_name')} placeholder="Full name" />
            <FormInput label="Phone" value={form.contact_phone} onChange={set('contact_phone')} placeholder="07700 000000" />
          </div>
          <FormInput label="Email" type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="email@example.com" />
          <FormInput label="Survey Address" required value={form.address} onChange={set('address')} placeholder="Full address incl. postcode" />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Date" required type="date" value={form.scheduled_date} onChange={set('scheduled_date')} />
            <FormInput label="Time" type="time" value={form.scheduled_time} onChange={set('scheduled_time')} />
          </div>
          <FormSelect label="Job Type" value={form.job_type} onChange={set('job_type')}>
            {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </FormSelect>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Link to Customer (optional)" value={form.customer_id} onChange={set('customer_id')}>
              <option value="">— None —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </FormSelect>
            <FormSelect label="Link to Lead (optional)" value={form.lead_id} onChange={set('lead_id')}>
              <option value="">— None —</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </FormSelect>
          </div>
          <FormTextarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Measurements, access info, customer requirements..." rows={3} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Booking...' : 'Book Survey'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
