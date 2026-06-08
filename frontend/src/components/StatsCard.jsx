// ============================================================
// Stats Card Components
// Display metrics and statistics in dashboards
// ============================================================
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
export function StatsCard({ title, value, icon, trend, color = 'blue', onClick, className = '', }) {
    const colorMap = {
        blue: {
            bg: 'bg-blue-50',
            text: 'text-blue-600',
            icon: 'text-blue-500',
        },
        green: {
            bg: 'bg-green-50',
            text: 'text-green-600',
            icon: 'text-green-500',
        },
        orange: {
            bg: 'bg-orange-50',
            text: 'text-orange-600',
            icon: 'text-orange-500',
        },
        red: {
            bg: 'bg-red-50',
            text: 'text-red-600',
            icon: 'text-red-500',
        },
        purple: {
            bg: 'bg-purple-50',
            text: 'text-purple-600',
            icon: 'text-purple-500',
        },
        gray: {
            bg: 'bg-gray-50',
            text: 'text-gray-600',
            icon: 'text-gray-500',
        },
    };
    const colors = colorMap[color];
    return (<div className={`
        bg-white rounded-xl p-5 border border-gray-100
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-200' : ''}
        transition-all ${className}
      `} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          
          {trend && (<div className="flex items-center gap-1 mt-2">
              {trend.value > 0 ? (<TrendingUp size={14} className="text-green-500"/>) : trend.value < 0 ? (<TrendingDown size={14} className="text-red-500"/>) : (<Minus size={14} className="text-gray-400"/>)}
              <span className={`text-xs font-medium ${trend.value > 0 ? 'text-green-600' : trend.value < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              {trend.label && (<span className="text-xs text-gray-400">{trend.label}</span>)}
            </div>)}
        </div>
        
        {icon && (<div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.icon} flex items-center justify-center`}>
            {icon}
          </div>)}
      </div>
    </div>);
}
export function MiniStat({ label, value, color = 'blue' }) {
    const colorMap = {
        blue: 'text-blue-600',
        green: 'text-green-600',
        orange: 'text-orange-600',
        red: 'text-red-600',
    };
    return (<div className="text-center">
      <p className={`text-xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>);
}
export function ProgressStat({ title, value, max, color = 'blue', showPercentage = true, }) {
    const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
    const colorMap = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500',
    };
    return (<div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-sm font-semibold text-gray-800">
          {value}/{max}
          {showPercentage && <span className="text-gray-400 ml-1">({percentage}%)</span>}
        </p>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${colorMap[color]} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}/>
      </div>
    </div>);
}
export function CompareStat({ title, current, previous, format }) {
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    const formatValue = format || ((v) => v.toString());
    return (<div className="bg-white rounded-xl p-4 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-gray-800">{formatValue(current)}</p>
        <div className="text-right">
          <div className={`flex items-center gap-1 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
            {change > 0 ? <TrendingUp size={14}/> : change < 0 ? <TrendingDown size={14}/> : <Minus size={14}/>}
            <span className="text-sm font-medium">{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
          <p className="text-[10px] text-gray-400">vs {formatValue(previous)}</p>
        </div>
      </div>
    </div>);
}
