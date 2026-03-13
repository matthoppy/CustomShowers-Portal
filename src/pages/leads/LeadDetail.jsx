import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, UserCheck } from 'lucide-react'
import { useLead } from '../../hooks/useLeads'
import { supabase } from '../../lib/supabase'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import { formatDatetime } from '../../lib/utils'

const STATUSES = ['new', 'contacted', 'qualified', 'lost']
const SOURCES = ['Website', 'Referral', 'Google', 'Social Media', 'Checkatrade', 'Other']

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lead, loading, error, update, setLead } = useLead(id)
  const [editModal, setEditModal] = useState(false)
  const [convertModal, setConvertModal] = useState(false)
  const [form, setForm] = useState({})
  const [convertForm, setConvertForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address_line1: '', city: '', postcode: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const setC = (k) => (e) => setConvertForm((p) => ({ ...p, [k]: e.target.value }))

  const openEdit = () => {
    setForm({ ...lead })
    setEditModal(true)
  }

  const openConvert = () => {
    const nameParts = (lead.name || '').trim().split(' ')
    setConvertForm({
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      email: lead.email || '',
      phone: lead.phone || '',
      address_line1: '',
      city: '',
      postcode: '',
    })
    setConvertModal(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const { error } = await update(form)
    setSaving(false)
    if (error) setSaveError(error.message)
    else setEditModal(false)
  }

  const handleConvert = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .insert([convertForm])
      .select()
      .single()
    if (custErr) {
      setSaveError(custErr.message)
      setSaving(false)
      return
    }
    await update({ customer_id: customer.id, status: 'qualified' })
    setSaving(false)
    setConvertModal(false)
    navigate(`/customers/${customer.id}`)
  }

  const handleStatusChange = async (status) => {
    await update({ status })
    setLead((prev) => ({ ...prev, status }))
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  if (error || !lead) return <div className="text-red-600 py-10 text-center">{error || 'Lead not found'}</div>

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/leads')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-800">{lead.name}</h2>
          <p className="text-sm text-slate-500">Lead · Received {formatDatetime(lead.created_at)}</p>
        </div>
        <Badge status={lead.status} className="text-sm px-3 py-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Lead Details"
            action={<Button size="sm" variant="secondary" onClick={openEdit}>Edit</Button>}
          />
          <div className="space-y-3">
            {lead.email && (
              <div className="flex items-center gap-2.5 text-sm">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:underline">{lead.email}</a>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2.5 text-sm">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={`tel:${lead.phone}`} className="text-slate-700">{lead.phone}</a>
              </div>
            )}
            {lead.source && (
              <div className="text-sm">
                <span className="text-slate-500">Source: </span>
                <span className="text-slate-700">{lead.source}</span>
              </div>
            )}
            {lead.notes && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-600 leading-relaxed">{lead.notes}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Update Status" />
          <div className="space-y-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  lead.status === s
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                {lead.status === s && <span className="text-xs text-indigo-500">Current</span>}
              </button>
            ))}
          </div>

          {!lead.customer_id && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Button
                icon={UserCheck}
                variant="success"
                className="w-full justify-center"
                onClick={openConvert}
              >
                Convert to Customer
              </Button>
            </div>
          )}

          {lead.customer_id && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link to={`/customers/${lead.customer_id}`}>
                <Button variant="secondary" className="w-full justify-center" size="sm">View Customer Profile →</Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Lead">
        <form onSubmit={handleEdit} className="space-y-4">
          {saveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
          <FormInput label="Full Name" required value={form.name || ''} onChange={set('name')} />
          <FormInput label="Email" type="email" value={form.email || ''} onChange={set('email')} />
          <FormInput label="Phone" value={form.phone || ''} onChange={set('phone')} />
          <FormSelect label="Source" value={form.source || ''} onChange={set('source')}>
            <option value="">— Select source —</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
          <FormSelect label="Status" value={form.status || 'new'} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </FormSelect>
          <FormTextarea label="Notes" value={form.notes || ''} onChange={set('notes')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Convert to Customer Modal */}
      <Modal open={convertModal} onClose={() => setConvertModal(false)} title="Convert Lead to Customer">
        <p className="text-sm text-slate-500 mb-4">This will create a new customer profile. You can fill in more details later.</p>
        <form onSubmit={handleConvert} className="space-y-4">
          {saveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="First Name" required value={convertForm.first_name} onChange={setC('first_name')} />
            <FormInput label="Last Name" value={convertForm.last_name} onChange={setC('last_name')} />
          </div>
          <FormInput label="Email" type="email" value={convertForm.email} onChange={setC('email')} />
          <FormInput label="Phone" value={convertForm.phone} onChange={setC('phone')} />
          <FormInput label="Address" value={convertForm.address_line1} onChange={setC('address_line1')} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="City" value={convertForm.city} onChange={setC('city')} />
            <FormInput label="Postcode" value={convertForm.postcode} onChange={setC('postcode')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setConvertModal(false)} type="button">Cancel</Button>
            <Button type="submit" variant="success" disabled={saving}>{saving ? 'Converting...' : 'Create Customer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
