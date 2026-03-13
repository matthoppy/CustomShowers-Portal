import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  Users,
  FileText,
  Wrench,
  Receipt,
  Droplets,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/leads', icon: UserPlus, label: 'Leads' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/quotes', icon: FileText, label: 'Quotes' },
  { to: '/jobs', icon: Wrench, label: 'Jobs' },
  { to: '/invoices', icon: Receipt, label: 'Invoices' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-slate-800 flex flex-col shrink-0 h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <Droplets className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">Custom Showers</p>
          <p className="text-slate-400 text-xs">CRM Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-slate-700 text-white border-l-2 border-indigo-500 pl-[10px]'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-slate-700">
        <p className="text-slate-500 text-xs px-3">© 2025 Custom Showers</p>
      </div>
    </aside>
  )
}
