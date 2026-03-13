import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useLeads } from '../../hooks/useLeads'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import { formatDatetime } from '../../lib/utils'

const EMPTY_FORM = { name: '', email: '', phone: '', source: '', status: 'new', notes: '' }
const SOURCES = ['Website', 'Referral', 'Google', 'Social Media', 'Checkatrade', 'Other']
const STATUSES = ['new', 'contacted', 'qualified', 'lost']

export default function LeadsList() {
  const { leads, loading, create } = useLeads()
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { data, error } = await create(form)
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setModal(false)
      setForm(EMPTY_FORM)
      navigate(`/leads/${data.id}`)
    }
  }

  const filtered = filter === 'all' ? leads : leads.filter((l) => l.status === filter)

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'source', label: 'Source' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <Badge status={val} />,
    },
    {
      key: 'created_at',
      label: 'Received',
      accessor: (r) => formatDatetime(r.created_at),
    },
  ]

  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Leads</h2>
          <p className="text-sm text-slate-500">{leads.length} total</p>
        </div>
        <Button icon={Plus} onClick={() => setModal(true)}>Add Lead</Button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'All'], ...STATUSES.map((s) => [s, s.charAt(0).toUpperCase() + s.slice(1)])].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === val
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {label}
            {val !== 'all' && statusCounts[val] !== undefined && (
              <span className={`ml-1.5 ${filter === val ? 'opacity-75' : 'text-slate-400'}`}>
                {statusCounts[val] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(r) => navigate(`/leads/${r.id}`)}
        searchPlaceholder="Search leads..."
        emptyMessage={loading ? 'Loading...' : 'No leads found'}
      />

      <Modal open={modal} onClose={() => setModal(false)} title="Add New Lead">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <FormInput label="Full Name" required value={form.name} onChange={set('name')} placeholder="John Smith" />
          <FormInput label="Email" type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" />
          <FormInput label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="07700 900000" />
          <FormSelect label="Source" value={form.source} onChange={set('source')}>
            <option value="">— Select source —</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
          <FormSelect label="Status" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </FormSelect>
          <FormTextarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Initial enquiry details..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Lead'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
