import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useDeal } from '../../hooks/useDeals'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import { formatCurrency, formatDate, formatDatetime } from '../../lib/utils'
import {
  STAGES,
  STAGE_LABELS,
  STAGE_PROBABILITY,
  SOURCES,
  SHOWER_TYPES,
  GLASS_SUPPLIERS,
  HARDWARE_SUPPLIERS,
} from './DealsList'

const PRIORITIES = ['Low', 'Medium', 'High']
const DEAL_TYPES = ['New Business', 'Renewal', 'Upsell', 'Referral']

function computeDealScore(deal) {
  const probability = STAGE_PROBABILITY[deal.stage] ?? 10

  let daysUntilClose = null
  if (deal.close_date) {
    daysUntilClose = Math.ceil(
      (new Date(deal.close_date) - new Date()) / (1000 * 60 * 60 * 24)
    )
  }

  let daysInStage = null
  if (deal.stage_changed_at) {
    daysInStage = Math.max(
      0,
      Math.floor((new Date() - new Date(deal.stage_changed_at)) / (1000 * 60 * 60 * 24))
    )
  }

  const contacted = !!deal.last_contacted
  let daysSinceContact = null
  if (deal.last_contacted) {
    daysSinceContact = Math.floor(
      (new Date() - new Date(deal.last_contacted)) / (1000 * 60 * 60 * 24)
    )
  }

  // Score calculation
  let score = probability * 0.4 // 40% from stage probability

  if (daysUntilClose !== null) {
    if (daysUntilClose > 0 && daysUntilClose <= 14) score += 25
    else if (daysUntilClose > 14 && daysUntilClose <= 30) score += 20
    else if (daysUntilClose > 30) score += 10
  }

  if (daysInStage !== null) {
    if (daysInStage <= 3) score += 15
    else if (daysInStage <= 7) score += 10
    else if (daysInStage <= 14) score += 5
  }

  if (contacted) {
    score += 10
    if (daysSinceContact !== null && daysSinceContact <= 7) score += 10
  }

  return {
    score: Math.min(100, Math.round(score)),
    probability,
    daysUntilClose,
    daysInStage,
    contacted,
    daysSinceContact,
  }
}

