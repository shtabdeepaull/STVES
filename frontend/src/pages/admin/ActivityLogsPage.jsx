// ============================================================
// Activity Logs Page - Immutable audit trail of all system actions
// ============================================================
import { useState } from 'react';
import { History, Filter, Search } from 'lucide-react';
import useStore from '../../store/useStore';
export default function ActivityLogsPage() {
    const activityLogs = useStore(s => s.activityLogs);
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchQ, setSearchQ] = useState('');
    let filtered = typeFilter === 'all' ? activityLogs : activityLogs.filter(l => l.type === typeFilter);
    if (searchQ) {
        const q = searchQ.toLowerCase();
        filtered = filtered.filter(l => l.action.toLowerCase().includes(q) ||
            l.details.toLowerCase().includes(q) ||
            l.userName.toLowerCase().includes(q));
    }
    const typeColors = {
        verification: 'bg-blue-100 text-blue-700',
        case: 'bg-orange-100 text-orange-700',
        admin: 'bg-red-100 text-red-700',
        auth: 'bg-green-100 text-green-700',
        system: 'bg-gray-100 text-gray-700',
    };
    const typeIcons = {
        verification: '🔍',
        case: '📋',
        admin: '🛡️',
        auth: '🔑',
        system: '⚙️',
    };
    return (<div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <History size={24} className="text-[#1a73e8]"/>
          Activity Logs
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete audit trail of all system activities. {activityLogs.length} total records.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search logs..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"/>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gray-400"/>
          {['all', 'verification', 'case', 'admin', 'auth', 'system'].map(t => (<button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${typeFilter === t ? 'bg-[#0f4c81] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t === 'all' ? 'All' : `${typeIcons[t] || ''} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
            </button>))}
        </div>
      </div>

      {/* Logs timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        {filtered.length === 0 ? (<div className="py-12 text-center text-gray-400">
            <History size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No logs found</p>
          </div>) : (<div className="space-y-1">
            {filtered.map((log, i) => (<div key={log.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                {/* Timeline dot */}
                <div className="flex flex-col items-center mt-1">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${log.type === 'verification' ? 'bg-blue-400' :
                    log.type === 'case' ? 'bg-orange-400' :
                        log.type === 'admin' ? 'bg-red-400' :
                            log.type === 'auth' ? 'bg-green-400' : 'bg-gray-400'}`}/>
                  {i < filtered.length - 1 && (<div className="w-px h-8 bg-gray-200 mt-1"/>)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800">{log.action}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeColors[log.type]}`}>
                      {log.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{log.details}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {log.userName} • {new Date(log.timestamp).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                })}
                  </p>
                </div>
              </div>))}
          </div>)}
      </div>
    </div>);
}
