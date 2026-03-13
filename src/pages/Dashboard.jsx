import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  PoundSterling,
  AlertCircle,
  UserPlus,
  FileText,
  Wrench,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/ui/StatCard'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatCurrency, formatDatetime } from '../lib/utils'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstanding: 0,
    activeLeads: 0,
    quotesSent: 0,
    jobsThisMonth: 0,
    conversionRate: 0,
  })
  const [revenueChart, setRevenueChart] = useState([])
  const [recentLeads, setRecentLeads] = useState([])
  const [recentJobs, setRecentJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { data: paidInvoices },
        { data: unpaidInvoices },
        { data: allLeads },
        { data: sentQuotes },
        { data: monthJobs },
        { data: monthlyRevenue },
        { data: leads },
        { data: jobs },
      ] = await Promise.all([
        supabase.from('invoices').select('total').eq('status', 'paid'),
        supabase.from('invoices').select('total, amount_paid').in('status', ['unpaid', 'partial']),
        supabase.from('leads').select('status'),
        supabase.from('quotes').select('id').eq('status', 'sent'),
        supabase.from('jobs').select('id').gte('scheduled_date', startOfMonth),
        supabase.from('invoices').select('total, created_at').eq('status', 'paid'),
        supabase.from('leads').select('id, name, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('jobs').select('id, job_number, title, status, scheduled_date, customers(first_name, last_name)').order('scheduled_date', { ascending: true }).limit(5),
      ])

      const totalRevenue = (paidInvoices || []).reduce((s, i) => s + Number(i.total || 0), 0)
      const outstanding = (unpaidInvoices || []).reduce((s, i) => s + (Number(i.total || 0) - Number(i.amount_paid || 0)), 0)
      const activeLeads = (allLeads || []).filter((l) => l.status !== 'lost').length
      const totalLeads = (allLeads || []).length
      const qualifiedLeads = (allLeads || []).filter((l) => l.status === 'qualified').length
      const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0

      setStats({
        totalRevenue,
        outstanding,
        activeLeads,
        quotesSent: (sentQuotes || []).length,
        jobsThisMonth: (monthJobs || []).length,
        conversionRate,
      })

      // Build last 6 months revenue chart
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        const monthTotal = (monthlyRevenue || [])
          .filter((inv) => {
            const invDate = new Date(inv.created_at)
            return invDate.getFullYear() === d.getFullYear() && invDate.getMonth() === d.getMonth()
          })
          .reduce((s, inv) => s + Number(inv.total || 0), 0)
        months.push({ month: label, revenue: monthTotal })
      }
      setRevenueChart(months)
      setRecentLeads(leads || [])
      setRecentJobs(jobs || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={PoundSterling}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Outstanding Invoices"
          value={formatCurrency(stats.outstanding)}
          icon={AlertCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          title="Active Leads"
          value={stats.activeLeads}
          icon={UserPlus}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Quotes Sent"
          value={stats.quotesSent}
          icon={FileText}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Jobs This Month"
          value={stats.jobsThisMonth}
          icon={Wrench}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={TrendingUp}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader title="Revenue (Last 6 Months)" subtitle="Paid invoices only" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueChart} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `£${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Revenue']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
              />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Leads */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Leads</h3>
            <Link to="/leads" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400 text-center">No leads yet</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLeads.map((lead) => (
                <li key={lead.id}>
                  <Link to={`/leads/${lead.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{lead.name}</p>
                      <p className="text-xs text-slate-400">{formatDatetime(lead.created_at)}</p>
                    </div>
                    <Badge status={lead.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Upcoming Jobs */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Upcoming Jobs</h3>
            <Link to="/jobs" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all →</Link>
          </div>
          {recentJobs.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400 text-center">No jobs scheduled</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentJobs.map((job) => (
                <li key={job.id}>
                  <Link to={`/jobs/${job.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{job.title}</p>
                      <p className="text-xs text-slate-400">
                        {job.customers ? `${job.customers.first_name} ${job.customers.last_name}` : '—'}
                        {job.scheduled_date && ` · ${formatDatetime(job.scheduled_date)}`}
                      </p>
                    </div>
                    <Badge status={job.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
