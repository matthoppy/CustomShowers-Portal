import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Phone, Mail, MapPin, FileText } from 'lucide-react'
import { useSurvey } from '../../hooks/useSurveys'
import { useCustomers } from '../../hooks/useCustomers'
import { useLeads } from '../../hooks/useLeads'
import { supabase } from '../../lib/supabase'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import { formatDate, formatDatetime } from '../../lib/utils'

const STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled']
const JOB_TYPES = [
  { value: 'supply_only', label: 'Supply Only' },
  { value: 'supply_and_install', label: 'Supply + London Installation' },
]

export default function SurveyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { survey, loading, error, update, setSurvey } = useSurvey(id)
  const { customers } = useCustomers()
  const { leads } = useLeads()
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal, setNotesVal] = useState('')

  const openEdit = () => { setForm({ ...survey }); setEditModal(true) }
  const openNotesEdit = () => { setNotesVal(survey.notes || ''); setEditingNotes(true) }
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true); setSaveError('')
    const { error } = await update(form)
    setSaving(false)
    if (error) setSaveError(error.message)
    else setEditModal(false)
  }

  const handleStatusChange = async (status) => {
    const { data } = await update({ status })
    if (data) setSurvey((prev) => ({ ...prev, status }))
  }

  const handleSaveNotes = async () => {
    await update({ notes: notesVal })
    setSurvey((prev) => ({ ...prev, notes: notesVal }))
    setEditingNotes(false)
  }

  const handleCreateQuote = async () => {
    const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true })
    const quote_number = `QT-${String((count || 0) + 1).padStart(3, '0')}`
    const { data } = await supabase.from('quotes').insert([{
      quote_number, customer_id: survey.customer_id || null,
      status: 'draft', subtotal: 0, vat_rate: 20, vat_amount: 0, total: 0,
      notes: `From survey ${survey.survey_number} — ${survey.address || ''}`,
    }]).select().single()
    if (data) navigate(`/quotes/${data.id}/edit`)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  if (error || !survey) return <div className="text-red-600 py-10 text-center">{error || 'Survey not found'}</div>

  const contactName = survey.customers ? `${survey.customers.first_name} ${survey.customers.last_name}` : survey.contact_name
  const contactEmail = survey.customers?.email || survey.contact_email
  const contactPhone = survey.customers?.phone || survey.contact_phone

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/surveys')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-800">Survey · {survey.survey_number}</h2>
          <p className="text-sm text-slate-500">Booked {formatDatetime(survey.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={survey.job_type} />
          <Badge status={survey.status} />
          <Button icon={Edit2} variant="secondary" size="sm" onClick={openEdit}>Edit</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Survey Details" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">Contact</p>
                <p className="text-slate-800 font-medium">{contactName || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Job Type</p>
                <Badge status={survey.job_type} />
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Date & Time</p>
                <p className="text-slate-700">
                  {survey.scheduled_date ? formatDate(survey.scheduled_date) : '—'}
                  {survey.scheduled_time && <span className="ml-2 text-slate-500">at {survey.scheduled_time}</span>}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Address</p>
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-slate-700">{survey.address || '—'}</p>
                </div>
              </div>
              {contactPhone && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Phone</p>
                  <a href={`tel:${contactPhone}`} className="flex items-center gap-1.5 text-indigo-600 hover:underline">
                    <Phone className="w-3.5 h-3.5" />{contactPhone}
                  </a>
                </div>
              )}
              {contactEmail && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Email</p>
                  <a href={`mailto:${contactEmail}`} className="flex items-center gap-1.5 text-indigo-600 hover:underline">
                    <Mail className="w-3.5 h-3.5" />{contactEmail}
                  </a>
                </div>
              )}
            </div>
            {(survey.customers || survey.leads) && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6 text-sm">
                {survey.customers && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Customer Record</p>
                    <Link to={`/customers/${survey.customer_id}`} className="text-indigo-600 hover:underline">
                      {survey.customers.first_name} {survey.customers.last_name}
                    </Link>
                  </div>
                )}
                {survey.leads && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Lead</p>
                    <Link to={`/leads/${survey.lead_id}`} className="text-indigo-600 hover:underline">{survey.leads.name}</Link>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Notes"
              action={!editingNotes && (
                <button onClick={openNotesEdit} className="text-xs text-indigo-600 hover:underline">
                  {survey.notes ? 'Edit notes' : 'Add notes'}
                </button>
              )}
            />
            {editingNotes ? (
              <div className="space-y-3">
                <textarea
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  rows={5} value={notesVal} onChange={(e) => setNotesVal(e.target.value)} autoFocus
                  placeholder="Measurements, access info, customer requirements, special requests..."
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setEditingNotes(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveNotes}>Save Notes</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap min-h-[3rem]">
                {survey.notes || <span className="text-slate-400 italic">No notes yet — click "Add notes" to record survey findings, measurements, or access info.</span>}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Update Status" />
            <div className="space-y-2">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => handleStatusChange(s)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    survey.status === s ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                  <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                  {survey.status === s && <span className="text-xs text-indigo-500">Current</span>}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Next Step" />
            <Button icon={FileText} variant="primary" className="w-full justify-center" onClick={handleCreateQuote}>
              Create Quote
            </Button>
          </Card>
        </div>
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Survey" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          {saveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Contact Name" required value={form.contact_name || ''} onChange={set('contact_name')} />
            <FormInput label="Phone" value={form.contact_phone || ''} onChange={set('contact_phone')} />
          </div>
          <FormInput label="Email" type="email" value={form.contact_email || ''} onChange={set('contact_email')} />
          <FormInput label="Address" value={form.address || ''} onChange={set('address')} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Date" type="date" value={form.scheduled_date || ''} onChange={set('scheduled_date')} />
            <FormInput label="Time" type="time" value={form.scheduled_time || ''} onChange={set('scheduled_time')} />
          </div>
          <FormSelect label="Job Type" value={form.job_type || 'supply_only'} onChange={set('job_type')}>
            {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </FormSelect>
          <FormSelect label="Status" value={form.status || 'scheduled'} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </FormSelect>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Link to Customer" value={form.customer_id || ''} onChange={set('customer_id')}>
              <option value="">— None —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </FormSelect>
            <FormSelect label="Link to Lead" value={form.lead_id || ''} onChange={set('lead_id')}>
              <option value="">— None —</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </FormSelect>
          </div>
          <FormTextarea label="Notes" value={form.notes || ''} onChange={set('notes')} rows={4} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
