const variants = {
  // Deal stages
  new_enquiry:           'bg-blue-100 text-blue-700',
  design_received:       'bg-purple-100 text-purple-700',
  quote_sent:            'bg-cyan-100 text-cyan-700',
  quote_accepted:        'bg-teal-100 text-teal-700',
  ordered_from_supplier: 'bg-indigo-100 text-indigo-700',
  in_production:         'bg-amber-100 text-amber-700',
  ready_for_delivery:    'bg-lime-100 text-lime-700',
  completed:             'bg-emerald-100 text-emerald-700',
  lost_on_hold:          'bg-red-100 text-red-700',
  // Lead statuses
  new:       'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  qualified: 'bg-emerald-100 text-emerald-700',
  lost:      'bg-red-100 text-red-700',
  // Quote statuses
  draft:    'bg-slate-100 text-slate-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  // Job / Survey statuses
  scheduled:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  cancelled:   'bg-red-100 text-red-700',
  rescheduled: 'bg-orange-100 text-orange-700',
  // Invoice statuses
  unpaid:  'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
  paid:    'bg-emerald-100 text-emerald-700',
  // Job types
  supply_only:         'bg-slate-100 text-slate-700',
  supply_and_install:  'bg-violet-100 text-violet-700',
}

const labels = {
  new_enquiry:           'New Enquiry',
  design_received:       'Design Received',
  quote_sent:            'Quote Sent',
  quote_accepted:        'Quote Accepted',
  ordered_from_supplier: 'Ordered from Supplier',
  in_production:         'In Production',
  ready_for_delivery:    'Ready for Delivery/Install',
  completed:             'Completed',
  lost_on_hold:          'Lost / On Hold',
  new:        'New',
  contacted:  'Contacted',
  qualified:  'Qualified',
  lost:       'Lost',
  draft:      'Draft',
  sent:       'Sent',
  accepted:   'Accepted',
  rejected:   'Rejected',
  scheduled:   'Scheduled',
  in_progress: 'In Progress',
  cancelled:   'Cancelled',
  rescheduled: 'Rescheduled',
  unpaid:  'Unpaid',
  partial: 'Partial',
  paid:    'Paid',
  supply_only:        'Supply Only',
  supply_and_install: 'Supply + Install',
}

export default function Badge({ status, className = '' }) {
  const colorClass = variants[status] || 'bg-slate-100 text-slate-600'
  const label = labels[status] || status
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {label}
    </span>
  )
}
