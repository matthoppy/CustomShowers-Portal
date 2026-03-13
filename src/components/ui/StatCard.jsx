import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ title, value, trend, trendLabel, icon: Icon, iconBg = 'bg-indigo-100', iconColor = 'text-indigo-600' }) {
  const trendPositive = trend > 0
  const trendNeutral = trend === 0 || trend === undefined

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 truncate">{value}</p>
          {trendLabel && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
              trendNeutral ? 'text-slate-500' : trendPositive ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {trendNeutral
                ? <Minus className="w-3 h-3" />
                : trendPositive
                  ? <TrendingUp className="w-3 h-3" />
                  : <TrendingDown className="w-3 h-3" />
              }
              <span>{trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-lg ${iconBg} flex items-center justify-center shrink-0 ml-3`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        )}
      </div>
    </div>
  )
}
