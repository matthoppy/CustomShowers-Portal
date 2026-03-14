import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useDeals } from '../../hooks/useDeals'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import { formatCurrency, formatDate } from '../../lib/utils'

export const STAGES = [
  'new_enquiry',
  'design_received',
  'quote_sent',
  'quote_accepted',
  'ordered_from_supplier',
  'in_production',
  'ready_for_delivery',
  'completed',
  'lost_on_hold',
]

export const STAGE_LABELS = {
  new_enquiry:             'New Enquiry',
  design_received:         'Design Received',
  quote_sent:              'Quote Sent',
  quote_accepted:          'Quote Accepted',
  ordered_from_supplier:   'Ordered from Supplier',
  in_production:           'In Production',
  ready_for_delivery:      'Ready for Delivery/Install',
  completed:               'Completed',
  lost_on_hold:            'Lost / On Hold',
}

export const STAGE_PROBABILITY = {
  new_enquiry:           10,
  design_received:       25,
  quote_sent:            40,
  quote_accepted:        60,
  ordered_from_supplier: 75,
  in_production:         85,
  ready_for_delivery:    95,
  completed:             100,
  lost_on_hold:          0,
}

const PRIORITIES = ['Low', 'Medium', 'High']
const DEAL_TYPES = ['New Business', 'Renewal', 'Upsell', 'Referral']
export const SOURCES = ['Website', 'Referral', 'Google', 'Social Media', 'Checkatrade', 'Other']
export const SHOWER_TYPES = ['Frameless', 'Semi-Frameless', 'Framed', 'Walk-In', 'Wet Room', 'Bespoke']
export const GLASS_SUPPLIERS = ['AGC', 'Pilkington', 'Guardian', 'Saint-Gobain', 'Other']
export const HARDWARE_SUPPLIERS = ['Simpsons', 'Merlyn', 'Matki', 'Roman', 'Lakes', 'Other']

const EMPTY_FORM = {
  deal_name: '',
  deal_owner: 'Matt Hopkinson',
  amount: '',
  close_date: '',
  stage: 'new_enquiry',
  deal_type: 'New Business',
  priority: 'Low',
  lead_source: '',
  shower_type: '',
  notes: '',
}

export default function DealsList() {
  const { deals, loading, create } = useDeals()
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
    const payload = {
      ...form,
      amount: form.amount ? parseFloat(form.amount) : null,
      close_date: form.close_date || null,
      stage_changed_at: new Date().toISOString(),
    }
    const { data, error } = await create(payload)
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setModal(false)
      setForm(EMPTY_FORM)
      navigate(`/deals/${data.id}`)
    }
  }

  const filtered = filter === 'all' ? deals : deals.filter((d) => d.stage === filter)

  const stageCounts = deals.reduce((acc, d) => {
    acc[d.stage] = (acc[d.stage] || 0) + 1
    return acc
  }, {})

  const columns = [
    { key: 'deal_name', label: 'Deal Name' },
    { key: 'deal_owner', label: 'Owner' },
    {
      key: 'stage',
      label: 'Stage',
      render: (val) => <Badge status={val} />,
    },
    { key: 'deal_type', label: 'Type' },
    { key: 'priority', label: 'Priority' },
    {
      key: 'amount',
      label: 'Amount',
      accessor: (r) => (r.amount ? formatCurrency(r.amount) : '—'),
    },
    {
      key: 'close_date',
      label: 'Close Date',
      accessor: (r) => (r.close_date ? formatDate(r.close_date) : '—'),
    },
  ]

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Deals</h2>
          <p className="text-sm text-slate-500">{deals.length} total</p>
        </div>
        <Button icon={Plus} onClick={() => setModal(true)}>Add Deal</Button>
      </div>

      {/* Stage filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'All'], ...STAGES.map((s) => [s, STAGE_LABELS[s]])].map(([val, label]) => (
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
            {val !== 'all' && stageCounts[val] !== undefined && (
              <span className={`ml-1.5 ${filter === val ? 'opacity-75' : 'text-slate-400'}`}>
                {stageCounts[val] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(r) => navigate(`/deals/${r.id}`)}
        searchPlaceholder="Search deals..."
        emptyMessage={loading ? 'Loading...' : 'No deals found'}
      />

      <Modal open={modal} onClose={() => setModal(false)} title="Add New Deal">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <FormInput label="Deal Name" required value={form.deal_name} onChange={set('deal_name')} placeholder="e.g. Smith Bathroom Renovation" />
          <FormInput label="Deal Owner" value={form.deal_owner} onChange={set('deal_owner')} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Amount (£)" type="number" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" />
            <FormInput label="Close Date" type="date" value={form.close_date} onChange={set('close_date')} />
          </div>
          <FormSelect label="Stage" value={form.stage} onChange={set('stage')}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </FormSelect>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Deal Type" value={form.deal_type} onChange={set('deal_type')}>
              {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </FormSelect>
            <FormSelect label="Priority" value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </FormSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Lead Source" value={form.lead_source} onChange={set('lead_source')}>
              <option value="">— Select —</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
            <FormSelect label="Shower Type" value={form.shower_type} onChange={set('shower_type')}>
              <option value="">— Select —</option>
              {SHOWER_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
          </div>
          <FormTextarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Initial deal notes..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Deal'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
