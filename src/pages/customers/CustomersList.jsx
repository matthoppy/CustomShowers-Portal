import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useCustomers } from '../../hooks/useCustomers'
import DataTable from '../../components/ui/DataTable'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormTextarea } from '../../components/ui/FormInput'
import { formatDatetime } from '../../lib/utils'

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '', phone: '',
  address_line1: '', address_line2: '', city: '', postcode: '',
  notes: '', shower_preferences: '',
}

export default function CustomersList() {
  const { customers, loading, create } = useCustomers()
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
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
      navigate(`/customers/${data.id}`)
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      accessor: (r) => `${r.first_name} ${r.last_name}`,
    },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    {
      key: 'created_at',
      label: 'Added',
      accessor: (r) => formatDatetime(r.created_at),
    },
  ]

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Customers</h2>
          <p className="text-sm text-slate-500">{customers.length} total</p>
        </div>
        <Button icon={UserPlus} onClick={() => setModal(true)}>Add Customer</Button>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        onRowClick={(r) => navigate(`/customers/${r.id}`)}
        searchPlaceholder="Search customers..."
        emptyMessage={loading ? 'Loading...' : 'No customers yet. Add your first customer!'}
      />

      <Modal open={modal} onClose={() => setModal(false)} title="Add Customer">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="First Name" required value={form.first_name} onChange={set('first_name')} placeholder="John" />
            <FormInput label="Last Name" required value={form.last_name} onChange={set('last_name')} placeholder="Smith" />
          </div>
          <FormInput label="Email" type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" />
          <FormInput label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="07700 900000" />
          <FormInput label="Address Line 1" value={form.address_line1} onChange={set('address_line1')} placeholder="123 High Street" />
          <FormInput label="Address Line 2" value={form.address_line2} onChange={set('address_line2')} placeholder="Flat 1" />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="City" value={form.city} onChange={set('city')} placeholder="London" />
            <FormInput label="Postcode" value={form.postcode} onChange={set('postcode')} placeholder="SW1A 1AA" />
          </div>
          <FormTextarea label="Shower Preferences" value={form.shower_preferences} onChange={set('shower_preferences')} placeholder="e.g. Walk-in, wetroom, frameless glass..." />
          <FormTextarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Any additional notes..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Customer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