function ScoreDial({ score }) {
  const color =
    score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'
  return (
    <div
      className="w-20 h-20 rounded-full border-4 flex items-center justify-center shrink-0"
      style={{ borderColor: color }}
    >
      <span className="text-2xl font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

function ScoreFactor({ icon: Icon, color, children }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Icon className={`w-4 h-4 shrink-0 ${color}`} />
      {children}
    </div>
  )
}

export default function DealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { deal, loading, error, update, setDeal } = useDeal(id)
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const openEdit = () => {
    setForm({
      ...deal,
      close_date: deal.close_date || '',
      last_contacted: deal.last_contacted ? deal.last_contacted.slice(0, 16) : '',
    })
    setEditModal(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const payload = {
      ...form,
      amount: form.amount ? parseFloat(form.amount) : null,
      final_order_value: form.final_order_value ? parseFloat(form.final_order_value) : null,
      close_date: form.close_date || null,
      last_contacted: form.last_contacted || null,
    }
    const { error } = await update(payload)
    setSaving(false)
    if (error) setSaveError(error.message)
    else setEditModal(false)
  }

  const handleStageChange = async (stage) => {
    await update({ stage, stage_changed_at: new Date().toISOString() })
    setDeal((prev) => ({ ...prev, stage, stage_changed_at: new Date().toISOString() }))
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (error || !deal)
    return <div className="text-red-600 py-10 text-center">{error || 'Deal not found'}</div>

  const ds = computeDealScore(deal)

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/deals')}
          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-800">{deal.deal_name}</h2>
          <p className="text-sm text-slate-500">Deal · Created {formatDatetime(deal.created_at)}</p>
        </div>
        <Badge status={deal.stage} />
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="!p-4">
          <p className="text-xs text-slate-500 mb-1">Amount</p>
          <p className="text-lg font-semibold text-slate-800">{deal.amount ? formatCurrency(deal.amount) : '—'}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-slate-500 mb-1">Close Date</p>
          <p className="text-lg font-semibold text-slate-800">{deal.close_date ? formatDate(deal.close_date) : '—'}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-slate-500 mb-1">Deal Score</p>
          <p className="text-lg font-semibold text-slate-800">{ds.score} / 100</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: details + pipeline */}
        <div className="lg:col-span-1 space-y-4">
          {/* About this deal */}
          <Card>
            <CardHeader
              title="About this Deal"
              action={<Button size="sm" variant="secondary" onClick={openEdit}>Edit</Button>}
            />
            <div className="space-y-3 text-sm">
              <DetailRow label="Deal Owner" value={deal.deal_owner || 'Matt Hopkinson'} />
              <DetailRow label="Last Contacted" value={deal.last_contacted ? formatDatetime(deal.last_contacted) : null} />
              <DetailRow label="Final Order Value" value={deal.final_order_value ? formatCurrency(deal.final_order_value) : null} />
              <DetailRow label="Install Required" value={deal.install_required} />
              <DetailRow label="Lead Source" value={deal.lead_source} />
              <DetailRow label="Shower Type" value={deal.shower_type} />
              <DetailRow label="Deal Type" value={deal.deal_type || 'New Business'} />
              <DetailRow label="Priority" value={deal.priority || 'Low'} />
              <DetailRow label="Design Reference" value={deal.design_reference} />
              <DetailRow label="Glass Supplier" value={deal.glass_supplier} />
              <DetailRow label="Hardware Supplier" value={deal.hardware_supplier} />
              {deal.notes && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                  <p className="text-slate-600 leading-relaxed">{deal.notes}</p>
                </div>
              )}
              {deal.customer_id && (
                <div className="pt-3 border-t border-slate-100">
                  <Link to={`/customers/${deal.customer_id}`}>
                    <Button variant="secondary" size="sm" className="w-full justify-center">
                      View Customer →
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* Pipeline stage */}
          <Card>
            <CardHeader title="Pipeline Stage" />
            <div className="space-y-1.5">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    deal.stage === s
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>{STAGE_LABELS[s]}</span>
                  <span className={`text-xs ${deal.stage === s ? 'text-indigo-500' : 'text-slate-400'}`}>
                    {STAGE_PROBABILITY[s]}%
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column: deal score */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Deal Score" />
            <div className="flex items-start gap-6">
              <ScoreDial score={ds.score} />
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Key factors</p>

                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Progression</p>
                  <div className="space-y-1 mb-3">
                    <ScoreFactor
                      icon={ds.probability <= 25 ? TrendingDown : TrendingUp}
                      color={ds.probability <= 25 ? 'text-red-500' : 'text-green-500'}
                    >
                      Deal probability is {ds.probability}%
                    </ScoreFactor>

                    {ds.daysUntilClose !== null ? (
                      <ScoreFactor
                        icon={ds.daysUntilClose < 0 ? TrendingDown : ds.daysUntilClose <= 7 ? TrendingDown : TrendingUp}
                        color={ds.daysUntilClose < 0 ? 'text-red-500' : ds.daysUntilClose <= 7 ? 'text-amber-500' : 'text-green-500'}
                      >
                        {ds.daysUntilClose < 0
                          ? `${Math.abs(ds.daysUntilClose)} days past close date`
                          : ds.daysUntilClose === 0
                          ? 'Close date is today'
                          : `${ds.daysUntilClose} day${ds.daysUntilClose !== 1 ? 's' : ''} until close date`}
                      </ScoreFactor>
                    ) : (
                      <ScoreFactor icon={Minus} color="text-slate-400">No close date set</ScoreFactor>
                    )}

                    {ds.daysInStage !== null ? (
                      <ScoreFactor
                        icon={ds.daysInStage <= 7 ? TrendingUp : TrendingDown}
                        color={ds.daysInStage <= 7 ? 'text-green-500' : 'text-amber-500'}
                      >
                        {ds.daysInStage === 0 ? 'Moved to this stage today' : `${ds.daysInStage} day${ds.daysInStage !== 1 ? 's' : ''} in current stage`}
                      </ScoreFactor>
                    ) : (
                      <ScoreFactor icon={Minus} color="text-slate-400">Stage duration unknown</ScoreFactor>
                    )}
                  </div>

                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Engagement</p>
                  <div className="space-y-1 mb-3">
                    <ScoreFactor
                      icon={ds.contacted ? TrendingUp : TrendingDown}
                      color={ds.contacted ? 'text-green-500' : 'text-red-500'}
                    >
                      {ds.contacted
                        ? `Last contacted ${ds.daysSinceContact === 0 ? 'today' : `${ds.daysSinceContact} day${ds.daysSinceContact !== 1 ? 's' : ''} ago`}`
                        : 'Not yet contacted'}
                    </ScoreFactor>
                  </div>

                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Recency of engagement</p>
                  <div className="space-y-1">
                    <ScoreFactor
                      icon={ds.contacted && ds.daysSinceContact !== null && ds.daysSinceContact <= 7 ? TrendingUp : Minus}
                      color={ds.contacted && ds.daysSinceContact !== null && ds.daysSinceContact <= 7 ? 'text-green-500' : 'text-slate-400'}
                    >
                      {ds.contacted && ds.daysSinceContact !== null
                        ? ds.daysSinceContact <= 7
                          ? 'Contacted within the last 7 days'
                          : `No contact in ${ds.daysSinceContact} days`
                        : 'No recorded activity'}
                    </ScoreFactor>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Deal">
        <form onSubmit={handleEdit} className="space-y-4">
          {saveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
          <FormInput label="Deal Name" required value={form.deal_name || ''} onChange={set('deal_name')} />
          <FormInput label="Deal Owner" value={form.deal_owner || ''} onChange={set('deal_owner')} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Amount (£)" type="number" step="0.01" value={form.amount || ''} onChange={set('amount')} />
            <FormInput label="Final Order Value (£)" type="number" step="0.01" value={form.final_order_value || ''} onChange={set('final_order_value')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Close Date" type="date" value={form.close_date || ''} onChange={set('close_date')} />
            <FormInput label="Last Contacted" type="datetime-local" value={form.last_contacted || ''} onChange={set('last_contacted')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Deal Type" value={form.deal_type || 'New Business'} onChange={set('deal_type')}>
              {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </FormSelect>
            <FormSelect label="Priority" value={form.priority || 'Low'} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </FormSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Lead Source" value={form.lead_source || ''} onChange={set('lead_source')}>
              <option value="">— Select —</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
            <FormSelect label="Shower Type" value={form.shower_type || ''} onChange={set('shower_type')}>
              <option value="">— Select —</option>
              {SHOWER_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
          </div>
          <FormSelect label="Install Required" value={form.install_required || ''} onChange={set('install_required')}>
            <option value="">— Select —</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="TBC">TBC</option>
          </FormSelect>
          <FormInput label="Design Reference" value={form.design_reference || ''} onChange={set('design_reference')} />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Glass Supplier" value={form.glass_supplier || ''} onChange={set('glass_supplier')}>
              <option value="">— Select —</option>
              {GLASS_SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
            <FormSelect label="Hardware Supplier" value={form.hardware_supplier || ''} onChange={set('hardware_supplier')}>
              <option value="">— Select —</option>
              {HARDWARE_SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
          </div>
          <FormTextarea label="Notes" value={form.notes || ''} onChange={set('notes')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-slate-700 font-medium">{value || '—'}</p>
    </div>
  )
}
